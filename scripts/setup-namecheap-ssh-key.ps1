param(
  [string]$HostName = $(if ($env:CDR_DEPLOY_HOST) { $env:CDR_DEPLOY_HOST } else { "server242.web-hosting.com" }),
  [string]$RemoteUser = $(if ($env:CDR_DEPLOY_USER) { $env:CDR_DEPLOY_USER } else { "hitham" }),
  [int]$SshPort = $(if ($env:CDR_DEPLOY_PORT) { [int]$env:CDR_DEPLOY_PORT } else { 21098 }),
  [string]$KeyPath = "",
  [switch]$Force,
  [switch]$TestConnection
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($KeyPath)) {
  $KeyPath = Join-Path $repoRoot "secrets\cdr_namecheap_ed25519"
}

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found. Install OpenSSH Client or add it to PATH."
  }
}

function Invoke-ProcessArguments {
  param(
    [Parameter(Mandatory = $true)][string]$FileName,
    [Parameter(Mandatory = $true)][AllowEmptyString()][string[]]$Arguments
  )
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = $FileName
  $startInfo.UseShellExecute = $false
  $startInfo.Arguments = ($Arguments | ForEach-Object {
    if ($_ -eq "") {
      '""'
    } elseif ($_ -match '[\s"]') {
      '"' + ($_ -replace '\\', '\\' -replace '"', '\"') + '"'
    } else {
      $_
    }
  }) -join " "
  $process = [System.Diagnostics.Process]::Start($startInfo)
  if (-not $process) {
    throw "Failed to start $FileName"
  }
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "$FileName failed with exit code $($process.ExitCode)"
  }
}

Require-Command -Name "ssh-keygen"

$keyDir = Split-Path -Parent $KeyPath
New-Item -ItemType Directory -Force -Path $keyDir | Out-Null

if ((Test-Path -LiteralPath $KeyPath) -and -not $Force) {
  Write-Host "SSH key already exists:"
  Write-Host "  $KeyPath"
} else {
  if ((Test-Path -LiteralPath $KeyPath) -and $Force) {
    Remove-Item -LiteralPath $KeyPath -Force
  }
  if ((Test-Path -LiteralPath "$KeyPath.pub") -and $Force) {
    Remove-Item -LiteralPath "$KeyPath.pub" -Force
  }
  $comment = "cdr-dashboard-deploy-$RemoteUser@$HostName"
  Invoke-ProcessArguments -FileName "ssh-keygen" -Arguments @("-t", "ed25519", "-f", $KeyPath, "-C", $comment, "-N", "")
}

if (-not (Test-Path -LiteralPath "$KeyPath.pub")) {
  throw "Public key was not found: $KeyPath.pub"
}

$publicKey = (Get-Content -LiteralPath "$KeyPath.pub" -Raw).Trim()

try {
  Set-Clipboard -Value $publicKey
  $clipboardMessage = "The public key was copied to your clipboard."
} catch {
  $clipboardMessage = "Could not copy to clipboard. Open the .pub file manually."
}

Write-Host ""
Write-Host "SSH key is ready."
Write-Host "Private key, keep secret:"
Write-Host "  $KeyPath"
Write-Host "Public key, paste this in cPanel SSH Access:"
Write-Host "  $KeyPath.pub"
Write-Host ""
Write-Host $clipboardMessage
Write-Host ""
Write-Host "cPanel steps:"
Write-Host "  1. Open cPanel > SSH Access > Manage SSH Keys."
Write-Host "  2. Import Key."
Write-Host "  3. Name: cdr_dashboard_deploy"
Write-Host "  4. Paste the public key from clipboard or from $KeyPath.pub"
Write-Host "  5. Save/Import."
Write-Host "  6. Go back to Manage SSH Keys and click Manage Authorization."
Write-Host "  7. Click Authorize."
Write-Host ""
Write-Host "After authorization, test:"
Write-Host "  ssh -i `"$KeyPath`" -p $SshPort $RemoteUser@$HostName `"pwd && whoami`""
Write-Host ""
Write-Host "Then deploy without password:"
Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\deploy-namecheap-upload.ps1 -HostName $HostName -BuildFirst -RunRemoteNpmInstall -RunRemoteMigrate"

if ($TestConnection) {
  Require-Command -Name "ssh"
  Write-Host ""
  Write-Host "Testing SSH key connection..."
  & ssh -i $KeyPath -p $SshPort -o IdentitiesOnly=yes -o PreferredAuthentications=publickey -o BatchMode=yes -o StrictHostKeyChecking=accept-new "$RemoteUser@$HostName" "pwd && whoami"
  if ($LASTEXITCODE -ne 0) {
    throw "SSH key test failed. Make sure the public key is imported and authorized in cPanel."
  }
}
