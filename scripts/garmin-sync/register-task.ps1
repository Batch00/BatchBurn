# Registers the "BatchBurn Garmin Sync" scheduled task (runs at log on, on
# unlock, and daily at 6 PM; sync.mjs self-throttles to SYNC_INTERVAL_DAYS).
# Re-running replaces the existing task.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\garmin-sync\register-task.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'BatchBurn Garmin Sync'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$syncScript = Join-Path $repoRoot 'scripts\garmin-sync\sync.mjs'
$node = (Get-Command node).Source
$user = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$syncScript`"" -WorkingDirectory $repoRoot

$logonTrigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$logonTrigger.Delay = 'PT2M'

# No cmdlet for unlock triggers; build one from the CIM class (StateChange 8 = SessionUnlock)
$stateChangeClass = Get-CimClass -Namespace ROOT\Microsoft\Windows\TaskScheduler -ClassName MSFT_TaskSessionStateChangeTrigger
$unlockTrigger = New-CimInstance -CimClass $stateChangeClass -ClientOnly -Property @{
  StateChange = 8
  UserId      = $user
  Delay       = 'PT2M'
}

# Fallback for when the laptop is already unlocked all day
$dailyTrigger = New-ScheduledTaskTrigger -Daily -At '6:00PM'
# -At stores a UTC ("Z") time that drifts an hour across DST; pin to local 6 PM
$dailyTrigger.StartBoundary = (Get-Date '18:00').ToString('s')

$triggers = @($logonTrigger, $unlockTrigger, $dailyTrigger)

# Interactive = run only when the user is logged on (needed for the visible browser)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed existing '$taskName'"
}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers `
  -Principal $principal -Settings $settings | Out-Null

Write-Host "Registered '$taskName'"
Write-Host "  node:   $node"
Write-Host "  script: $syncScript"
