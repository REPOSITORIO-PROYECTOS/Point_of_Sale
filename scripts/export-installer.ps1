# Genera el instalador Windows NSIS (un clic para el usuario final).
#
# Un solo comando desde la raíz del repo:
#   npm run installer
#
# Salida: exports\Point-of-Sale-Setup.exe  (doble clic = instala y abre el POS)
#
# Opciones:
#   -SkipBuild     Reusa el último build en desktop/release (rápido si no cambió código)
#   -Portable      Carpeta win-unpacked sin NSIS (~5 min, para pruebas)
#   -Fiscal         Incluye afip-service.exe
#   -Zip            Además crea un .zip con el instalador (para enviar por mail)
#   -WithDbSetup    Scripts opcionales de init BD sin el repo

param(
    [switch]$SkipBuild,
    [switch]$Fiscal,
    [switch]$Portable,
    [switch]$Zip,
    [switch]$WithDbSetup
)

$ErrorActionPreference = 'Stop'

# Por defecto: NSIS comprimido (un .exe para llevar a la caja).
$Nsis = -not $Portable

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopDir = Join-Path $repoRoot 'desktop'
$backendDir = Join-Path $repoRoot 'backend'
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$exportsDir = Join-Path $repoRoot 'exports'
$buildOut = if ($env:POS_BUILD_DIR) { $env:POS_BUILD_DIR } else { Join-Path $desktopDir 'release' }
$dirOnlyMode = $Portable

function Ensure-NodeEmbedded {
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
        npm run build:electron-all
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

function Invoke-EnsureEmbeddedNode {
    $ensureScript = Join-Path $repoRoot 'scripts\ensure-embedded-node.ps1'
    & $ensureScript -DesktopDir $desktopDir
    if ($LASTEXITCODE -ne 0) { throw "ensure-embedded-node falló" }
}

function Invoke-ElectronPackage {
    param([string]$OutputDir, [switch]$WithFiscal, [switch]$DirOnlyMode)

    Ensure-NodeEmbedded
    Invoke-EnsureEmbeddedNode
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
        Write-Host "Modo portable (sin NSIS)..." -ForegroundColor Yellow
    } else {
        Write-Host "Generando instalador NSIS comprimido (oneClick)..." -ForegroundColor Yellow
    }

    Write-Host "electron-builder ($config) -> $OutputDir" -ForegroundColor Cyan
    Push-Location $desktopDir
    try {
        if (-not (Test-Path (Join-Path $desktopDir 'dist\main.js'))) {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "desktop build falló" }
        }
        npx electron-builder @builderArgs
        if ($LASTEXITCODE -ne 0) { throw "electron-builder falló con código $LASTEXITCODE" }
    } finally {
        Pop-Location
    }
}

function Find-InstallerArtifacts {
    param([string]$ReleaseDir)

    $nsis = @(
        (Get-ChildItem -Path $ReleaseDir -Filter 'Point-of-Sale-Setup.exe' -File -ErrorAction SilentlyContinue),
        (Get-ChildItem -Path $ReleaseDir -Filter 'Point of Sale-*.exe' -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -notmatch 'portable' })
    ) | Where-Object { $_ } | Sort-Object LastWriteTime -Descending | Select-Object -First 1

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

    Write-Host "Publicando portable en exports..." -ForegroundColor Cyan
    try {
        New-Item -ItemType Junction -Path $dest -Target $SourceDir | Out-Null
    } catch {
        robocopy $SourceDir $dest /E /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
        if ($LASTEXITCODE -gt 7) { throw "robocopy portable falló" }
    }

    $sizeMb = [math]::Round((Get-ChildItem $SourceDir -Recurse -File -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1MB, 2)
    Write-Host ""
    Write-Host "Portable:" -ForegroundColor Green
    Write-Host "  $dest  (${sizeMb} MB descomprimido)"
}

function Write-Leeme {
    param([string]$Path, [bool]$IsNsis, [switch]$FiscalMode)

    $variant = if ($FiscalMode) { 'con AFIP fiscal' } else { 'POS local' }
    $body = if ($IsNsis) {
@"
Point of Sale — Instalador
Generado: $stamp | $variant

Doble clic en Point-of-Sale-Setup.exe → instala y abre el POS.
La base de datos se crea sola en %APPDATA%\PointOfSale\
En el primer uso, creá el usuario administrador.
"@
    } else {
@"
Point of Sale — Portable
Generado: $stamp | $variant

Ejecutá exports\Point-of-Sale-portable\Point of Sale.exe
"@
    }
    Set-Content -Path $Path -Value $body.TrimEnd() -Encoding UTF8
}

function Write-DbSetupBundle {
    param([string]$SetupDir)

    $initDbPs1 = @'
$ErrorActionPreference = 'Stop'
$appData = Join-Path $env:APPDATA 'PointOfSale'
New-Item -ItemType Directory -Force -Path $appData | Out-Null
$env:APP_DATA_DIR = $appData
Push-Location (Join-Path $PSScriptRoot 'backend-init')
npm install --omit=dev
npm run db:init
Pop-Location
Write-Host "BD en: $appData\database.sqlite" -ForegroundColor Green
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
}

# --- main ---

$sw = [System.Diagnostics.Stopwatch]::StartNew()
New-Item -ItemType Directory -Force -Path $exportsDir | Out-Null

if (-not $SkipBuild) {
    Invoke-PosBuild
    New-Item -ItemType Directory -Force -Path $buildOut | Out-Null
    Invoke-ElectronPackage -OutputDir $buildOut -WithFiscal:$Fiscal -DirOnlyMode:$dirOnlyMode
    $releaseDir = $buildOut
} else {
    $candidates = @(
        (Join-Path $desktopDir 'release'),
        $buildOut,
        (Get-ChildItem -Path $env:TEMP -Directory -Filter 'pos-build-*' -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName)
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

    if (-not $candidates) {
        throw "No hay build previo. Ejecutá: npm run installer"
    }
    $releaseDir = $candidates[0]
    Write-Host "Reusando build: $releaseDir" -ForegroundColor Yellow
}

$artifacts = Find-InstallerArtifacts -ReleaseDir $releaseDir

if ($Nsis -and -not $artifacts.NsisInstaller) {
    if ($SkipBuild) {
        throw "El build guardado no tiene NSIS (es portable). Ejecutá: npm run installer"
    }
    throw "No se generó el instalador NSIS en $releaseDir"
}

if ($Portable -and -not $artifacts.UnpackedExe) {
    throw "No se encontró win-unpacked en $releaseDir"
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
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  INSTALADOR LISTO (doble clic)" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  $setupExe"
    Write-Host "  ${setupMb} MB (comprimido NSIS)"
}

if ($Portable -and $artifacts.UnpackedDir -and (Test-Path $artifacts.UnpackedDir)) {
    Publish-PortableExport -SourceDir $artifacts.UnpackedDir
}

if ($Zip -and $artifacts.NsisInstaller) {
    $zipPath = Join-Path $exportsDir "Point-of-Sale-Setup-$stamp.zip"
    $zipStage = Join-Path $env:TEMP "pos-zip-$stamp"
    if (Test-Path $zipStage) { Remove-Item -Recurse -Force $zipStage }
    New-Item -ItemType Directory -Force -Path $zipStage | Out-Null
    Copy-Item (Join-Path $exportsDir 'Point-of-Sale-Setup.exe') (Join-Path $zipStage 'Point-of-Sale-Setup.exe') -Force
    Copy-Item $leemePath (Join-Path $zipStage 'LEEME-instalacion.txt') -Force
    tar -a -cf $zipPath -C $zipStage .
    if ($LASTEXITCODE -ne 0) { throw "tar falló" }
    $zipMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host "  ZIP: $zipPath (${zipMb} MB)"
}

$sw.Stop()
$mins = [math]::Round($sw.Elapsed.TotalMinutes, 1)
Write-Host ""
Write-Host "Tiempo total: ${mins} min" -ForegroundColor Cyan

if ($artifacts.NsisInstaller -and (Test-Path $exportsDir)) {
    Start-Process explorer.exe $exportsDir | Out-Null
}
