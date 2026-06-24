# Staging del backend solo con dependencias de producción para empaquetar el .exe.
# Salida: backend/.pack-staging/{dist,package.json,node_modules}
# Reutiliza el staging si package-lock.json y dist no cambiaron (-Force para regenerar).

param(
    [string]$BackendDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'backend'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$stagingDir = Join-Path $BackendDir '.pack-staging'
$hashFile = Join-Path $stagingDir '.pack-fingerprint'
$distSrc = Join-Path $BackendDir 'dist'
$lockFile = Join-Path $BackendDir 'package-lock.json'

if (-not (Test-Path $distSrc)) {
    throw "Falta backend/dist. Ejecutá npm run build:api primero."
}

function Get-Sha256Hex {
    param([string]$Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $stream = [System.IO.File]::OpenRead($Path)
        try {
            $bytes = $sha.ComputeHash($stream)
        } finally {
            $stream.Close()
        }
        return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
    } finally {
        $sha.Dispose()
    }
}

function Get-PackFingerprint {
    $lockHash = if (Test-Path $lockFile) {
        Get-Sha256Hex $lockFile
    } else {
        Get-Sha256Hex (Join-Path $BackendDir 'package.json')
    }

    $latestDist = Get-ChildItem -Path $distSrc -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    $distStamp = if ($latestDist) { $latestDist.LastWriteTimeUtc.Ticks } else { '0' }
    return "$lockHash|$distStamp"
}

$fingerprint = Get-PackFingerprint
$stagingReady = (Test-Path $hashFile) -and
    (Test-Path (Join-Path $stagingDir 'node_modules')) -and
    (Test-Path (Join-Path $stagingDir 'dist')) -and
    ((Get-Content $hashFile -Raw).Trim() -eq $fingerprint)

if ($stagingReady -and -not $Force) {
    Write-Host "Backend pack en caché (sin cambios): $stagingDir" -ForegroundColor Green
    exit 0
}

if (Test-Path $stagingDir) {
    Remove-Item -Recurse -Force $stagingDir
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

Copy-Item (Join-Path $BackendDir 'package.json') (Join-Path $stagingDir 'package.json') -Force
if (Test-Path $lockFile) {
    Copy-Item $lockFile (Join-Path $stagingDir 'package-lock.json') -Force
}

robocopy $distSrc (Join-Path $stagingDir 'dist') /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
if ($LASTEXITCODE -gt 7) { throw "robocopy dist falló" }

Write-Host "Instalando dependencias de producción en .pack-staging..." -ForegroundColor Cyan
Push-Location $stagingDir
try {
    if (Test-Path (Join-Path $stagingDir 'package-lock.json')) {
        npm ci --omit=dev
    } else {
        npm install --omit=dev
    }
    if ($LASTEXITCODE -ne 0) { throw "npm install prod falló con código $LASTEXITCODE" }
} finally {
    Pop-Location
}

Set-Content -Path $hashFile -Value $fingerprint -Encoding ASCII -NoNewline
Write-Host "Backend pack listo: $stagingDir" -ForegroundColor Green
