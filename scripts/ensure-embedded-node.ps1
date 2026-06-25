# Copia node.exe al bundle de Electron si no está embebido.
# Por defecto el backend empaquetado usa node.exe (módulos nativos de npm ci).
# Con POS_USE_ELECTRON_AS_NODE=true se omite (requiere electron-rebuild en prepare-backend-pack).

param(
    [string]$DesktopDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'desktop')
)

$ErrorActionPreference = 'Stop'

if ($env:POS_USE_ELECTRON_AS_NODE -eq 'true') {
    Write-Host "POS_USE_ELECTRON_AS_NODE=true: backend usará Electron como Node (sin node.exe embebido)." -ForegroundColor Yellow
    exit 0
}

$nodeDestDir = Join-Path $DesktopDir 'resources\nodejs'
$nodeDest = Join-Path $nodeDestDir 'node.exe'

if (Test-Path $nodeDest) {
    Write-Host "node.exe embebido ya presente: $nodeDest" -ForegroundColor Green
    exit 0
}

$nodeSrc = (Get-Command node -ErrorAction Stop).Source
New-Item -ItemType Directory -Force -Path $nodeDestDir | Out-Null
Copy-Item $nodeSrc $nodeDest -Force
Write-Host "node.exe copiado a desktop/resources/nodejs/ (desde $nodeSrc)" -ForegroundColor Green
