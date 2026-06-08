$stopScript = Join-Path $PSScriptRoot "stop-vygilence-port-3000.ps1"
if (Test-Path $stopScript) {
    & $stopScript
}

$taskName = "Vygilence Local Server"
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($task) {
    Write-Host "Starting Scheduled Task '$taskName'..." -ForegroundColor Cyan
    Start-ScheduledTask -TaskName $taskName
    Write-Host "Scheduled Task started." -ForegroundColor Green
} else {
    Write-Host "Scheduled Task not found. Starting server manually via CMD script..." -ForegroundColor Cyan
    $cmdPath = Join-Path $PSScriptRoot "start-vygilence-prod.cmd"
    if (Test-Path $cmdPath) {
        Start-Process -FilePath "cmd.exe" -ArgumentList "/c $cmdPath" -WindowStyle Minimized
        Write-Host "Manually started production server in a minimized window." -ForegroundColor Green
    } else {
        Write-Error "CMD script not found at $cmdPath"
        exit 1
    }
}

Write-Host ""
Write-Host "Vygilence Local Server is starting. You can access it at:"
Write-Host "  http://localhost:3000" -ForegroundColor Green
