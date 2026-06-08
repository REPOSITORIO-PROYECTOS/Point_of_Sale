#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceDir = Join-Path $Root "source"
$DistDir = Join-Path $Root "dist"

Write-Host "== AFIP sidecar build =="

if (-not (Test-Path $SourceDir)) {
  Write-Host "Clonando servicio_afip en source/ ..."
  git clone --depth 1 https://github.com/REPOSITORIO-PROYECTOS/servicio_afip.git $SourceDir
}

$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {
  throw "Python 3.11+ requerido. Instalalo y reintentá."
}

Push-Location $SourceDir
try {
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt pyinstaller

  python -m PyInstaller `
    --noconfirm `
    --onefile `
    --name afip-service `
    --add-data "gunicorn_conf.py;." `
    --hidden-import gunicorn `
    wsgi.py

  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  Copy-Item (Join-Path $SourceDir "dist/afip-service.exe") (Join-Path $DistDir "afip-service.exe") -Force
  Write-Host "Sidecar generado: $DistDir\afip-service.exe"
}
finally {
  Pop-Location
}
