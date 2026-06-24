# Empaqueta el POS para llevar a otra PC.
#
# Modos (elige UNO):
#   (default)     Carpeta portable win-unpacked — RÁPIDO (~5-8 min), sin NSIS
#   -Nsis         Instalador .exe un-clic — LENTO (~10-18 min), para distribución formal
#   -Zip          Además comprime en ZIP (lento; solo si necesitás un solo archivo)
#   -WithDbSetup  Incluye scripts backend-init para init BD sin el repo
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -Nsis
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -SkipBuild
#   powershell -ExecutionPolicy Bypass -File scripts/export-installer.ps1 -Fiscal -Nsis
#
# Salida en exports/:
#   Point-of-Sale-portable/     (default)
#   Point-of-Sale-Setup.exe     (-Nsis)
#   Point_of_Sale-Setup-*.zip     (-Zip)

param(
    [switch]$SkipBuild,
    [switch]$Fiscal,
    [switch]$Nsis,
    [switch]$Zip,
    [switch]$WithDbSetup
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopDir = Join-Path $repoRoot 'desktop'
$backendDir = Join-Path $repoRoot 'backend'
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$exportsDir = Join-Path $repoRoot 'exports'
$buildOut = Join-Path $env:TEMP "pos-build-$stamp"
$dirOnlyMode = -not $Nsis

function Ensure-NodeEmbedded {
    # Opcional: solo si USE_EMBEDDED_NODE=true (legacy; por defecto el backend usa Electron como Node).
    if ($env:USE_EMBEDDED_NODE -ne 'true') { return }
    $nodeDest = Join-Path $desktopDir 'resources\nodejs\node.exe'
    if (Test-Path $nodeDest) { return }
    $nodeSrc = (Get-Command node -ErrorAction Stop).Source
    $nodeDir = Split-Path $nodeDest -Parent
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    Copy-Item $nodeSrc $nodeDest -Force
    Write-Host "Node embebido copiado a desktop/resources/nodejs/node.exe"
}

function Invoke-PosBuild {
    Write-Host "Compilando frontend, backend y desktop (paralelo)..." -ForegroundColor Cyan
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
    param([string]$OutputDir, [switch]$WithFiscal, [switch]$DirOnlyMode)

    Ensure-NodeEmbedded
    Invoke-PrepareBackendPack

    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    $config = if ($WithFiscal) {
        if ($DirOnlyMode) { 'electron-builder.pack.fiscal.yml' } else { 'electron-builder.fiscal.yml' }
    } else {
        if ($DirOnlyMode) { 'electron-builder.pack.yml' } else { 'electron-builder.yml' }
    }

    $builderArgs = @('--win', '--config', $config, "--config.directories.output=$OutputDir")
    if ($DirOnlyMode) {
        $builderArgs += '--dir'
        Write-Host "Modo rápido: carpeta win-unpacked (sin NSIS)" -ForegroundColor Yellow
    } else {
        Write-Host "Modo NSIS: comprimiendo instalador (puede tardar varios minutos)..." -ForegroundColor Yellow
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

    $unpackedExe = Join-Path $ReleaseDir 'win-unpacked\Point of Sale.exe'

    [PSCustomObject]@{
        NsisInstaller = $nsis
        UnpackedExe   = if (Test-Path $unpackedExe) { Get-Item $unpackedExe } else { $null }
        UnpackedDir   = Join-Path $ReleaseDir 'win-unpacked'
    }
}

function Publish-PortableExport {
    param([string]$SourceDir)

    $dest = Join-Path $exportsDir 'Point-of-Sale-portable'
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }

    Write-Host "Publicando carpeta portable en exports (junction, sin copiar ~200 MB)..." -ForegroundColor Cyan
    try {
        New-Item -ItemType Junction -Path $dest -Target $SourceDir | Out-Null
    } catch {
        Write-Host "Junction no disponible; copiando con robocopy..." -ForegroundColor Yellow
        robocopy $SourceDir $dest /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
        if ($LASTEXITCODE -gt 7) { throw "robocopy portable falló" }
    }

    $sizeMb = [math]::Round((Get-ChildItem $SourceDir -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host ""
    Write-Host "Portable listo (ejecutá Point of Sale.exe):" -ForegroundColor Green
    Write-Host "  $dest"
    Write-Host "  Tamaño referencia: ${sizeMb} MB"
    Write-Host "  Origen build:      $SourceDir"
}

function Write-Leeme {
    param([string]$Path, [bool]$IsNsis, [switch]$FiscalMode)

    $variant = if ($FiscalMode) { 'con AFIP fiscal embebido' } else { 'sin AFIP embebido (solo POS local)' }
    $body = if ($IsNsis) {
@"
Point of Sale — Instalador NSIS
Generado: $stamp
Variante: $variant

1. Ejecutá Point-of-Sale-Setup.exe (doble clic).
2. Al terminar, el POS crea la base en %APPDATA%\PointOfSale\.
3. Creá el usuario administrador en el primer uso.

Datos: %APPDATA%\PointOfSale\
Requisitos: Windows 10/11 64 bits
"@
    } else {
@"
Point of Sale — Portable (carpeta)
Generado: $stamp
Variante: $variant

1. Abrí exports\Point-of-Sale-portable\Point of Sale.exe
2. Si es la primera vez en esta PC, inicializá la BD:
   cd backend (desde el repo) o usá setup con -WithDbSetup
   `$env:APP_DATA_DIR = "`$env:APPDATA\PointOfSale"; npm run db:init

Datos: %APPDATA%\PointOfSale\
Requisitos: Windows 10/11 64 bits
"@
    }
    Set-Content -Path $Path -Value $body.TrimEnd() -Encoding UTF8
}

function Write-DbSetupBundle {
    param([string]$SetupDir)

    $initDbPs1 = @'
# Inicializa la base de datos en %APPDATA%\PointOfSale (ejecutar UNA vez antes del primer uso).
$ErrorActionPreference = 'Stop'
$appData = Join-Path $env:APPDATA 'PointOfSale'
New-Item -ItemType Directory -Force -Path $appData | Out-Null
$env:APP_DATA_DIR = $appData

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "Node.js no está en PATH. Instalá Node 20+." -ForegroundColor Yellow
    exit 1
}

Push-Location (Join-Path $PSScriptRoot 'backend-init')
npm install --omit=dev
npm run db:init
Pop-Location

Write-Host "Listo. Base de datos en: $appData\database.sqlite" -ForegroundColor Green
'@

    New-Item -ItemType Directory -Force -Path $SetupDir | Out-Null
    Set-Content -Path (Join-Path $SetupDir 'inicializar-base-datos.ps1') -Value $initDbPs1 -Encoding UTF8

    $dbSetupBackend = Join-Path $SetupDir 'backend-init'
    New-Item -ItemType Directory -Force -Path $dbSetupBackend | Out-Null
    robocopy $backendDir $dbSetupBackend /E /XD node_modules storage dist .pack-staging /XF .env database.sqlite `
        /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    if ($LASTEXITCODE -gt 7) { throw "robocopy backend-init falló" }
    if (Test-Path (Join-Path $backendDir 'dist')) {
        robocopy (Join-Path $backendDir 'dist') (Join-Path $dbSetupBackend 'dist') /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    }
    Copy-Item (Join-Path $backendDir 'package.json') (Join-Path $dbSetupBackend 'package.json') -Force
    Copy-Item (Join-Path $backendDir 'package-lock.json') (Join-Path $dbSetupBackend 'package-lock.json') -Force -ErrorAction SilentlyContinue
    Write-Host "Scripts de init BD en: $SetupDir"
}

# --- main ---

New-Item -ItemType Directory -Force -Path $exportsDir | Out-Null

if (-not $SkipBuild) {
    Invoke-PosBuild
    if (Test-Path $buildOut) {
        try { Remove-Item -Recurse -Force $buildOut -ErrorAction Stop }
        catch { Write-Host "No se pudo limpiar $buildOut; usando carpeta nueva." -ForegroundColor Yellow }
    }
    New-Item -ItemType Directory -Force -Path $buildOut | Out-Null
    Invoke-ElectronPackage -OutputDir $buildOut -WithFiscal:$Fiscal -DirOnlyMode:$dirOnlyMode
    $releaseDir = $buildOut
} else {
    $candidates = @(
        (Get-ChildItem -Path $env:TEMP -Directory -Filter 'pos-build-*' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName),
        'C:\Temp\pos-build',
        (Join-Path $desktopDir 'release')
    ) | Where-Object { $_ -and (Test-Path $_) }

    if (-not $candidates) {
        throw "No hay build previo. Ejecutá sin -SkipBuild."
    }
    $releaseDir = $candidates[0]
    Write-Host "Usando build existente: $releaseDir" -ForegroundColor Yellow
}

$artifacts = Find-InstallerArtifacts -ReleaseDir $releaseDir
if (-not $artifacts.NsisInstaller -and -not $artifacts.UnpackedExe) {
    throw "No se encontró instalador ni win-unpacked en $releaseDir."
}

$leemePath = Join-Path $exportsDir 'LEEME-instalacion.txt'
Write-Leeme -Path $leemePath -IsNsis:$Nsis -FiscalMode:$Fiscal

if ($WithDbSetup) {
    Write-DbSetupBundle -SetupDir (Join-Path $exportsDir 'setup-db')
}

if ($artifacts.NsisInstaller) {
    $setupExe = Join-Path $exportsDir 'Point-of-Sale-Setup.exe'
    Copy-Item $artifacts.NsisInstaller.FullName $setupExe -Force
    $setupMb = [math]::Round((Get-Item $setupExe).Length / 1MB, 2)
    Write-Host ""
    Write-Host "Instalador NSIS listo:" -ForegroundColor Green
    Write-Host "  $setupExe"
    Write-Host "  Tamaño: ${setupMb} MB"
}

if ($dirOnlyMode -and $artifacts.UnpackedDir -and (Test-Path $artifacts.UnpackedDir)) {
    Publish-PortableExport -SourceDir $artifacts.UnpackedDir
}

if ($Zip) {
    $zipPath = Join-Path $exportsDir "Point_of_Sale-Setup-$stamp.zip"
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

    if ($artifacts.NsisInstaller) {
        Write-Host "Comprimiendo solo el instalador NSIS..." -ForegroundColor Cyan
        $zipStage = Join-Path $env:TEMP "pos-zip-$stamp"
        if (Test-Path $zipStage) { Remove-Item -Recurse -Force $zipStage }
        New-Item -ItemType Directory -Force -Path $zipStage | Out-Null
        Copy-Item (Join-Path $exportsDir 'Point-of-Sale-Setup.exe') (Join-Path $zipStage 'Point-of-Sale-Setup.exe') -Force
        Copy-Item $leemePath (Join-Path $zipStage 'LEEME-instalacion.txt') -Force
        if ($WithDbSetup) {
            robocopy (Join-Path $exportsDir 'setup-db') (Join-Path $zipStage 'setup-db') /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
        }
        tar -a -cf $zipPath -C $zipStage .
    } elseif ($artifacts.UnpackedDir) {
        Write-Host "Comprimiendo carpeta portable (varios minutos)..." -ForegroundColor Cyan
        tar -a -cf $zipPath -C (Split-Path $artifacts.UnpackedDir -Parent) (Split-Path $artifacts.UnpackedDir -Leaf)
    }

    if ($LASTEXITCODE -ne 0) { throw "tar falló al crear ZIP" }
    $zipMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "ZIP: $zipPath (${zipMb} MB)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo. Modo: $(if ($Nsis) { 'NSIS' } else { 'portable rápido' })$(if ($Zip) { ' + ZIP' } else { '' })" -ForegroundColor Green
