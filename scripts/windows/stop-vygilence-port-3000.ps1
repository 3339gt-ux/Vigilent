param(
    [switch]$Force
)

$port = 3000
$pids = @()

# Try Get-NetTCPConnection
try {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop
    foreach ($conn in $connections) {
        if ($conn.OwningProcess) {
            $pids += $conn.OwningProcess
        }
    }
} catch {
    # Fallback to netstat
    $netstat = netstat -ano | Select-String "LISTENING" | Select-String ":$port\s+"
    foreach ($line in $netstat) {
        if ($line -match '(\d+)$') {
            $pids += [int]$Matches[1]
        }
    }
}

$pids = $pids | Select-Object -Unique

if ($pids.Count -eq 0) {
    Write-Host "No process found listening on port $port." -ForegroundColor Cyan
    exit 0
}

foreach ($procId in $pids) {
    try {
        $proc = Get-Process -Id $procId -ErrorAction Stop
        $procName = $proc.ProcessName
    } catch {
        $procName = "Unknown"
    }

    Write-Host "Found process listening on port $port`:"
    Write-Host "  Process Name: $procName" -ForegroundColor Yellow
    Write-Host "  PID: $procId" -ForegroundColor Yellow

    $confirm = $false
    if ($Force) {
        $confirm = $true
    } else {
        $response = Read-Host "Stop process $procName (PID: $procId) on port $port? (y/N)"
        if ($response -match '^[yY]') {
            $confirm = $true
        }
    }

    if ($confirm) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "Successfully stopped process $procName (PID: $procId) on port $port." -ForegroundColor Green
        } catch {
            Write-Warning "Failed to stop process (PID: $procId). Error: $_"
        }
    } else {
        Write-Host "Action cancelled for process PID $procId." -ForegroundColor LightGray
    }
}
