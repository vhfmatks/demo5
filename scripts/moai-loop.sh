#!/usr/bin/env bash
# Worker loop for macOS/Linux: the bash twin of scripts/moai-loop.ps1 (same prechecks, same claude run, same STOP file).
# Output is one timestamped line per message/tool call (the .ps1 -Plain view); the live redrawn board stays in the .ps1.
# Needs git, gh, claude and node (node reads claude's stream-json). bash 3.2 (macOS default) is enough.
set -u

usage() {
  cat <<'EOF'
moai-loop.sh — 워커 PC 반복 실행기 (macOS·Linux용, Windows의 moai-loop.ps1과 같은 동작)

사용법
  bash scripts/moai-loop.sh <pc> [옵션]

  예) bash scripts/moai-loop.sh pc2
      bash scripts/moai-loop.sh pc3 --model opus --effort medium

하는 일
  1. GitHub에서 이 PC(agent:<pc> 라벨)의 ready·in-progress 이슈와 spec 발행 상태를 확인합니다.
  2. 할 일이 있으면 claude -p "/moai-work <pc>" 를 새 세션으로 한 번 실행합니다.
     (구현 → 머지 → 리뷰 → 최종 게이트 → PR 은 /moai-work 가 알아서 진행합니다)
  3. 실행이 끝나면 1번으로 돌아갑니다.
     할 일이 없거나, spec 이 아직 발행 중이거나, 지난번과 큐가 그대로면
     claude 를 부르지 않고 --idle 초만큼 기다립니다 (비용 0).

옵션
  <pc>              워커 PC ID (예: pc2). docs/agents/issue-tracker.md 담당 표의 값과 같아야 합니다.
  --idle <초>       큐가 비었을 때 다시 확인하기까지 기다리는 시간 (기본 60)
  --budget <USD>    claude 실행 1회당 비용 상한 (기본 30)
  --model <이름>    워커 모델 (기본: .claude/agents/moai-worker.md 의 model)
  --effort <수준>   추론 노력 low|medium|high|xhigh|max (기본: 같은 파일의 effort)
  -h, --help        이 도움말

멈추기
  지금 실행이 끝난 뒤 멈춤:  touch "$(git rev-parse --git-dir)/moai-loop/STOP-<pc>"
  바로 멈춤:                 Ctrl+C  (남은 구현용 worktree 는 정리하고 끝납니다)

기록
  .git/moai-loop/<pc>-<월일-시분초>.log   claude 의 원본 stream-json
  화면에는 메시지·도구 호출이 한 줄씩 시간과 함께 나옵니다.

필요한 것
  git, gh (gh auth login), claude (로그인), node
  레포 루트가 아니어도 되지만 이 레포의 clone 안에서 실행해야 합니다.
EOF
}

pc=''; idle=60; budget=30; model=''; effort=''
while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help | help) usage; exit 0 ;;
    --idle) idle=${2:?--idle 값이 필요합니다}; shift 2 ;;
    --budget) budget=${2:?--budget 값이 필요합니다}; shift 2 ;;
    --model) model=${2:?--model 값이 필요합니다}; shift 2 ;;
    --effort) effort=${2:?--effort 값이 필요합니다}; shift 2 ;;
    --plain) shift ;;   # always plain here; accepted so .ps1 habits work
    -*) echo "알 수 없는 옵션: $1  (bash scripts/moai-loop.sh --help)" >&2; exit 2 ;;
    *) pc=$1; shift ;;
  esac
done
if ! printf '%s' "$pc" | grep -Eq '^pc[0-9]+$'; then
  echo "워커 PC ID 가 필요합니다 (예: pc2)." >&2; echo >&2; usage >&2; exit 2
fi
for c in git gh claude node; do
  command -v "$c" >/dev/null 2>&1 || { echo "$c 이(가) 없습니다. --help 의 '필요한 것'을 확인하세요." >&2; exit 2; }
done

root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2
here="$root/scripts"
dir="$(git rev-parse --absolute-git-dir)/moai-loop"
mkdir -p "$dir"
stop="$dir/STOP-$pc"
rm -f "$stop"
tty=0; [ -t 1 ] && tty=1

color() { [ $tty = 1 ] || return 0; case $1 in gray) printf '\033[90m' ;; cyan) printf '\033[96m' ;; red) printf '\033[91m' ;; yellow) printf '\033[33m' ;; green) printf '\033[92m' ;; white) printf '\033[97m' ;; esac; }
say() { local c=$1; shift; color "$c"; printf '%s %s' "$(date +%H:%M:%S)" "$*"; [ $tty = 1 ] && printf '\033[0m'; printf '\n'; }
title() { [ $tty = 1 ] && printf '\033]0;moai %s · %s\007' "$pc" "$1"; }
later() { date -v+"$1"S +%H:%M:%S 2>/dev/null || date -d "+$1 sec" +%H:%M:%S; }   # BSD (macOS) date, then GNU
wait_s() { local end=$(($(date +%s) + $1)); while [ "$(date +%s)" -lt $end ] && [ ! -e "$stop" ]; do sleep 1; done; }
idle_for() { local at; at=$(later "$idle"); say gray "$1 — next check at $at"; title "idle until $at"; wait_s "$idle"; }

# Precheck with gh (tracker ops: docs/agents/issue-tracker.md) so an empty or still-blocked queue costs no claude run.
# ponytail: bounded GitHub lists, no state DB; paginate if the queue outgrows these limits.
candidates() {
  gh issue list --state open --label "agent:$pc" --limit 100 --json number,labels,updatedAt \
    --jq '[.[] | select(.labels | map(.name) | (index("status:ready") or index("status:in-progress") or index("kind:spec")))] | sort_by(.number)'
}
# A spec still being published (parent `Tickets: N` > children found) must not start claude: /moai-work repeats this check.
# ponytail: counts `Parent: #<p>` header lines over the newest 200 issue bodies; the first incomplete spec blocks the PC's other work.
publishing() {
  local specs all p want have
  specs=$(gh issue list --state open --label kind:spec --label "agent:$pc" --limit 100 --json number,body \
    --jq 'sort_by(.number)[] | select(.body | test("(?m)^Tickets:\\s*\\d+")) | "\(.number) \([.body | scan("(?m)^Tickets:\\s*(\\d+)")][0][0])"') || return 1
  all=$(gh issue list --state all --limit 200 --json body --jq '.[].body') || return 1
  while read -r p want; do
    [ -n "$p" ] || continue
    have=$(printf '%s\n' "$all" | grep -cE "^Parent: #${p}([^0-9]|$)")
    if [ "$have" -lt "$want" ]; then echo "spec #$p publishing $have/$want"; return 0; fi
  done <<EOF
$specs
EOF
}
fingerprint() {
  local closed main prs
  closed=$(gh issue list --state closed --limit 500 --json number,stateReason --jq 'sort_by(.number)') || return 1
  main=$(git ls-remote origin refs/heads/main) && [ -n "$main" ] || return 1
  prs=$(gh pr list --state all --limit 100 --json number,state,headRefName,headRefOid,baseRefName,baseRefOid,mergedAt \
    --jq '[.[] | select(.headRefName | test("^(spec-|issue-)"))] | sort_by(.number)') || return 1
  printf '%s\n--\n%s\n--\n%s\n--\n%s' "$1" "$closed" "$main" "$prs"
}
# Worktrees of a dead run or a closed issue. No run of this loop is alive when it's called.
sweep() {
  [ -f "$here/moai-worktree-clean.sh" ] || return 0
  bash "$here/moai-worktree-clean.sh" 2>&1 | while IFS= read -r l; do say gray "worktree: $l"; done
}

# Turns claude's stream-json into one line per message / tool call; writes the final `result` event to argv[1].
filter=$(cat <<'JS'
const fs = require('fs'), rl = require('readline').createInterface({ input: process.stdin });
const [resultFile, tty] = process.argv.slice(1);
const C = { gray: 90, cyan: 96, red: 91, yellow: 33, white: 97 };
const short = (s, n = 140) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const pad = n => String(n).padStart(2, '0'), now = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
const say = (msg, c = 'gray') => console.log(tty === '1' ? '\x1b[' + C[c] + 'm' + now() + ' ' + msg + '\x1b[0m' : now() + ' ' + msg);
function describe(t) {
  const i = t.input || {}, a = ['Bash', 'PowerShell'].includes(t.name) ? i.command : ['Read', 'Edit', 'Write'].includes(t.name) ? i.file_path
    : ['Grep', 'Glob'].includes(t.name) ? i.pattern : t.name === 'Agent' ? i.subagent_type + ': ' + i.description
    : t.name === 'Skill' ? (i.skill || '') + ' ' + (i.args || '') : JSON.stringify(i);
  return t.name + ' ' + short(a, 100);
}
rl.on('line', line => {
  let e;
  try { e = JSON.parse(line); } catch { if (line.trim()) say(line, 'yellow'); return; }
  const sub = e.parent_tool_use_id ? '    ' : '';
  if (e.type === 'system' && e.subtype === 'init') say('session ' + e.session_id + ' · ' + e.model);
  else if (e.type === 'assistant') {
    for (const c of e.message?.content || []) {
      if (c.type === 'text' && String(c.text).trim()) say(sub + short(c.text, sub ? 140 : 400), 'white');
      else if (c.type === 'tool_use') {
        const d = describe(c);
        say(sub + '→ ' + d);
        if (tty === '1' && !sub) process.stdout.write('\x1b]0;moai · ' + short(d, 60) + '\x07');
      }
    }
  } else if (e.type === 'user') {
    for (const c of [].concat(e.message?.content || [])) {
      if (c.type === 'tool_result' && c.is_error) say(sub + '✗ ' + short([].concat(c.content).map(x => typeof x === 'string' ? x : x?.text).join(' '), 120), 'red');
    }
  } else if (e.type === 'result') {
    fs.writeFileSync(resultFile, JSON.stringify(e));
    say('── result ' + e.subtype + ' · $' + Number(e.total_cost_usd || 0).toFixed(2) + ' · ' + e.num_turns + ' turns', 'cyan');
    if (e.result) say(short(e.result, 400), 'white');
  }
});
JS
)

agent_md="$root/.claude/agents/moai-worker.md"
show_model=${model:-$(sed -n 's/^model:[[:space:]]*//p' "$agent_md" 2>/dev/null | head -1)}
show_effort=${effort:-$(sed -n 's/^effort:[[:space:]]*//p' "$agent_md" 2>/dev/null | head -1)}
trap 'title stopped; sweep' EXIT   # a claude killed by Ctrl+C leaves its lock pid dead, so its worktrees go now
trap 'exit 130' INT TERM

say gray "[$pc] logs: $dir"
say gray "[$pc] stop after current run: touch '$stop'"
n=0
empty_at=''   # tracker fingerprint of the last `queue empty` run
while [ ! -e "$stop" ]; do
  fp=''; cand=''; pub=''
  if cand=$(candidates) && pub=$(publishing) && fp=$(fingerprint "$cand"); then :; else say yellow "precheck failed"; fp=''; fi
  if [ -z "$fp" ]; then idle_for 'precheck unavailable — preserve wait state'; continue
  elif [ "$cand" = '[]' ]; then idle_for "no ready/in-progress issue for $pc"; continue
  elif [ -n "$pub" ]; then idle_for "$pub — waiting for /moai-spec to finish"; continue
  elif [ "$fp" = "$empty_at" ]; then idle_for 'queue unchanged since last empty run (blocked)'; continue
  fi
  sweep
  n=$((n + 1))
  log="$dir/$pc-$(date +%m%d-%H%M%S).log"
  opt=(--agent moai-worker)
  [ -n "$model" ] && opt+=(--model "$model")
  [ -n "$effort" ] && opt+=(--effort "$effort")
  t0=$(date +%s)
  say cyan "── run #$n start ($(basename "$log"))"
  say gray "   claude -p \"/moai-work $pc\" --agent moai-worker · model ${show_model:-default} · effort ${show_effort:-default} · budget \$$budget"
  title "#$n starting"
  rm -f "$log.result"
  claude -p "/moai-work $pc" "${opt[@]}" \
    --permission-mode bypassPermissions --permission-prompts none \
    --max-budget-usd "$budget" --output-format stream-json --verbose 2>&1 | tee "$log" | node -e "$filter" "$log.result" "$tty"
  code=${PIPESTATUS[0]}
  took="$(( ($(date +%s) - t0) / 60 ))min"
  say cyan "── run #$n end · exit $code · $took"
  if [ "$code" -ne 0 ]; then
    say red "run #$n exit $code after $took — retry at $(later 60)"
    title 'error, retrying in 60s'; wait_s 60; continue
  fi
  if grep -q 'queue empty' "$log.result" 2>/dev/null; then
    # Changes that arrived during the run (queue, blockers, main, PRs) are not absorbed: the next fingerprint differs and wakes us.
    empty_at=$fp
    idle_for 'queue empty / integrated or PR waiting'
  fi
done
say cyan "stopped ($pc)"
