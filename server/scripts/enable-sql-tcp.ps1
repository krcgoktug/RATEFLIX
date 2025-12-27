$instanceName = 'SQLEXPRESS'
$instanceKey = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL').$instanceName
if (-not $instanceKey) {
  Write-Error "SQL instance $instanceName not found."
  exit 1
}

$tcpKey = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\$instanceKey\MSSQLServer\SuperSocketNetLib\Tcp"
$ipAllKey = "$tcpKey\IPAll"

Set-ItemProperty -Path $tcpKey -Name Enabled -Value 1
Set-ItemProperty -Path $ipAllKey -Name TcpDynamicPorts -Value ''
Set-ItemProperty -Path $ipAllKey -Name TcpPort -Value '1433'

try {
  Set-Service -Name SQLBrowser -StartupType Automatic
  Start-Service -Name SQLBrowser
} catch {
  Write-Host 'SQLBrowser service not available or could not be started.'
}

Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
Write-Host 'TCP/IP enabled, port set to 1433, services restarted.'