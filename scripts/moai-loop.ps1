# Worker loop: one fresh `claude -p "/moai-work <pc>"` per run, instead of `/loop` in one long session.
# Usage (PowerShell, repo root):  pwsh scripts/moai-loop.ps1 pc2 [-Model sonnet] [-Effort high] [-Plain]   (manual: --help)
# macOS/Linux twin: bash scripts/moai-loop.sh pc2
# Stop after the current run:     New-Item (Join-Path (git rev-parse --git-dir) moai-loop/STOP-pc2)
# Logs and STOP live under .git/ so they never block moai-work step 1 (`git pull --ff-only`).
# Console: this PC's work dashboard, redrawn in place — state (작업중 › 계획/구현/테스트/리뷰/머지중, 대기중, 오류, 중지됨),
#          the issue being solved (+ last [moai] comment), queue progress, running subagents, each turn's actions, log tail.
#          Window title = current step.
#          -Plain (or redirected output) = one timestamped line per message/tool call instead.
# The run log keeps the raw stream-json.
param(
  [Parameter(Position = 0)][string]$Pc,   # checked below, after --help
  [int]$IdleSec = 60,    # wait when the queue is empty
  [int]$Budget = 30,     # USD cap per run
  [string]$Model = '',   # empty = .claude/agents/moai-worker.md (WORK_MODEL); per-issue `Model:` applies to implementers
  [string]$Effort = '',  # empty = the agent file's effort
  [switch]$Plain,
  [Alias('h')][switch]$Help
)
[Console]::OutputEncoding = $OutputEncoding = [Text.UTF8Encoding]::new()  # Korean in claude's JSON
$usage = @'
moai-loop.ps1 — 워커 PC 반복 실행기 (Windows용, macOS·Linux는 bash scripts/moai-loop.sh)

사용법
  pwsh scripts/moai-loop.ps1 <pc> [옵션]

  예) pwsh scripts/moai-loop.ps1 pc2
      pwsh scripts/moai-loop.ps1 pc3 -Model opus -Effort medium

하는 일
  1. GitHub에서 이 PC(agent:<pc> 라벨)의 ready·in-progress 이슈와 spec 발행 상태를 확인합니다.
  2. 할 일이 있으면 claude -p "/moai-work <pc>" 를 새 세션으로 한 번 실행합니다.
     (구현 → 머지 → 리뷰 → 최종 게이트 → PR 은 /moai-work 가 알아서 진행합니다)
  3. 실행이 끝나면 1번으로 돌아갑니다.
     할 일이 없거나, spec 이 아직 발행 중이거나, 지난번과 큐가 그대로면
     claude 를 부르지 않고 -IdleSec 초만큼 기다립니다 (비용 0).

옵션
  <pc>               워커 PC ID (예: pc2). docs/agents/issue-tracker.md 담당 표의 값과 같아야 합니다.
  -IdleSec <초>      큐가 비었을 때 다시 확인하기까지 기다리는 시간 (기본 60)
  -Budget <USD>      claude 실행 1회당 비용 상한 (기본 30)
  -Model <이름>      워커 모델 (기본: .claude/agents/moai-worker.md 의 model)
  -Effort <수준>     추론 노력 low|medium|high|xhigh|max (기본: 같은 파일의 effort)
  -Plain             화면을 다시 그리지 않고 한 줄씩 출력 (출력을 파일로 보낼 때 자동)
  -Help, -h, --help  이 도움말

화면
  상태(작업중 › 계획/구현/테스트/리뷰/머지중, 대기중, 오류, 중지됨), 지금 푸는 이슈와 마지막 [moai] 댓글,
  큐 진행률, 실행 중인 서브에이전트, 턴별 동작, 로그 끝부분을 한 화면에 계속 다시 그립니다.

멈추기
  지금 실행이 끝난 뒤 멈춤:  New-Item (Join-Path (git rev-parse --git-dir) moai-loop/STOP-<pc>)
  바로 멈춤:                 Ctrl+C  (남은 구현용 worktree 는 정리하고 끝납니다)

기록
  .git/moai-loop/<pc>-<월일-시분초>.log   claude 의 원본 stream-json

필요한 것
  git, gh (gh auth login), claude (로그인), PowerShell 7
'@
if ($Help -or $Pc -in '--help', '-h', 'help', '/?') { $usage; exit 0 }
if ($Pc -notmatch '^pc\d+$') { Write-Host "워커 PC ID 가 필요합니다 (예: pc2).`n" -ForegroundColor Red; $usage; exit 2 }
$dir = New-Item -ItemType Directory -Force (Join-Path (git rev-parse --git-dir) moai-loop)
$stop = Join-Path $dir "STOP-$Pc"
Remove-Item $stop -ErrorAction Ignore
$plain = $Plain -or [Console]::IsOutputRedirected

function Title($s) { $Host.UI.RawUI.WindowTitle = "moai $Pc · $s" }
function Short($s, $n = 140) { $s = ("$s" -replace '\s+', ' ').Trim(); if ($s.Length -gt $n) { $s.Substring(0, $n) + '…' } else { $s } }
function ModelLabel($model) { $model = "$model".Trim(); if (-not $model -or $model -eq '<synthetic>') { return '미확인' }; $model -replace '^claude-(.+?)(?:-\d{8})?$', '$1' }
function Describe($t) {
  $i = $t.input
  $arg = switch ($t.name) {
    { $_ -in 'Bash', 'PowerShell' } { $i.command }
    { $_ -in 'Read', 'Edit', 'Write' } { $i.file_path }
    { $_ -in 'Grep', 'Glob' } { $i.pattern }
    'Agent' { "$($i.subagent_type): $($i.description)" }
    'Skill' { "$($i.skill) $($i.args)" }
    default { $i | ConvertTo-Json -Compress -Depth 3 }
  }
  "$($t.name) $(Short $arg 100)"
}

# ── Board: this PC's issues from the tracker (docs/agents/issue-tracker.md), fetched in a thread job every 30s ──
$esc = [char]27
$ansi = @{ Gray = 37; DarkGray = 90; White = 97; Cyan = 96; Red = 91; DarkYellow = 33; Yellow = 93; Green = 92 }
# Cells per char: Hangul/CJK/fullwidth = 2. East Asian "ambiguous" symbols the board uses (· … → │ ─ └ █ ░ ▸) are 1 cell in
# Windows Terminal / xterm.js terminals but 2 in legacy conhost with a Korean font. Measure it: print '─' and read the cursor.
# ponytail: emoji and the rest of the ambiguous set count 1; add ranges here if a title still breaks the columns.
$ambWide = if ($plain) { $false } else {
  try { [Console]::Write("`r─"); [Console]::CursorLeft -gt 1 } catch { -not $env:WT_SESSION } finally { [Console]::Write("`r$([char]27)[K") }
}
$amb = if ($ambWide) { '·‐-‧←-⇿─-◿' } else { '' }
$wide = [regex]::new("[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦$amb]", 'Compiled')
$logs = [Collections.Generic.List[object]]::new()
$agents = [ordered]@{}   # running subagents: Agent tool_use id → @{ name; last }
$state = '시작'; $stateColor = 'Cyan'; $runAt = $null; $lastRun = ''
$phase = ''; $focus = $null; $turns = [Collections.Generic.List[object]]::new(); $turn = $null; $curMsg = $null; $runNo = 0
$board = $null; $fetch = $null; $fetchAt = [datetime]::MinValue; $size = ''
$fetchSb = {
  param($pc, $cwd)
  Set-Location $cwd
  function J($lines) { ($lines -join "`n") | ConvertFrom-Json }
  @{
    open      = J (gh issue list --state open --label "agent:$pc" --limit 100 --json number,title,labels,body,comments)
    closed    = J (gh issue list --state closed --label "agent:$pc" --limit 100 --json number,title,labels,stateReason,closedAt)
    completed = J (gh issue list --state closed --limit 500 --json number,stateReason --jq '[.[] | select(.stateReason == "COMPLETED") | .number]')
  }
}
function L($t, $c) { [pscustomobject]@{ t = $t; c = $c } }
# Tracker summary for the header: queue counts, titles + last [moai] comment by issue number (string keys), active issues.
function Cards($b) {
  $n = [ordered]@{ ready = 0; blocked = 0; 'in progress' = 0; 'needs human' = 0; done = 0 }
  $titles = @{}; $notes = @{}; $active = @(); $specs = @()
  foreach ($i in @($b.open) | Sort-Object number) {
    $l = @($i.labels.name); $k = "$($i.number)"
    if ($l -contains 'kind:spec') { $specs += "#$k"; continue }
    $titles[$k] = $i.title
    $notes[$k] = (@($i.comments.body | Where-Object { "$_".StartsWith('[moai]') })[-1] -replace '^\[moai\]\s*' -split "`n")[0]
    if ($l -contains 'status:in-progress') { $n['in progress']++; $active += L $k Yellow }
    elseif ($l -contains 'status:needs-human') { $n['needs human']++; $active += L $k Red }
    elseif ($i.body -match '(?m)^Blocked by:(.*)' -and @([regex]::Matches($Matches[1], '#(\d+)') | Where-Object { [int]$_.Groups[1].Value -notin @($b.completed) })) { $n.blocked++ }
    else { $n.ready++ }
  }
  $n.done = @($b.closed | Where-Object { $_.stateReason -eq 'COMPLETED' -and @($_.labels.name) -notcontains 'kind:spec' }).Count
  @{ n = $n; titles = $titles; notes = $notes; active = $active; specs = $specs; at = Get-Date }
}
# Sub-phase of a working run from a tool call; $null = keep the current one (e.g. a Read inside an implementer).
function Phase($t, $sub) {
  $i = $t.input
  switch -regex ("$($t.name) $($i.subagent_type) $($i.command)") {
    '^Agent moai-explorer' { return '파악중' }
    '^Agent moai-implementer' { return '구현중' }
    '^Agent moai-reviewer' { return '리뷰중' }
    '^Agent moai-merger' { return '머지중' }
    'vitest|playwright|test:e2e|npm (run )?(test|verify|typecheck)|\btsc\b' { return '테스트중' }
    'gh pr (create|merge)|git merge' { return '머지중' }
    'git (pull|switch)|gh issue list' { return '동기화중' }
    '^(Edit|Write) ' { return '구현중' }
    '^(Read|Grep|Glob) |gh issue (view|edit)' { if (-not $sub -and -not $agents.Count) { return '계획중' } }
  }
}
function Cells($s) { $s.Length + $wide.Matches($s).Count }
function C($s, $c) { "$esc[$($ansi[$c])m$s$esc[0m" }
# Pad/cut to exactly $w terminal cells (Hangul = 2 cells).
function Fit([string]$s, [int]$w) {
  if ($w -lt 2) { return ' ' * [math]::Max($w, 0) }
  $s = $s -replace '[\r\n\t]', ' '
  $n = $s.Length + $wide.Matches($s).Count
  if ($n -le $w) { return $s + ' ' * ($w - $n) }
  $lo = 0; $hi = [math]::Min($s.Length, $w - 1)
  while ($lo -lt $hi) {
    $m = [int][math]::Ceiling(($lo + $hi) / 2); $p = $s.Substring(0, $m)
    if ($p.Length + $wide.Matches($p).Count -le $w - 1) { $lo = $m } else { $hi = $m - 1 }
  }
  $p = $s.Substring(0, $lo)
  if ($p -and [char]::IsHighSurrogate($p[-1])) { $p = $p.Substring(0, $p.Length - 1) }
  $p + '…' + ' ' * ($w - 1 - $p.Length - $wide.Matches($p).Count)
}
function Draw {
  if ($plain) { return }
  if (-not $script:fetch -and ((Get-Date) - $script:fetchAt).TotalSeconds -ge 30) {
    $script:fetchAt = Get-Date; $script:fetch = Start-ThreadJob $fetchSb -ArgumentList $Pc, $PWD.Path
  }
  if ($script:fetch.State -in 'Completed', 'Failed') {
    $j = $script:fetch; $script:fetch = $null
    try { $script:board = Cards (Receive-Job $j -ErrorAction Stop) } catch { Say "board refresh failed: $_" DarkYellow } finally { Remove-Job $j }
  }
  $W = [Console]::WindowWidth - 1; $H = [Console]::WindowHeight
  if ("$W x $H" -ne $script:size) { $script:size = "$W x $H"; [Console]::Write("$esc[2J") }
  $out = [Collections.Generic.List[string]]::new()
  function Row($t, $c = 'Gray') { $out.Add((C (Fit $t $W) $c)) }
  function Hr($label) { $s = "── $label "; Row ($s + '─' * [math]::Floor(($W - (Cells $s)) / (Cells '─'))) DarkGray }
  $b = $script:board
  Row "moai $Pc · $showModel/$showEffort · cap `$$Budget · $(Get-Date -Format HH:mm:ss)$(if ($script:lastRun) { " · last run $($script:lastRun)" })" DarkGray
  # 1) what this PC is doing: state › sub-phase · elapsed · turn
  $now = "● $($script:state)"
  if ($script:runAt) {
    if ($script:phase) { $now += " › $($script:phase)" }
    $now += ' · {0:N1}min · turn {1}' -f ((Get-Date) - $script:runAt).TotalMinutes, $script:turns.Count
  }
  Row $now $script:stateColor
  # 2) the issue(s) being solved: ▶ = the one the latest tool call named, then the rest of this PC's in-progress / needs-human
  if ($b) {
    $ids = @(@($script:focus) + @($b.active.t) | Where-Object { $_ } | Select-Object -Unique -First 3)
    if (-not $ids) { Row '  issue  없음 (진행 중인 이슈 없음)' DarkGray }
    foreach ($id in $ids) {
      $c = if ($id -eq $script:focus) { 'Yellow' } else { @($b.active | Where-Object t -eq $id)[0].c ?? 'Gray' }
      Row "  $(if ($id -eq $script:focus) { '▶' } else { ' ' }) #$id $($b.titles[$id])" $c
      if ($b.notes[$id]) { Row "      └ $($b.notes[$id])" Gray }
    }
    $total = ($b.n.Values | Measure-Object -Sum).Sum; $done = $b.n.done
    $fill = [int][math]::Round(20 * $done / [math]::Max($total, 1))
    $spec = if ($b.specs) { " · spec $($b.specs -join ', ')" } else { '' }
    Row ("  진행 $('█' * $fill)$('░' * (20 - $fill)) $done/$total · ready $($b.n.ready) · blocked $($b.n.blocked) · needs human $($b.n['needs human'])$spec · tracker {0:HH:mm:ss}" -f $b.at) Cyan
  } else { Row '  tracker loading…' DarkGray }
  foreach ($a in @($script:agents.Values) | Select-Object -First 4) { Row "  ▸ [$(ModelLabel $a.model)] $($a.name)  → $($a.last)" Cyan }
  # 3) turns of the current (or last) run, newest at the bottom; 4) log tail
  $rest = [math]::Max(2, $H - $out.Count - 3)
  $turnRows = [math]::Min([math]::Max(1, $script:turns.Count), [math]::Floor($rest / 2)); $logRows = $rest - $turnRows
  Hr "turns$(if ($script:runNo) { " · run #$($script:runNo)" }) ($($script:turns.Count))"
  if (-not $script:turns.Count) { Row '  (아직 없음)' DarkGray }
  foreach ($t in $script:turns | Select-Object -Last $turnRows) {
    $c = if ($t -eq $script:turn -and $script:runAt) { 'White' } else { 'Gray' }
    Row ("  T{0,-3} {1:HH:mm:ss} [{2}] [model:{3}] {4}" -f $t.n, $t.at, $t.ph, (ModelLabel $t.model), ($t.acts -join ' · ')) $c
  }
  Hr 'log'
  foreach ($x in $logs | Select-Object -Last $logRows) { Row $x[0] $x[1] }
  Row "stop after this run: New-Item '$stop'" DarkGray
  [Console]::Write("$esc[H" + (($out | Select-Object -First $H) -join "$esc[K`n") + "$esc[K$esc[J")
}
function Say($msg, $color = 'Gray') {
  $line = '{0:HH:mm:ss} {1}' -f (Get-Date), $msg
  if ($plain) { Write-Host $line -ForegroundColor $color; return }
  $logs.Add(@($line, $color)); if ($logs.Count -gt 100) { $logs.RemoveAt(0) }
  Draw
}
function State($s, $c) { $script:state = $s; $script:stateColor = $c; Draw }
function Wait($sec) { $end = (Get-Date).AddSeconds($sec); while ((Get-Date) -lt $end -and -not (Test-Path $stop)) { Draw; Start-Sleep 1 } }

function Idle($why) {
  $at = '{0:HH:mm:ss}' -f (Get-Date).AddSeconds($IdleSec)
  $script:runAt = $null
  Say "$why — next check at $at" DarkGray
  Title "idle until $at"; State "대기중 · $at 까지 · $why" DarkGray; Wait $IdleSec
}
# Precheck with gh (tracker ops: docs/agents/issue-tracker.md) so an empty or still-blocked queue costs no claude run.
# ponytail: bounded GitHub lists, no state DB; paginate if queue exceeds these limits.
function Candidates {
  $r = gh issue list --state open --label "agent:$Pc" --limit 100 --json number,labels,updatedAt `
    --jq '[.[] | select(.labels | map(.name) | (index("status:ready") or index("status:in-progress") or index("kind:spec")))] | sort_by(.number)'
  if ($LASTEXITCODE -ne 0) { throw 'candidate query failed' }; $r -join "`n"
}
# A spec still being published (parent `Tickets: N` > children found) must not start claude: /moai-work repeats this check.
# ponytail: counts children by the `Parent: #<p>` body header over the newest 200 issues; first incomplete spec blocks the PC's other work until it is fully published.
function Publishing {
  $specs = gh issue list --state open --label kind:spec --label "agent:$Pc" --limit 100 --json number,body | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'spec query failed' }
  $all = gh issue list --state all --limit 200 --json number,body | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'children query failed' }
  foreach ($sp in @($specs) | Sort-Object number) {
    if ($sp.body -notmatch '(?m)^Tickets:\s*(\d+)') { continue }
    $want = [int]$Matches[1]; $pat = "(?m)^Parent: #$($sp.number)(\D|$)"
    $have = @($all | Where-Object { $_.body -match $pat }).Count
    if ($have -lt $want) { return "spec #$($sp.number) publishing $have/$want" }
  }
}
function Fingerprint($cand) {
  $closed = gh issue list --state closed --limit 500 --json number,stateReason --jq 'sort_by(.number)'
  if ($LASTEXITCODE -ne 0) { throw 'closed query failed' }
  $main = git ls-remote origin refs/heads/main
  if ($LASTEXITCODE -ne 0 -or -not $main) { throw 'main query failed' }
  $prs = gh pr list --state all --limit 100 --json number,state,headRefName,headRefOid,baseRefName,baseRefOid,mergedAt `
    --jq '[.[] | select(.headRefName | test("^(spec-|issue-)"))] | sort_by(.number)'
  if ($LASTEXITCODE -ne 0) { throw 'PR query failed' }
  @($cand, ($closed -join "`n"), ($main -join "`n"), ($prs -join "`n")) -join "`n--`n"
}
# Worktrees of a dead run or a closed issue (scripts/moai-worktree-clean.ps1). No run of this loop is alive when it's called.
function Sweep {
  $cleaner = Join-Path $PSScriptRoot moai-worktree-clean.ps1
  if (Test-Path $cleaner -PathType Leaf) { & $cleaner *>&1 | ForEach-Object { Say "worktree: $_" DarkGray } }
}

$agentMd = Get-Content (Join-Path (git rev-parse --show-toplevel) .claude/agents/moai-worker.md) -Raw
$showModel = if ($Model) { $Model } elseif ($agentMd -match '(?m)^model:\s*(\S+)') { $Matches[1] } else { 'default' }
$showEffort = if ($Effort) { $Effort } elseif ($agentMd -match '(?m)^effort:\s*(\S+)') { $Matches[1] } else { 'default' }
if (-not $plain) { [Console]::Write("$esc[?1049h$esc[?25l") }   # alternate screen, hidden cursor
try {
  Say "[$Pc] logs: $dir" DarkGray
  Say "[$Pc] stop after current run: New-Item '$stop'" DarkGray
  $n = 0
  $emptyAt = $null   # tracker fingerprint of the last `queue empty` run
  while (-not (Test-Path $stop)) {
    $fp = $null; $cand = $null; $pub = $null
    try { $cand = Candidates; $pub = Publishing; $fp = Fingerprint $cand } catch { Say "precheck failed: $_" DarkYellow }
    if (-not $fp) { Idle 'precheck unavailable — preserve wait state'; continue }
    elseif ($cand -eq '[]') { Idle "no ready/in-progress issue for $Pc"; continue }
    elseif ($pub) { Idle "$pub — waiting for /moai-spec to finish"; continue }
    elseif ($fp -eq $emptyAt) { Idle 'queue unchanged since last empty run (blocked)'; continue }
    Sweep
    $n++
    $log = Join-Path $dir ("{0}-{1:MMdd-HHmmss}.log" -f $Pc, (Get-Date))
    $opt = @('--agent', 'moai-worker')
    if ($Model) { $opt += '--model', $Model }
    if ($Effort) { $opt += '--effort', $Effort }
    $t0 = $runAt = Get-Date; $fetchAt = [datetime]::MinValue; $agents.Clear()
    $runNo = $n; $turns.Clear(); $turn = $null; $curMsg = $null; $phase = '시작'; $focus = $null
    $result = $null; $lastText = $null
    Say "── run #$n start ($(Split-Path $log -Leaf))" Cyan
    Say "   claude -p `"/moai-work $Pc`" --agent moai-worker" DarkGray
    Say "   model $showModel · effort $showEffort · budget `$$Budget" DarkGray
    Title "#$n starting"; State "작업중 · run #$n" Green
    # claude runs in a thread job so the board keeps redrawing (elapsed time, tracker) while a tool call is silent.
    $job = Start-ThreadJob {
      param($pc, $opt, $budget, $log, $cwd)
      Set-Location $cwd
      claude -p "/moai-work $pc" @opt `
        --permission-mode bypassPermissions --permission-prompts none `
        --max-budget-usd $budget --output-format stream-json --verbose 2>&1 | Tee-Object $log
      [pscustomobject]@{ exit = $LASTEXITCODE }
    } -ArgumentList $Pc, $opt, $Budget, $log, $PWD.Path
    $code = $null
    while ($null -eq $code) {
      $ended = $job.State -in 'Completed', 'Failed', 'Stopped'   # read before draining so the last lines aren't missed
      foreach ($o in Receive-Job $job 2>&1) {
        if ($o.PSObject.Properties['exit']) { $code = $o.exit; continue }
        $line = "$o"
        try { $e = $line | ConvertFrom-Json -ErrorAction Stop } catch { if ($line.Trim()) { Say $line DarkYellow }; continue }
        $pad = if ($e.parent_tool_use_id) { '    ' } else { '' }
        switch ($e.type) {
          'system' { if ($e.subtype -eq 'init') { Say "session $($e.session_id) · $($e.model) · effort $showEffort" DarkGray } }
          'assistant' {
            if (-not $pad -and $e.message.id -ne $curMsg) {   # a new main-agent API turn (its content blocks arrive as separate events)
              $curMsg = $e.message.id
              $turn = [pscustomobject]@{ n = $turns.Count + 1; at = Get-Date; ph = $phase; model = $e.message.model; acts = [Collections.Generic.List[string]]::new() }
              $turns.Add($turn)
            }
            if ($pad -and $agents.Contains($e.parent_tool_use_id)) { $agents[$e.parent_tool_use_id].model = $e.message.model }
            foreach ($c in $e.message.content) {
              if ($c.type -eq 'text' -and "$($c.text)".Trim()) {
                if ($pad) { Say "$pad$(Short $c.text)" White } else { $lastText = $c.text; $turn.acts.Add("msg: $(Short $c.text 80)"); Say (Short $c.text 400) White }
              }
              elseif ($c.type -eq 'tool_use') {
                $d = Describe $c
                if ($c.name -eq 'Agent') { $agents[$c.id] = @{ name = Short "$($c.input.subagent_type): $($c.input.description)" 60; last = '' } }
                if ($pad) { if ($agents.Contains($e.parent_tool_use_id)) { $agents[$e.parent_tool_use_id].last = $d } }
                $ph = Phase $c $pad; if ($ph) { $phase = $ph }
                if ("$($c.input.command) $($c.input.description)" -match '(?:#|issue[- ]|gh issue (?:view|edit|comment|close) )(\d+)' -and $board -and $board.titles.ContainsKey($Matches[1])) { $focus = $Matches[1] }
                if (-not $pad) { $turn.acts.Add("→ $d"); $turn.ph = $phase }
                if ($d -match '^(Bash|PowerShell) gh (issue|pr) ') { $fetchAt = [datetime]::MinValue }   # phase/claim/merge → refresh board
                Say "$pad→ $d"; Title "#$n $d"
              }
            }
          }
          'user' {
            foreach ($c in @($e.message.content)) {
              if ($c.type -ne 'tool_result') { continue }
              if ($agents.Contains($c.tool_use_id)) { $agents.Remove($c.tool_use_id); Draw }
              if ($c.is_error) { Say "$pad✗ $(Short (@($c.content) | ForEach-Object { if ($_ -is [string]) { $_ } else { $_.text } }) 120)" Red }
            }
          }
          'result' { $result = $e }
        }
      }
      if ($ended -and $null -eq $code) { $code = -1 }   # job died before reporting claude's exit code
      if ($null -eq $code) { Draw; Start-Sleep -Milliseconds 250 }
    }
    Remove-Job $job -Force
    $took = '{0:N1}min' -f ((Get-Date) - $t0).TotalMinutes
    $runAt = $null; $agents.Clear(); $fetchAt = [datetime]::MinValue
    if ($result) {
      $lastRun = "#$n {0} · $took · `${1:N2} · {2} turns" -f $result.subtype, $result.total_cost_usd, $result.num_turns
      Say "── run $lastRun" Cyan
      if ($result.result -and $result.result -ne $lastText) { Say (Short $result.result 400) White }
    }
    if ($code -ne 0) {
      Say "run #$n exit $code after $took — retry at $('{0:HH:mm:ss}' -f (Get-Date).AddSeconds(60))" Red
      Title 'error, retrying in 60s'; State "오류 (exit $code) · 60s 후 재시도" Red; Wait 60; continue
    }
    if ($result.result -match 'queue empty') {
      # 실행 중 도착한 큐·blocker·main·PR 변경을 흡수하지 않는다.
      # ponytail: 자기 phase 변경으로 한 번 더 깨어날 수 있으나 새 작업을 놓치지 않는다.
      $emptyAt = $fp
      Idle 'queue empty / integrated or PR waiting'
    }
  }
  Title 'stopped'; State '중지됨' Cyan
  Say "stopped ($Pc)" Cyan
} finally {
  @($job, $fetch) | Where-Object { $_ } | Remove-Job -Force -ErrorAction Ignore   # Ctrl+C: drop the claude/board jobs
  Sweep   # a claude killed by Ctrl+C leaves its lock pid dead, so its worktrees go now
  if (-not $plain) {
    [Console]::Write("$esc[?25h$esc[?1049l")   # back to the normal screen, leave the last log lines there
    foreach ($x in $logs | Select-Object -Last 15) { Write-Host $x[0] -ForegroundColor $x[1] }
  }
}
