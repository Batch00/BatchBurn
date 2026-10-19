# Removes the "BatchBurn Garmin Sync" scheduled task.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\garmin-sync\unregister-task.ps1

$ErrorActionPreference = 'Stop'

$taskName = 'BatchBurn Garmin Sync'
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
Write-Host "Removed '$taskName'"
