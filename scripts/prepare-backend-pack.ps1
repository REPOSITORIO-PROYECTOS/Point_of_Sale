# Staging del backend solo con dependencias de producción para empaquetar el .exe.
# Salida: backend/.pack-staging/{dist,package.json,node_modules}

param(
    [string]$BackendDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'backend')
)

$ErrorActionPreference = 'Stop'

$stagingDir = Join-Path $BackendDir '.pack-staging'

if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

$distSrc = Join-Path $BackendDir 'dist'
if (-not (Test-Path $distSrc)) {
    throw "Falta backend/dist. Ejecutá npm run build:api primero."
}

Copy-Item (Join-Path $BackendDir 'package.json') (Join-Path $stagingDir 'package.json') -Force
$lockFile = Join-Path $BackendDir 'package-lock.json'
if (Test-Path $lockFile) {
    Copy-Item $lockFile (Join-Path $stagingDir 'package-lock.json') -Force
}

robocopy $distSrc (Join-Path $stagingDir 'dist') /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "robocopy dist falló" }

Write-Host "Instalando dependencias de producción en .pack-staging..." -ForegroundColor Cyan
Push-Location $stagingDir
try {
    npm ci --omit=dev
    if ($LASTEXITCODE -ne 0) { throw "npm ci --omit=dev falló con código $LASTEXITCODE" }
} finally {
    Pop-Location
}

Write-Host "Backend pack listo: $stagingDir" -ForegroundColor Green
