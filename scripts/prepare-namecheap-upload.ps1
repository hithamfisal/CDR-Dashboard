param(
  [switch]$SkipCheck,
  [switch]$SkipBuild,
  [switch]$NoZip
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$uploadRoot = Join-Path $root "artifacts\namecheap-upload"
$readyRoot = Join-Path $uploadRoot "FileZilla-upload-ready"
$webFolder = Join-Path $readyRoot "UPLOAD_TO_public_html_cdr"
$apiFolder = Join-Path $readyRoot "UPLOAD_TO_home_hitham_api-cdr"
$distFolder = Join-Path $root "dist"
$publicFolder = Join-Path $root "public"
$serverFolder = Join-Path $root "server"

$webZip = Join-Path $readyRoot "cdr-web-upload-for-cpanel-filemanager.zip"
$apiZip = Join-Path $readyRoot "cdr-api-upload-for-cpanel-filemanager.zip"
$allZip = Join-Path $uploadRoot "cdr-namecheap-upload-ready.zip"

function Assert-ChildPath {
  param(
    [Parameter(Mandatory = $true)][string]$Parent,
    [Parameter(Mandatory = $true)][string]$Child
  )
  $parentFull = [IO.Path]::GetFullPath($Parent).TrimEnd('\') + '\'
  $childFull = [IO.Path]::GetFullPath($Child).TrimEnd('\') + '\'
  if (-not $childFull.StartsWith($parentFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to modify path outside expected folder: $Child"
  }
}

function Copy-RequiredFile {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )
  if (-not (Test-Path -LiteralPath $Source)) {
    throw "Required file was not found: $Source"
  }
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

Push-Location $root
try {
  if (-not $SkipCheck) {
    Write-Host "Running TypeScript check..."
    yarn run check
  }

  if (-not $SkipBuild) {
    Write-Host "Building web frontend..."
    yarn build
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $distFolder)) {
  throw "Build output was not found: $distFolder"
}
if (-not (Test-Path -LiteralPath (Join-Path $serverFolder "index.cjs"))) {
  throw "API server entry was not found: $(Join-Path $serverFolder "index.cjs")"
}

New-Item -ItemType Directory -Path $uploadRoot -Force | Out-Null
Assert-ChildPath -Parent $uploadRoot -Child $readyRoot
if (Test-Path -LiteralPath $readyRoot) {
  Remove-Item -LiteralPath $readyRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $webFolder, $apiFolder | Out-Null

Write-Host "Preparing web upload folder..."
Get-ChildItem -LiteralPath $distFolder -Force | Copy-Item -Destination $webFolder -Recurse -Force
Copy-RequiredFile -Source (Join-Path $publicFolder "config.js") -Destination (Join-Path $webFolder "config.js")
Copy-RequiredFile -Source (Join-Path $publicFolder ".htaccess") -Destination (Join-Path $webFolder ".htaccess")

Write-Host "Preparing API upload folder..."
New-Item -ItemType Directory -Path (Join-Path $apiFolder "server") -Force | Out-Null
Copy-RequiredFile -Source (Join-Path $serverFolder "index.cjs") -Destination (Join-Path $apiFolder "server\index.cjs")
Copy-RequiredFile -Source (Join-Path $serverFolder "schema.mysql.sql") -Destination (Join-Path $apiFolder "server\schema.mysql.sql")

@'
{
  "name": "cdr-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server/index.cjs",
    "migrate": "node server/index.cjs --init-only",
    "mysql:init": "node server/index.cjs --init-only"
  },
  "dependencies": {
    "mysql2": "^3.22.5"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $apiFolder "package.json") -Encoding UTF8

@'
CDR Dashboard - Namecheap / cPanel Upload Steps
================================================

Local project:
  D:\Dashboards Projects\CDR Dashboard\CDR Dashboard V8

Generated upload folder:
  artifacts\namecheap-upload\FileZilla-upload-ready

Generated folders:
  UPLOAD_TO_public_html_cdr
  UPLOAD_TO_home_hitham_api-cdr

Generated ZIP files:
  cdr-web-upload-for-cpanel-filemanager.zip
  cdr-api-upload-for-cpanel-filemanager.zip
  ..\cdr-namecheap-upload-ready.zip

------------------------------------------------
1) Web frontend upload
------------------------------------------------

Domain:
  https://cdr.hitham.app

Remote folder in FileZilla:
  /home/hitham/public_html/cdr

Upload the CONTENTS of this local folder:
  UPLOAD_TO_public_html_cdr

Expected remote result:
  /home/hitham/public_html/cdr/index.html
  /home/hitham/public_html/cdr/config.js
  /home/hitham/public_html/cdr/.htaccess
  /home/hitham/public_html/cdr/assets/...
  /home/hitham/public_html/cdr/Samples/...

Important before upload:
  Delete the old remote assets folder:
    /home/hitham/public_html/cdr/assets

Do not upload:
  node_modules
  src
  server
  .env
  users.txt
  release
  electron

------------------------------------------------
2) API backend upload
------------------------------------------------

API domain:
  https://api.cdr.hitham.app

Remote folder in FileZilla:
  /home/hitham/api-cdr

Upload the CONTENTS of this local folder:
  UPLOAD_TO_home_hitham_api-cdr

Expected remote result:
  /home/hitham/api-cdr/package.json
  /home/hitham/api-cdr/server/index.cjs
  /home/hitham/api-cdr/server/schema.mysql.sql

Do not delete the cPanel-generated nodevenv folder.
Do not upload local node_modules.

------------------------------------------------
3) cPanel Node.js App settings
------------------------------------------------

Application URL:
  api.cdr.hitham.app

Application root:
  api-cdr

Startup file:
  server/index.cjs

Node.js:
  20 or newer

Mode:
  Production

------------------------------------------------
4) Environment variables
------------------------------------------------

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=hitham_hitham
MYSQL_PASSWORD=<your database user password>
MYSQL_DATABASE=hitham_cdr_dashboard
MYSQL_CONNECTION_LIMIT=5
CDR_SKIP_CREATE_DATABASE=1
CDR_ALLOWED_ORIGIN=https://cdr.hitham.app
CDR_SESSION_SECRET=<long random secret>
CDR_DISABLE_LOCAL_REPORT_API=1
NODE_ENV=production

------------------------------------------------
5) After API upload
------------------------------------------------

In cPanel Node.js App:
  1. Run NPM Install
  2. Run JS script:
       server/index.cjs --init-only
     or from Terminal after activating the Node app:
       node server/index.cjs --init-only
  3. Restart the Node.js app

Test:
  https://api.cdr.hitham.app/api/health

Expected:
  {"ok":true,"database":"hitham_cdr_dashboard"}

------------------------------------------------
6) After web upload
------------------------------------------------

Open:
  https://cdr.hitham.app/?refresh=latest

If the old page still appears:
  Press Ctrl + F5
  or open InPrivate/Incognito
  or add:
    ?v=latest

------------------------------------------------
Arabic quick steps
------------------------------------------------

1. شغل السكربت من PowerShell:
   cd "D:\Dashboards Projects\CDR Dashboard\CDR Dashboard V8"
   powershell -ExecutionPolicy Bypass -File .\scripts\prepare-namecheap-upload.ps1

2. ارفع محتويات:
   artifacts\namecheap-upload\FileZilla-upload-ready\UPLOAD_TO_public_html_cdr
   إلى:
   /home/hitham/public_html/cdr

3. ارفع محتويات:
   artifacts\namecheap-upload\FileZilla-upload-ready\UPLOAD_TO_home_hitham_api-cdr
   إلى:
   /home/hitham/api-cdr

4. في cPanel Node.js App:
   Run NPM Install
   Restart

5. اختبر:
   https://api.cdr.hitham.app/api/health
   https://cdr.hitham.app/?refresh=latest

------------------------------------------------
Direct online deployment script
------------------------------------------------

To upload directly to Namecheap by SSH/SCP:

1. Prepare and upload in one command:
   cd "D:\Dashboards Projects\CDR Dashboard\CDR Dashboard V8"
   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-namecheap-upload.ps1 -HostName server242.web-hosting.com -BuildFirst -RunRemoteNpmInstall -RunRemoteMigrate

2. To test the deployment plan without uploading:
   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-namecheap-upload.ps1 -HostName server242.web-hosting.com -DryRun

3. To upload only the web frontend:
   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-namecheap-upload.ps1 -HostName server242.web-hosting.com -BuildFirst -SkipApi

4. To upload only the API:
   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-namecheap-upload.ps1 -HostName server242.web-hosting.com -BuildFirst -SkipWeb -RunRemoteNpmInstall -RunRemoteMigrate

The deploy script will ask you to type DEPLOY before replacing remote files unless you add:
  -Yes

Arabic:
  سكربت الرفع المباشر يحتاج SSH شغال على السيرفر.
  إذا طلب كلمة مرور، اكتب كلمة مرور SSH.
  لا تحفظ كلمة المرور داخل السكربت.
'@ | Set-Content -LiteralPath (Join-Path $readyRoot "README_UPLOAD.txt") -Encoding UTF8

if (-not $NoZip) {
  Write-Host "Creating ZIP files..."
  Compress-Archive -Path (Join-Path $webFolder "*") -DestinationPath $webZip -Force
  Compress-Archive -Path (Join-Path $apiFolder "*") -DestinationPath $apiZip -Force
  if (Test-Path -LiteralPath $allZip) {
    Remove-Item -LiteralPath $allZip -Force
  }
  Compress-Archive -Path (Join-Path $readyRoot "*") -DestinationPath $allZip -Force
}

Write-Host ""
Write-Host "Namecheap upload package is ready:"
Write-Host "  $readyRoot"
Write-Host ""
Write-Host "FileZilla folders:"
Write-Host "  $webFolder"
Write-Host "  $apiFolder"
Write-Host ""
if (-not $NoZip) {
  Write-Host "ZIP files:"
  Write-Host "  $webZip"
  Write-Host "  $apiZip"
  Write-Host "  $allZip"
}
