#!/usr/bin/env bash
# bash twin of scripts/moai-worktree-clean.ps1 for macOS/Linux: clean up implementer worktrees (.claude/worktrees/agent-*)
# so finished or dead runs don't leak disk, branches or dev servers.
# Uncommitted work on issue-<n> is committed as `wip: resume (#<n>)` first; the local branch stays for a resume or a human.
# Kept (with a warning on stderr): a failed wip commit, changes on any other branch, or a folder that won't delete.
set -u

case "${1:-}" in -h | --help | help)
  cat <<'EOF'
moai-worktree-clean.sh — 구현용 worktree 정리 (macOS·Linux용, moai-worktree-clean.ps1과 같은 동작)

사용법
  bash scripts/moai-worktree-clean.sh               정리 대상만 자동으로 찾아 정리
  bash scripts/moai-worktree-clean.sh <경로> ...    지정한 worktree 를 정리 (실행 중 잠금이 있어도)

자동 정리 대상 (.claude/worktrees/agent-*)
  - 잠근 claude 프로세스가 이미 끝난 worktree
  - 잠금이 없고 브랜치 issue-<n> 의 이슈가 닫힌 worktree

정리 방식
  - issue-<n> 브랜치에 커밋 안 된 변경이 있으면 'wip: resume (#<n>)' 로 먼저 커밋합니다 (브랜치는 남김).
  - 다른 브랜치의 변경, 커밋 실패, 지워지지 않는 폴더는 경고만 하고 남깁니다.
  - 그 worktree 의 node_modules 에서 뜬 서버(next·playwright)는 먼저 종료합니다.
  - 마지막에 git worktree prune, 쓰이지 않는 빈 worktree-agent-* 브랜치를 지웁니다.

보통은 직접 실행할 필요 없이 moai-loop.sh 와 /moai-work 가 부릅니다.
EOF
  exit 0 ;;
esac

root=$(git rev-parse --show-toplevel) || exit 2
real() { (cd "$1" 2>/dev/null && pwd -P) || printf '%s' "$1"; }
base="$(real "$root")/.claude/worktrees"

# path <TAB> branch <TAB> lock pid, one line per worktree; "-" = none (read merges empty tab-separated fields)
rows() {
  git -C "$root" worktree list --porcelain | awk '
    function out() { if (p != "") print p "\t" (b == "" ? "-" : b) "\t" (o == "" ? "-" : o) }
    /^worktree / { out(); p = substr($0, 10); b = ""; o = "" }
    /^branch refs\/heads\// { b = substr($0, 19) }
    /^locked .*\(pid [0-9]+\)/ { match($0, /\(pid [0-9]+\)/); o = substr($0, RSTART + 5, RLENGTH - 6) }
    END { out() }'
}

targets() {
  local want=() a p b o
  for a in "$@"; do want+=("$(real "$a")"); done
  rows | while IFS="$(printf '\t')" read -r p b o; do
    p=$(real "$p"); [ "$o" = - ] && o=''
    if [ ${#want[@]} -gt 0 ]; then
      for a in "${want[@]}"; do [ "$a" = "$p" ] && printf '%s\t%s\n' "$p" "$b"; done
      continue
    fi
    case "$p" in "$base"/agent-*) ;; *) continue ;; esac
    # Dead = locked by a claude pid that's gone. Unlocked = the agent finished, but its orchestrator may still need the
    # worktree (review, rebase), so only a closed issue's worktree goes.
    if [ -n "$o" ]; then
      kill -0 "$o" 2>/dev/null || printf '%s\t%s\n' "$p" "$b"
    elif printf '%s' "$b" | grep -Eq '^issue-[0-9]+$'; then
      [ "$(gh issue view "${b#issue-}" --json state -q .state 2>/dev/null)" = CLOSED ] && printf '%s\t%s\n' "$p" "$b"
    fi
  done
}

targets "$@" | while IFS="$(printf '\t')" read -r p b; do
  [ "$b" = - ] && b=''
  # Orphaned next/playwright servers from a dead run keep files open.
  # ponytail: matched by command line under <worktree>/node_modules; a server started another way survives (rm warns below).
  pkill -f "$p/node_modules" 2>/dev/null
  if [ -n "$(git -C "$p" status --porcelain 2>/dev/null)" ]; then
    if ! printf '%s' "$b" | grep -Eq '^issue-[0-9]+$'; then echo "WARNING: kept $p — uncommitted changes on '$b'" >&2; continue; fi
    git -C "$p" add -A -- . ':!docs/evidence/*.md'   # generated run reports stay uncommitted (moai-implement step 6)
    if ! git -C "$p" diff --cached --quiet; then
      git -C "$p" commit -q -m "wip: resume (#${b#issue-})" || { echo "WARNING: kept $p — wip commit failed" >&2; continue; }
    fi
  fi
  git -C "$root" worktree remove -f -f "$p" 2>/dev/null   # -f twice: also drops the agent lock
  [ -e "$p" ] && rm -rf "$p" 2>/dev/null
  if [ -e "$p" ]; then echo "WARNING: kept $p — files still in use" >&2; else echo "removed $p${b:+ [$b]}"; fi
done

git -C "$root" worktree prune
# The isolation branch each agent started on (worktree-agent-*) is abandoned once it switches to issue-<n>.
# -d (not -D) only deletes it when it holds no commits of its own.
used=$(rows | cut -f2)
git -C "$root" for-each-ref --format='%(refname:short)' 'refs/heads/worktree-agent-*' | while read -r br; do
  printf '%s\n' "$used" | grep -qxF "$br" || git -C "$root" branch -q -d "$br" 2>/dev/null
done
exit 0
