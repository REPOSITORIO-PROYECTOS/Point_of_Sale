# Empaqueta el instalador Windows del POS (win-unpacked + LEEME; opcional NSIS/portable).
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -SkipBuild
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -Fiscal
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -Installers
#
# Por defecto usa electron-builder --dir (rápido). -Installers genera NSIS + portable.
# Salida: exports/Point_of_Sale-Setup-YYYYMMDD-HHmmss.zip

param(
    [switch]$SkipBuild,
    [switch]$Fiscal,
    [switch]$Installers
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopDir = Join-Path $repoRoot 'desktop'
$backendDir = Join-Path $repoRoot 'backend'
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$exportName = "Point_of_Sale-Setup-$stamp"
$exportsDir = Join-Path $repoRoot 'exports'
$bundleDir = Join-Path $exportsDir $exportName
$zipPath = Join-Path $exportsDir "$exportName.zip"
$buildOut = Join-Path $env:TEMP "pos-build-$stamp"

function Ensure-NodeEmbedded {
    $nodeDest = Join-Path $desktopDir 'resources\nodejs\node.exe'
    if (Test-Path $nodeDest) { return }
    $nodeSrc = (Get-Command node -ErrorAction Stop).Source
    $nodeDir = Split-Path $nodeDest -Parent
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    Copy-Item $nodeSrc $nodeDest -Force
    Write-Host "Node embebido copiado a desktop/resources/nodejs/node.exe"
}

function Invoke-PosBuild {
    Write-Host "Compilando frontend, backend y desktop..." -ForegroundColor Cyan
    Push-Location $repoRoot
    try {
        npm run build:all
        if ($LASTEXITCODE -ne 0) { throw "build:all falló con código $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

function Invoke-PrepareBackendPack {
    $packScript = Join-Path $repoRoot 'scripts\prepare-backend-pack.ps1'
    & $packScript -BackendDir $backendDir
    if ($LASTEXITCODE -ne 0) { throw "prepare-backend-pack falló" }
}

function Invoke-ElectronPackage {
    param([string]$OutputDir, [switch]$WithFiscal, [switch]$WithInstallers)

    Ensure-NodeEmbedded
    Invoke-PrepareBackendPack

    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $config = if ($WithFiscal) {
        if ($WithInstallers) { 'electron-builder.fiscal.yml' } else { 'electron-builder.pack.fiscal.yml' }
    } else {
        if ($WithInstallers) { 'electron-builder.yml' } else { 'electron-builder.pack.yml' }
    }

    $builderArgs = @('--win', '--config', $config, "--config.directories.output=$OutputDir")
    if (-not $WithInstallers) {
        $builderArgs += '--dir'
    }

    Write-Host "Empaquetando con electron-builder ($config) -> $OutputDir" -ForegroundColor Cyan
    Push-Location $desktopDir
    try {
        npx electron-builder @builderArgs
        if ($LASTEXITCODE -ne 0) { throw "electron-builder falló con código $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

function Find-InstallerArtifacts {
    param([string]$ReleaseDir)

    $nsis = Get-ChildItem -Path $ReleaseDir -Filter 'Point of Sale-*.exe' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch 'portable' } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $portable = Get-ChildItem -Path $ReleaseDir -Filter '*-portable.exe' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    $unpackedExe = Join-Path $ReleaseDir 'win-unpacked\Point of Sale.exe'

    [PSCustomObject]@{
        NsisInstaller = $nsis
        PortableExe   = $portable
        UnpackedExe   = if (Test-Path $unpackedExe) { Get-Item $unpackedExe } else { $null }
        UnpackedDir   = Join-Path $ReleaseDir 'win-unpacked'
    }
}

# --- main ---

New-Item -ItemType Directory -Force -Path $exportsDir | Out-Null
if (Test-Path $bundleDir) { Remove-Item -Recurse -Force $bundleDir }
New-Item -ItemType Directory -Force -Path $bundleDir | Out-Null

if (-not $SkipBuild) {
    Invoke-PosBuild
    if (Test-Path $buildOut) {
        try { Remove-Item -Recurse -Force $buildOut -ErrorAction Stop }
        catch { Write-Host "No se pudo limpiar $buildOut (archivos en uso); usando carpeta nueva." -ForegroundColor Yellow }
    }
    if (-not (Test-Path $buildOut)) {
        New-Item -ItemType Directory -Force -Path $buildOut | Out-Null
    }
    Invoke-ElectronPackage -OutputDir $buildOut -WithFiscal:$Fiscal -WithInstallers:$Installers
    $releaseDir = $buildOut
} else {
    $candidates = @(
        (Get-ChildItem -Path $env:TEMP -Directory -Filter 'pos-build-*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName),
        'C:\Temp\pos-build',
        (Join-Path $desktopDir 'release')
    ) | Where-Object { $_ -and (Test-Path $_) }

    if (-not $candidates) {
        throw "No hay build previo. Ejecutá sin -SkipBuild o corré npm run dist:win"
    }
    $releaseDir = $candidates[0]
    Write-Host "Usando build existente: $releaseDir" -ForegroundColor Yellow
}

$artifacts = Find-InstallerArtifacts -ReleaseDir $releaseDir

if (-not $artifacts.NsisInstaller -and -not $artifacts.PortableExe -and -not $artifacts.UnpackedExe) {
    throw "No se encontró instalador ni win-unpacked en $releaseDir. Corré el build completo."
}

$installDir = Join-Path $bundleDir 'instalador'
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

if ($artifacts.NsisInstaller) {
    Copy-Item $artifacts.NsisInstaller.FullName (Join-Path $installDir $artifacts.NsisInstaller.Name)
    Write-Host "Incluido: $($artifacts.NsisInstaller.Name)"
}
if ($artifacts.PortableExe) {
    Copy-Item $artifacts.PortableExe.FullName (Join-Path $installDir $artifacts.PortableExe.Name)
    Write-Host "Incluido: $($artifacts.PortableExe.Name)"
}
if (-not $artifacts.NsisInstaller -and $artifacts.UnpackedDir -and (Test-Path $artifacts.UnpackedDir)) {
    $portableBundle = Join-Path $installDir 'Point-of-Sale-portable'
    robocopy $artifacts.UnpackedDir $portableBundle /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy portable falló" }
    Write-Host "Incluido: carpeta portable (win-unpacked)"
}

# Script de init BD para la PC destino (sin requerir repo)
$initDbPs1 = @'
# Inicializa la base de datos en %APPDATA%\PointOfSale (ejecutar UNA vez antes del primer uso).
$ErrorActionPreference = 'Stop'
$appData = Join-Path $env:APPDATA 'PointOfSale'
New-Item -ItemType Directory -Force -Path $appData | Out-Null
$env:APP_DATA_DIR = $appData

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js no está en PATH. Instalá Node 20+ o usá el instalador NSIS del POS." -ForegroundColor Yellow
    exit 1
}

$initScript = Join-Path $PSScriptRoot 'init-db-standalone.mjs'
if (-not (Test-Path $initScript)) {
    Write-Host "Falta init-db-standalone.mjs en esta carpeta." -ForegroundColor Red
    exit 1
}

Push-Location (Split-Path $initScript -Parent)
node $initScript
Pop-Location

Write-Host ""
Write-Host "Listo. Base de datos en: $appData\database.sqlite" -ForegroundColor Green
Write-Host "Ahora ejecutá el instalador Point of Sale-*.exe" -ForegroundColor Green
'@

$initDbMjs = @'
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const appDataDir = process.env.APP_DATA_DIR || join(process.env.APPDATA || '', 'PointOfSale');
mkdirSync(appDataDir, { recursive: true });

const repoBackend = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'backend');
const installedBackend = join(process.env.LOCALAPPDATA || '', 'Programs', 'point-of-sale-desktop', 'resources', 'backend');

let backendDir = repoBackend;
if (!existsSync(join(backendDir, 'package.json')) && existsSync(join(installedBackend, 'package.json'))) {
  backendDir = installedBackend;
}

const result = spawnSync('npm', ['run', 'db:init'], {
  cwd: backendDir,
  env: { ...process.env, APP_DATA_DIR: appDataDir },
  stdio: 'inherit',
  shell: true,
});

process.exit(result.status ?? 1);
'@

# Versión simplificada: copiar solo el script del backend si existe dist
$backendInitAvailable = Test-Path (Join-Path $backendDir 'package.json')
$setupDir = Join-Path $bundleDir 'setup'
New-Item -ItemType Directory -Force -Path $setupDir | Out-Null
Set-Content -Path (Join-Path $setupDir 'inicializar-base-datos.ps1') -Value $initDbPs1 -Encoding UTF8

if ($backendInitAvailable) {
    # Copiar mínimo para db:init offline en máquina con Node
    $dbSetupBackend = Join-Path $setupDir 'backend-init'
    New-Item -ItemType Directory -Force -Path $dbSetupBackend | Out-Null
    robocopy $backendDir $dbSetupBackend /E /XD node_modules storage dist /XF .env database.sqlite `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy backend-init falló" }
    # Incluir dist compilado para no requerir build en destino
    if (Test-Path (Join-Path $backendDir 'dist')) {
        robocopy (Join-Path $backendDir 'dist') (Join-Path $dbSetupBackend 'dist') /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    }
    Copy-Item (Join-Path $backendDir 'package.json') (Join-Path $dbSetupBackend 'package.json') -Force
    Copy-Item (Join-Path $backendDir 'package-lock.json') (Join-Path $dbSetupBackend 'package-lock.json') -Force -ErrorAction SilentlyContinue
}

$variant = if ($Fiscal) { 'con AFIP fiscal embebido' } else { 'sin AFIP embebido (solo POS local)' }
$hasNsis = [bool]$artifacts.NsisInstaller
$hasPortable = [bool]$artifacts.PortableExe

$leeme = @"
Point of Sale — Paquete de instalación
Generado: $stamp
Variante: $variant

CONTENIDO
---------
instalador/     Ejecutables para instalar o correr el POS
setup/          Scripts de primera configuración

INSTALACIÓN (PC nueva)
----------------------
1. Descomprimí este ZIP en cualquier carpeta.

2. Inicializar base de datos (UNA vez, antes del primer uso):
   - Opción A — con Node.js 20+ instalado en la PC:
     Abrir PowerShell en setup\ y ejecutar:
       `$env:APP_DATA_DIR = "`$env:APPDATA\PointOfSale"
       cd backend-init
       npm install --omit=dev
       npm run db:init
   - Opción B — desde el repo de desarrollo (si lo tenés):
       cd backend
       `$env:APP_DATA_DIR = "`$env:APPDATA\PointOfSale"
       npm run db:init

3. Instalar la aplicación:
$(if ($hasNsis) { "   - Ejecutar instalador\Point of Sale-0.0.1-win-x64.exe (recomendado)" } else { "   - Usar la carpeta instalador\Point-of-Sale-portable\" })
$(if ($hasPortable) { "   - O ejecutar instalador\Point of Sale-0.0.1-portable.exe (sin instalación)" } else { "" })

4. Al abrir por primera vez, crear usuario administrador desde la pantalla de setup.

DATOS
-----
La base de datos y configuración quedan en:
  %APPDATA%\PointOfSale\

REQUISITOS
----------
- Windows 10/11 64 bits
$(if (-not $Fiscal) { "- Para facturación AFIP: usar variante fiscal o Docker en desarrollo" } else { "- AFIP: copiar user.crt y user.key a %APPDATA%\PointOfSale\afip\" })

SOPORTE / DEV
-------------
Documentación completa en el repositorio: docs/casos-de-uso/05-build-instalador.md
"@

Set-Content -Path (Join-Path $bundleDir 'LEEME.txt') -Value $leeme.TrimEnd() -Encoding UTF8

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path $bundleDir -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "Paquete de instalación listo:" -ForegroundColor Green
Write-Host "  Carpeta: $bundleDir"
Write-Host "  ZIP:     $zipPath"
$zipSizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "  Tamaño:  ${zipSizeMb} MB"
