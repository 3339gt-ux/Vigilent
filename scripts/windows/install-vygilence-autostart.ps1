param(
    [ValidateSet("logon", "startup")]
    [string]$Trigger = "logon"
)

$taskName = "Vygilence Local Server"
$actionScript = "C:\Vigilen\scripts\windows\start-vygilence-prod.cmd"

# Check administrator privilege if startup is selected
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($Trigger -eq "startup" -and -not $isAdmin) {
    Write-Warning "Registering a task to run 'At Startup' (before user login) requires Administrator privileges."
    Write-Warning "Please run PowerShell as Administrator or use the default '-Trigger logon' option."
    exit 1
}

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Scheduled Task '$taskName' already exists." -ForegroundColor Yellow
    $response = Read-Host "Do you want to overwrite/replace it? (y/N)"
    if ($response -notmatch '^[yY]') {
        Write-Host "Installation cancelled."
        exit 0
    }
    try {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
        Write-Host "Unregistered existing task." -ForegroundColor Gray
    } catch {
        Write-Error "Failed to remove existing task. You may need Administrator privileges."
        exit 1
    }
}

$action = New-ScheduledTaskAction -Execute $actionScript -WorkingDirectory "C:\Vigilen"

if ($Trigger -eq "startup") {
    $taskTrigger = New-ScheduledTaskTrigger -AtStartup
    # Startup tasks need to run under a specific principal to launch without a user session
    $principal = New-ScheduledTaskPrincipal -UserId "NT AUTHORITY\SYSTEM" -LogonType ServiceAccount
} else {
    $taskTrigger = New-ScheduledTaskTrigger -AtLogOn
    # Logon tasks can run under the current user's session
    $principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive
}

# ExecutionTimeLimit of 0 means infinity (no timeout limit)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 5)

try {
    if ($Trigger -eq "startup") {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $taskTrigger -Principal $principal -Settings $settings -Description "Vygilence Local Production Server (Autostart on Boot)" -ErrorAction Stop
    } else {
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $taskTrigger -Principal $principal -Settings $settings -Description "Vygilence Local Production Server (Autostart on Logon)" -ErrorAction Stop
    }

    Write-Host "Successfully registered scheduled task '$taskName'." -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:"
    Write-Host "  Name: $taskName"
    Write-Host "  Action: $actionScript"
    Write-Host "  Trigger: At $Trigger"
    Write-Host "  Restart on Failure: Yes (3 times, every 5 minutes)"
    Write-Host "  Execution Time Limit: Unlimited"
} catch {
    Write-Error "Failed to register scheduled task. Error details: $_"
    if (-not $isAdmin) {
        Write-Warning "Tip: Try running this script as Administrator."
    }
}
