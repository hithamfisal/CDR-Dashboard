param(
  [string]$HostName = $(if ($env:CDR_DEPLOY_HOST) { $env:CDR_DEPLOY_HOST } else { "server242.web-hosting.com" }),
  [string]$RemoteUser = $(if ($env:CDR_DEPLOY_USER) { $env:CDR_DEPLOY_USER } else { "hitham" }),
  [int]$SshPort = $(if ($env:CDR_DEPLOY_PORT) { [int]$env:CDR_DEPLOY_PORT } else { 21098 }),
  [string]$IdentityFile = $env:CDR_DEPLOY_IDENTITY_FILE,
  [switch]$DryRun,
  [switch]$SkipBuild,
  [switch]$SkipWeb,
  [switch]$SkipApi,
  [switch]$WithNpmInstall,
  [switch]$WithMigrate,
  [switch]$SkipHealthCheck,
  [switch]$AskConfirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$deployScript = Join-Path $root "scripts\deploy-namecheap-upload.ps1"
$defaultIdentityFile = Join-Path $root "secrets\cdr_namecheap_ed25519"

if (-not (Test-Path -LiteralPath $deployScript -PathType Leaf)) {
  throw "Deployment script was not found: $deployScript"
}

if ([string]::IsNullOrWhiteSpace($IdentityFile) -and (Test-Path -LiteralPath $defaultIdentityFile -PathType Leaf)) {
  $IdentityFile = $defaultIdentityFile
}

if (-not [string]::IsNullOrWhiteSpace($IdentityFile) -and -not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
  throw "SSH key was not found: $IdentityFile"
}

$deployArgs = @(
  "-ExecutionPolicy", "Bypass",
  "-File", $deployScript,
  "-HostName", $HostName,
  "-RemoteUser", $RemoteUser,
  "-SshPort", "$SshPort"
)

if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  $deployArgs += @("-IdentityFile", $IdentityFile)
}

if (-not $SkipBuild -and -not $DryRun) { $deployArgs += "-BuildFirst" }
if ($DryRun) { $deployArgs += "-DryRun" }
if ($SkipWeb) { $deployArgs += "-SkipWeb" }
if ($SkipApi) { $deployArgs += "-SkipApi" }
if ($WithNpmInstall) { $deployArgs += "-RunRemoteNpmInstall" }
if ($WithMigrate) { $deployArgs += "-RunRemoteMigrate" }
if ($SkipHealthCheck) { $deployArgs += "-SkipHealthCheck" }
if (-not $AskConfirm -and -not $DryRun) { $deployArgs += "-Yes" }

Write-Host ""
Write-Host "CDR one-command deployment"
Write-Host "Project: $root"
Write-Host "Host:    $RemoteUser@$HostName port $SshPort"
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  Write-Host "SSH key: $IdentityFile"
} else {
  Write-Warning "No SSH key was found. Run .\scripts\setup-namecheap-ssh-key.ps1 first for passwordless deployment."
}
Write-Host ""

Push-Location $root
try {
  & powershell @deployArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Deployment failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}
