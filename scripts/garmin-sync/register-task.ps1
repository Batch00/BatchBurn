# Registers the "BatchBurn Garmin Sync" scheduled task (runs at log on).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\garmin-sync\register-task.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'BatchBurn Garmin Sync'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$syncScript = Join-Path $repoRoot 'scripts\garmin-sync\sync.mjs'
$node = (Get-Command node).Source
$user = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$syncScript`"" -WorkingDirectory $repoRoot

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$trigger.Delay = 'PT2M'

# Interactive = run only when the user is logged on (needed for the visible browser)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Registered '$taskName'"
Write-Host "  node:   $node"
Write-Host "  script: $syncScript"
