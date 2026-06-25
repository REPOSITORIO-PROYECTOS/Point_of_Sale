# Publica instalador Windows en GitHub Releases (auto-update en cajas).
#
# Token: backend/.env → GITHUB_TOKEN (ya configurado) o .env.publish → GH_TOKEN
#
#   npm run publish:win
#   npm run publish:win:fiscal

param(
    [switch]$Fiscal
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'load-publish-env.ps1')
Import-PublishEnv

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopDir = Join-Path $repoRoot 'desktop'

function Ensure-NodeEmbedded {
    $nodeDest = Join-Path $desktopDir 'resources\nodejs\node.exe'
    if (Test-Path $nodeDest) {
        return
    }

    $nodeSrc = (Get-Command node -ErrorAction Stop).Source
    $nodeDir = Split-Path $nodeDest -Parent
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    Copy-Item $nodeSrc $nodeDest -Force
    Write-Host "Node embebido copiado a desktop/resources/nodejs/node.exe" -ForegroundColor Cyan
}

$variant = if ($Fiscal) { 'fiscal' } else { 'standard' }
Write-Host "Publicando instalador $variant en GitHub Releases..." -ForegroundColor Green
Write-Host "Token: cargado desde backend/.env o .env.publish" -ForegroundColor DarkGray

Ensure-NodeEmbedded

Push-Location $repoRoot
try {
    if ($Fiscal) {
        npm run dist:win:fiscal:publish
    } else {
        npm run dist:win:publish
    }

    if ($LASTEXITCODE -ne 0) {
        throw "publish fallo con codigo $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Release publicado. Las cajas con .exe pueden usar Buscar actualizacion." -ForegroundColor Green
