param(
  [string]$PackageRoot = "",
  [string]$HostName = $env:CDR_DEPLOY_HOST,
  [string]$RemoteUser = $(if ($env:CDR_DEPLOY_USER) { $env:CDR_DEPLOY_USER } else { "hitham" }),
  [int]$SshPort = $(if ($env:CDR_DEPLOY_PORT) { [int]$env:CDR_DEPLOY_PORT } else { 21098 }),
  [string]$IdentityFile = $env:CDR_DEPLOY_IDENTITY_FILE,
  [string]$RemoteWebDir = "/home/hitham/public_html/cdr",
  [string]$RemoteApiDir = "/home/hitham/api-cdr",
  [string]$ApiHealthUrl = "https://api.cdr.hitham.app/api/health",
  [switch]$BuildFirst,
  [switch]$SkipWeb,
  [switch]$SkipApi,
  [switch]$RunRemoteNpmInstall,
  [switch]$RunRemoteMigrate,
  [switch]$SkipApiRestart,
  [switch]$SkipHealthCheck,
  [switch]$DryRun,
  [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$defaultPackageRoot = Join-Path $repoRoot "artifacts\namecheap-upload\FileZilla-upload-ready"
$defaultIdentityFile = Join-Path $repoRoot "secrets\cdr_namecheap_ed25519"

function Require-Command {
  param([Parameter(Mandatory = $true)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found. Install OpenSSH Client or add it to PATH."
  }
}

function Resolve-PackageRoot {
  if (-not [string]::IsNullOrWhiteSpace($PackageRoot)) {
    if (-not (Test-Path -LiteralPath $PackageRoot -PathType Container)) {
      throw "PackageRoot was not found: $PackageRoot"
    }
    return (Resolve-Path -LiteralPath $PackageRoot).Path
  }

  if (-not (Test-Path -LiteralPath $defaultPackageRoot -PathType Container)) {
    throw "No upload package found. Run .\scripts\prepare-namecheap-upload.ps1 first, or use -BuildFirst."
  }
  return (Resolve-Path -LiteralPath $defaultPackageRoot).Path
}

function Assert-Zip {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Name
  )
  $path = Join-Path $Root $Name
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Missing $Name in $Root. Run .\scripts\prepare-namecheap-upload.ps1 again."
  }
  return (Resolve-Path -LiteralPath $path).Path
}

function Native-Run {
  param(
    [Parameter(Mandatory = $true)][string]$Exe,
    [Parameter(Mandatory = $true)][string[]]$Args,
  [string]$InputText = ""
  )
  if ($InputText) {
    $InputText | & $Exe @Args
  } else {
    & $Exe @Args
  }
  if ($LASTEXITCODE -ne 0) {
    $message = "$Exe failed with exit code $LASTEXITCODE"
    if ($Exe -in @("ssh", "scp")) {
      $message += "`nSSH help: run .\scripts\setup-namecheap-ssh-key.ps1, import/authorize the public key in cPanel, then run deploy again."
      $message += "`nIf the connection already works, check the command output above; the remote deploy script may have failed after SSH connected."
    }
    throw $message
  }
}

if ($BuildFirst) {
  & powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "prepare-namecheap-upload.ps1")
  if ($LASTEXITCODE -ne 0) {
    throw "Package preparation failed."
  }
}

$PackageRoot = Resolve-PackageRoot

if ([string]::IsNullOrWhiteSpace($HostName)) {
  throw "HostName is required. Example: .\scripts\deploy-namecheap-upload.ps1 -HostName server242.web-hosting.com"
}

$deployWeb = -not $SkipWeb
$deployApi = -not $SkipApi
if (-not ($deployWeb -or $deployApi)) {
  throw "Nothing to deploy. Remove at least one of -SkipWeb or -SkipApi."
}

$webZip = if ($deployWeb) { Assert-Zip -Root $PackageRoot -Name "cdr-web-upload-for-cpanel-filemanager.zip" } else { "" }
$apiZip = if ($deployApi) { Assert-Zip -Root $PackageRoot -Name "cdr-api-upload-for-cpanel-filemanager.zip" } else { "" }

Require-Command -Name "ssh"
Require-Command -Name "scp"

$remote = "$RemoteUser@$HostName"
$sshArgs = @("-p", "$SshPort", "-o", "StrictHostKeyChecking=accept-new")
$scpArgs = @("-P", "$SshPort", "-o", "StrictHostKeyChecking=accept-new")
if ([string]::IsNullOrWhiteSpace($IdentityFile) -and (Test-Path -LiteralPath $defaultIdentityFile -PathType Leaf)) {
  $IdentityFile = $defaultIdentityFile
}
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) {
  if (-not (Test-Path -LiteralPath $IdentityFile -PathType Leaf)) {
    throw "Identity file was not found: $IdentityFile"
  }
  $identity = (Resolve-Path -LiteralPath $IdentityFile).Path
  $sshArgs += @("-i", $identity, "-o", "IdentitiesOnly=yes", "-o", "PreferredAuthentications=publickey", "-o", "BatchMode=yes")
  $scpArgs += @("-i", $identity, "-o", "IdentitiesOnly=yes", "-o", "PreferredAuthentications=publickey", "-o", "BatchMode=yes")
} else {
  Write-Warning "No SSH key was found. For passwordless deployment, run .\scripts\setup-namecheap-ssh-key.ps1 and authorize the public key in cPanel."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteStage = "/home/$RemoteUser/tmp/cdr-deploy/$stamp"

Write-Host ""
Write-Host "CDR deployment plan"
Write-Host "Package: $PackageRoot"
Write-Host "Remote:  $remote port $SshPort"
if (-not [string]::IsNullOrWhiteSpace($IdentityFile)) { Write-Host "SSH key: $IdentityFile" }
Write-Host "Stage:   $remoteStage"
if ($deployWeb) { Write-Host "Web:     $webZip -> $RemoteWebDir" }
if ($deployApi) { Write-Host "API:     $apiZip -> $RemoteApiDir" }
Write-Host ""

if ($DryRun) {
  Write-Host "Dry run only. No files were uploaded."
  exit 0
}

if (-not $Yes) {
  $answer = Read-Host "Type DEPLOY to upload and replace the remote CDR files"
  if ($answer -ne "DEPLOY") {
    throw "Deployment cancelled."
  }
}

Native-Run -Exe "ssh" -Args ($sshArgs + @($remote, "mkdir -p '$remoteStage'"))

if ($deployWeb) {
  Native-Run -Exe "scp" -Args ($scpArgs + @($webZip, "${remote}:$remoteStage/cdr-web.zip"))
}
if ($deployApi) {
  Native-Run -Exe "scp" -Args ($scpArgs + @($apiZip, "${remote}:$remoteStage/cdr-api.zip"))
}

$remoteScript = @'
set -euo pipefail

stage="$1"
web_dir="$2"
api_dir="$3"
deploy_web="$4"
deploy_api="$5"
run_npm="$6"
run_migrate="$7"
restart_api="$8"

backup_root="$HOME/backups/cdr-deploy/$(date +%Y%m%d-%H%M%S)"
extract_root="$stage/extract"

validate_target() {
  case "$1" in
    "$HOME"/*) ;;
    *) echo "Unsafe target path: $1" >&2; exit 21 ;;
  esac
}

backup_target() {
  target="$1"
  label="$2"
  validate_target "$target"
  mkdir -p "$backup_root"
  if [ -d "$target" ] && command -v tar >/dev/null 2>&1; then
    tar -czf "$backup_root/$label.tgz" -C "$(dirname "$target")" "$(basename "$target")" || true
  fi
}

clear_web_target() {
  target="$1"
  validate_target "$target"
  mkdir -p "$target"
  find "$target" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
}

clear_api_target() {
  target="$1"
  validate_target "$target"
  mkdir -p "$target"
  find "$target" -mindepth 1 -maxdepth 1 \
    ! -name ".env" \
    ! -name ".htaccess" \
    ! -name "node_modules" \
    ! -name "tmp" \
    ! -name "cgi-bin" \
    ! -name ".well-known" \
    ! -name "stderr.log" \
    ! -name "stdout.log" \
    -exec rm -rf {} +
}

find_node_activate() {
  app_name="$(basename "$api_dir")"
  find "$HOME/nodevenv/$app_name" -path "*/bin/activate" -type f 2>/dev/null | sort -V | tail -n 1
}

ensure_api_htaccess() {
  target="$1"
  validate_target "$target"
  if [ -f "$target/.htaccess" ]; then
    return
  fi
  app_name="$(basename "$target")"
  node_bin="$HOME/nodevenv/$app_name/24/bin/node"
  cat > "$target/.htaccess" <<EOF_HTACCESS
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "$target"
PassengerBaseURI "/"
PassengerNodejs "$node_bin"
PassengerAppType node
PassengerStartupFile server/index.cjs
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END
# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION BEGIN
<IfModule Litespeed>
</IfModule>
# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION END
EOF_HTACCESS
}

deploy_zip() {
  zip_name="$1"
  target="$2"
  label="$3"
  mode="$4"
  zip_path="$stage/$zip_name"
  src="$extract_root/$label"
  [ -f "$zip_path" ] || { echo "Missing uploaded zip: $zip_path" >&2; exit 22; }
  validate_target "$target"
  rm -rf "$src"
  mkdir -p "$src"
  set +e
  unzip -q -o "$zip_path" -d "$src"
  unzip_code=$?
  set -e
  if [ "$unzip_code" -gt 1 ]; then
    echo "Failed to extract $zip_path with unzip exit code $unzip_code" >&2
    exit "$unzip_code"
  fi
  backup_target "$target" "$label"
  if command -v rsync >/dev/null 2>&1; then
    if [ "$mode" = "api" ]; then
      rsync -a --delete \
        --exclude=".env" \
        --exclude=".htaccess" \
        --exclude="node_modules" \
        --exclude="tmp" \
        --exclude="cgi-bin" \
        --exclude=".well-known" \
        --exclude="stderr.log" \
        --exclude="stdout.log" \
        "$src/" "$target/"
    else
      rsync -a --delete "$src/" "$target/"
    fi
  else
    if [ "$mode" = "api" ]; then
      clear_api_target "$target"
    else
      clear_web_target "$target"
    fi
    cp -a "$src/." "$target/"
  fi
}

command -v unzip >/dev/null 2>&1 || { echo "Missing remote command: unzip" >&2; exit 20; }
mkdir -p "$extract_root"

if [ "$deploy_web" = "1" ]; then
  deploy_zip "cdr-web.zip" "$web_dir" "public_html-cdr" "web"
fi

if [ "$deploy_api" = "1" ]; then
  deploy_zip "cdr-api.zip" "$api_dir" "api-cdr" "api"
  ensure_api_htaccess "$api_dir"
  activate_file="$(find_node_activate || true)"
  if [ "$run_npm" = "1" ]; then
    if [ -n "$activate_file" ]; then
      cd "$api_dir"
      set +u
      # shellcheck disable=SC1090
      source "$activate_file"
      set -u
      npm install --omit=dev
    else
      echo "Node virtualenv was not found; skipped npm install." >&2
    fi
  fi
  if [ "$run_migrate" = "1" ]; then
    if [ -n "$activate_file" ]; then
      cd "$api_dir"
      set +u
      # shellcheck disable=SC1090
      source "$activate_file"
      set -u
      node server/index.cjs --init-only
    else
      echo "Node virtualenv was not found; skipped database init." >&2
    fi
  fi
  if [ "$restart_api" = "1" ]; then
    mkdir -p "$api_dir/tmp"
    touch "$api_dir/tmp/restart.txt"
  fi
fi

echo "Deployment complete."
echo "Backups: $backup_root"
'@

$remoteArgs = @(
  $remote,
  "bash",
  "-s",
  "--",
  $remoteStage,
  $RemoteWebDir,
  $RemoteApiDir,
  $(if ($deployWeb) { "1" } else { "0" }),
  $(if ($deployApi) { "1" } else { "0" }),
  $(if ($RunRemoteNpmInstall) { "1" } else { "0" }),
  $(if ($RunRemoteMigrate) { "1" } else { "0" }),
  $(if ($SkipApiRestart) { "0" } else { "1" })
)
Native-Run -Exe "ssh" -Args ($sshArgs + $remoteArgs) -InputText $remoteScript

if ($deployApi -and -not $SkipHealthCheck -and -not [string]::IsNullOrWhiteSpace($ApiHealthUrl)) {
  Write-Host ""
  Write-Host "Checking API health: $ApiHealthUrl"
  $healthOk = $false
  $lastHealthError = ""
  for ($attempt = 1; $attempt -le 8; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $ApiHealthUrl -UseBasicParsing -TimeoutSec 12
      $preview = ($response.Content | Out-String).Trim()
      if ($preview.Length -gt 180) {
        $preview = $preview.Substring(0, 180) + "..."
      }
      Write-Host "API health attempt ${attempt}: HTTP $($response.StatusCode) $preview"
      if ($response.StatusCode -eq 200 -and $response.Content -match '"ok"\s*:\s*true') {
        $healthOk = $true
        break
      }
      $lastHealthError = "Unexpected health response: HTTP $($response.StatusCode)"
    } catch {
      $lastHealthError = $_.Exception.Message
      Write-Host "API health attempt ${attempt}: $lastHealthError"
    }
    Start-Sleep -Seconds 5
  }
  if (-not $healthOk) {
    Write-Warning "API health did not confirm readiness. Restart the Node.js app in cPanel and test $ApiHealthUrl. Last result: $lastHealthError"
  }
}

Write-Host ""
Write-Host "CDR deployment finished."
Write-Host "Package deployed: $PackageRoot"
Write-Host "Remote stage kept at: $remoteStage"
