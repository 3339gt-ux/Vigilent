$taskName = "Vygilence Local Server"

$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $existingTask) {
    Write-Host "Scheduled Task '$taskName' is not registered." -ForegroundColor Cyan
    exit 0
}

Write-Host "Found registered Scheduled Task: '$taskName'" -ForegroundColor Yellow
$response = Read-Host "Are you sure you want to uninstall and remove this task? (y/N)"
if ($response -match '^[yY]') {
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host "Successfully unregistered scheduled task '$taskName'." -ForegroundColor Green
    } catch {
        Write-Error "Failed to remove scheduled task. You may need Administrator privileges. Error: $_"
    }
} else {
    Write-Host "Uninstall cancelled."
}
