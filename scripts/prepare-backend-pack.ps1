# Staging del backend solo con dependencias de producción para empaquetar el .exe.
# Salida: backend/.pack-staging/{dist,package.json,node_modules}
# Reutiliza el staging si package-lock.json, dist o Electron no cambiaron (-Force para regenerar).

param(
    [string]$BackendDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..')).Path 'backend'),
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$desktopDir = Join-Path $repoRoot 'desktop'
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

function Get-ElectronVersion {
    $desktopPkgPath = Join-Path $desktopDir 'package.json'
    if (-not (Test-Path $desktopPkgPath)) {
        throw "Falta desktop/package.json"
    }
    $desktopPkg = Get-Content $desktopPkgPath -Raw | ConvertFrom-Json
    $raw = $desktopPkg.devDependencies.electron
    if (-not $raw) {
        throw "desktop/package.json no declara devDependencies.electron"
    }
    return ($raw -replace '[^\d.]', '')
}

function Ensure-LicensePublicKey {
    param([string]$DistDir)

    $dst = Join-Path $DistDir 'license\keys\license-public.pem'
    if (Test-Path $dst) { return }

    $src = Join-Path $BackendDir 'src\license\keys\license-public.pem'
    if (-not (Test-Path $src)) {
        throw @"
Falta license-public.pem en backend/dist y en backend/src/license/keys/.
Necesario para producción. Ejecutá npm run build:api (postbuild copia la clave).
"@
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $dst -Parent) | Out-Null
    Copy-Item $src $dst -Force
    Write-Host "Copiado license-public.pem a dist (fallback)" -ForegroundColor Yellow
}

function Invoke-ElectronNativeRebuild {
    param([string]$ModuleDir, [string]$ElectronVersion)

    $rebuildCli = Join-Path $desktopDir 'node_modules\@electron\rebuild\lib\cli.js'
    if (-not (Test-Path $rebuildCli)) {
        throw "Falta @electron/rebuild en desktop. Ejecutá: npm install --prefix desktop"
    }

    Write-Host "Recompilando sqlite3 para Electron $ElectronVersion..." -ForegroundColor Cyan
    Push-Location $ModuleDir
    try {
        & node $rebuildCli --version=$ElectronVersion --force --only=sqlite3
        if ($LASTEXITCODE -ne 0) {
            throw @"
electron-rebuild falló (código $LASTEXITCODE).
Instalá Visual Studio Build Tools (Desktop development with C++) y volvé a ejecutar:
  npm run prepare:backend-pack -- -Force
"@
        }
    } finally {
        Pop-Location
    }
}

function Assert-NativeModules {
    param([string]$ModuleDir)

    $sqliteNode = Join-Path $ModuleDir 'node_modules\sqlite3\build\Release\node_sqlite3.node'
    $bcryptNode = Join-Path $ModuleDir 'node_modules\bcrypt\prebuilds\win32-x64\bcrypt.node'

    if (-not (Test-Path $sqliteNode)) {
        throw "Falta node_sqlite3.node tras electron-rebuild: $sqliteNode"
    }
    if (-not (Test-Path $bcryptNode)) {
        throw "Falta bcrypt.node (win32-x64) tras electron-rebuild: $bcryptNode"
    }
}

function Get-PackFingerprint {
    param([string]$ElectronVersion)

    $lockHash = if (Test-Path $lockFile) {
        Get-Sha256Hex $lockFile
    } else {
        Get-Sha256Hex (Join-Path $BackendDir 'package.json')
    }

    $latestDist = Get-ChildItem -Path $distSrc -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    $distStamp = if ($latestDist) { $latestDist.LastWriteTimeUtc.Ticks } else { '0' }
    $runtimeMode = if ($env:POS_USE_ELECTRON_AS_NODE -eq 'true') { 'electron-node' } else { 'embedded-node' }
    return "$lockHash|$distStamp|electron:$ElectronVersion|$runtimeMode"
}

$electronVersion = Get-ElectronVersion
$fingerprint = Get-PackFingerprint -ElectronVersion $electronVersion
$stagingReady = (Test-Path $hashFile) -and
    (Test-Path (Join-Path $stagingDir 'node_modules')) -and
    (Test-Path (Join-Path $stagingDir 'dist\license\keys\license-public.pem')) -and
    (Test-Path (Join-Path $stagingDir 'node_modules\sqlite3\build\Release\node_sqlite3.node')) -and
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

Ensure-LicensePublicKey -DistDir (Join-Path $stagingDir 'dist')

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

if ($env:POS_USE_ELECTRON_AS_NODE -eq 'true') {
    Invoke-ElectronNativeRebuild -ModuleDir $stagingDir -ElectronVersion $electronVersion
} else {
    Write-Host "Modo node.exe embebido: omitiendo electron-rebuild (módulos nativos para Node del sistema)." -ForegroundColor Cyan
}

Assert-NativeModules -ModuleDir $stagingDir

Set-Content -Path $hashFile -Value $fingerprint -Encoding ASCII -NoNewline
Write-Host "Backend pack listo: $stagingDir" -ForegroundColor Green