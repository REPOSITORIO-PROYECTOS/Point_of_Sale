# Despliega updater.env en cada caja para auto-actualización desde GitHub Releases.
#
# Uso:
#   .\scripts\deploy-updater-config.ps1 -Public
#   .\scripts\deploy-updater-config.ps1 -Token ghp_xxxxxxxx
#   .\scripts\deploy-updater-config.ps1 -Disable
#   .\scripts\deploy-updater-config.ps1 -Token ghp_xxx -AppDataDir "D:\Datos\PointOfSale"

param(
    [string]$Token,
    [switch]$Public,
    [switch]$Disable,
    [string]$AppDataDir = (Join-Path $env:APPDATA 'PointOfSale')
)

$ErrorActionPreference = 'Stop'

if (-not $Disable -and -not $Public -and -not $Token) {
    throw @"
Indicá una opción:
  -Public   repo público en GitHub (sin PAT en la caja)
  -Token    repo privado con PAT de lectura
  -Disable  desactivar actualizaciones

Ejemplos:
  .\scripts\deploy-updater-config.ps1 -Public
  .\scripts\deploy-updater-config.ps1 -Token ghp_tu_pat_solo_lectura
"@
}

New-Item -ItemType Directory -Force -Path $AppDataDir | Out-Null

$targetPath = Join-Path $AppDataDir 'updater.env'
$lines = @(
    '# Generado por scripts/deploy-updater-config.ps1'
    "# Ruta: $targetPath"
    '# No commitear este archivo.'
)

if ($Disable) {
    $lines += 'POS_DISABLE_AUTO_UPDATE=true'
} elseif ($Public) {
    $lines += 'POS_UPDATER_PUBLIC_REPO=true'
} else {
    $lines += 'POS_UPDATER_PUBLIC_REPO=false'
    $lines += "GH_UPDATER_TOKEN=$Token"
}

Set-Content -Path $targetPath -Value ($lines -join "`n") -Encoding UTF8

[System.Environment]::SetEnvironmentVariable('POS_DISABLE_AUTO_UPDATE', $null, 'User')
if ($Public -or $Disable) {
    [System.Environment]::SetEnvironmentVariable('GH_UPDATER_TOKEN', $null, 'User')
}

Write-Host ""
Write-Host "updater.env escrito en:" -ForegroundColor Green
Write-Host "  $targetPath"
Write-Host ""
Write-Host "Checklist:" -ForegroundColor Cyan
Write-Host "  1. Reiniciá Point of Sale (cerrar y abrir el .exe)"
Write-Host "  2. En el footer, clic en 'Buscar actualizacion'"
if ($Disable) {
    Write-Host "  3. No deberia aparecer banner de error (actualizaciones deshabilitadas)"
} elseif ($Public) {
    Write-Host "  3. Deberia comprobar GitHub Releases sin token (repo publico)"
} else {
    Write-Host "  3. Deberia comprobar GitHub Releases con el PAT configurado"
}
Write-Host ""
