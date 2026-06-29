param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$uploadRoot = Join-Path $root "artifacts\namecheap-upload"
$readyRoot = Join-Path $uploadRoot "FileZilla-upload-ready"
$webFolder = Join-Path $readyRoot "UPLOAD_TO_public_html_cdr"
$apiFolder = Join-Path $readyRoot "UPLOAD_TO_api-cdr"
$webZip = Join-Path $readyRoot "cdr-web-upload-for-cpanel-filemanager.zip"
$apiZip = Join-Path $readyRoot "cdr-api-upload-for-cpanel-filemanager.zip"
$distFolder = Join-Path $root "dist"
$serverFolder = Join-Path $root "server"

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

if (-not $SkipBuild) {
  Push-Location $root
  try {
    yarn build
  } finally {
    Pop-Location
  }
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

Get-ChildItem -LiteralPath $distFolder -Force | Copy-Item -Destination $webFolder -Recurse -Force

New-Item -ItemType Directory -Path (Join-Path $apiFolder "server") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $serverFolder "index.cjs") -Destination (Join-Path $apiFolder "server\index.cjs") -Force
if (Test-Path -LiteralPath (Join-Path $serverFolder "schema.mysql.sql")) {
  Copy-Item -LiteralPath (Join-Path $serverFolder "schema.mysql.sql") -Destination (Join-Path $apiFolder "server\schema.mysql.sql") -Force
}

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
    "mysql2": "^3.11.5"
  }
}
'@ | Set-Content -LiteralPath (Join-Path $apiFolder "package.json") -Encoding UTF8

@'
CDR Dashboard Namecheap Upload Package

WEB FRONTEND
Remote folder:
  public_html/cdr

Upload the CONTENTS of:
  UPLOAD_TO_public_html_cdr

Expected remote result:
  public_html/cdr/index.html
  public_html/cdr/config.js
  public_html/cdr/assets/...
  public_html/cdr/Samples/...
  public_html/cdr/.htaccess

Important:
  Delete the old public_html/cdr/assets folder before uploading a new build.

API BACKEND
Remote folder:
  /home/hitham/api-cdr

Upload the CONTENTS of:
  UPLOAD_TO_api-cdr

Expected remote result:
  /home/hitham/api-cdr/package.json
  /home/hitham/api-cdr/server/index.cjs
  /home/hitham/api-cdr/server/schema.mysql.sql

cPanel Node.js App:
  Application URL: api.cdr.hitham.app
  Application root: api-cdr
  Startup file: server/index.cjs
  Mode: Production

Required environment variables:
  MYSQL_HOST=localhost
  MYSQL_PORT=3306
  MYSQL_USER=hitham_hitham
  MYSQL_PASSWORD=<your database password>
  MYSQL_DATABASE=hitham_cdr_dashboard
  MYSQL_CONNECTION_LIMIT=5
  CDR_SKIP_CREATE_DATABASE=1
  CDR_ALLOWED_ORIGIN=https://cdr.hitham.app
  CDR_SESSION_SECRET=<long random secret>
  CDR_DISABLE_LOCAL_REPORT_API=1
  NODE_ENV=production

After API upload:
  Run NPM Install in cPanel.
  Restart the Node.js app.
  Test https://api.cdr.hitham.app/api/health

After web upload:
  Test https://cdr.hitham.app/?refresh=latest
'@ | Set-Content -LiteralPath (Join-Path $readyRoot "README_UPLOAD.txt") -Encoding UTF8

Compress-Archive -Path (Join-Path $webFolder "*") -DestinationPath $webZip -Force
Compress-Archive -Path (Join-Path $apiFolder "*") -DestinationPath $apiZip -Force

Write-Host "Namecheap upload package ready:"
Write-Host "  $readyRoot"
Write-Host "  $webFolder"
Write-Host "  $apiFolder"
Write-Host "  $webZip"
Write-Host "  $apiZip"
