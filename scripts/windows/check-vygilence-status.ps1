$port = 3000
$tcpClient = New-Object System.Net.Sockets.TcpClient
$listening = $false
try {
    $tcpClient.Connect("127.0.0.1", $port)
    $listening = $true
} catch {
    # Not listening
} finally {
    $tcpClient.Close()
}

if ($listening) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        Write-Host "Status: Running" -ForegroundColor Green
    }
    catch {
        if ($_.Exception -and $_.Exception.Response -ne $null) {
            Write-Host "Status: Running" -ForegroundColor Green
        } else {
            Write-Host "Status: Port listening but app not responding" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "Status: Not running" -ForegroundColor Red
}

Write-Host ""
Write-Host "Log files are located in: C:\Vigilen\logs\"
Write-Host "  Production log: C:\Vigilen\logs\vygilence-server.log"
Write-Host "  Development log: C:\Vigilen\logs\vygilence-dev-server.log"
Write-Host "  Build log: C:\Vigilen\logs\vygilence-build.log"
