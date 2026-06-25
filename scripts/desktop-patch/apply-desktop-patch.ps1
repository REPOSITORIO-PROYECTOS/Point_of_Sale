# Parche portable para instalaciones desktop de Point of Sale (manual build).
# No modifica la base de datos en %APPDATA%\PointOfSale.

param(
    [string]$AppPath,
    [string]$ElectronVersion = '41.9.0'
)

$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK: $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "AVISO: $Message" -ForegroundColor Yellow
}

function Test-PortListening {
    param([int]$Port)

    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
        return $listeners.Count -gt 0
    } catch {
        $netstat = netstat -ano | Select-String ":$Port\s"
        return $null -ne $netstat
    }
}

function Test-DesktopInstallRoot {
    param([string]$Root)

    if (-not $Root) { return $false }
    $backendPkg = Join-Path $Root 'resources\backend\package.json'
    return Test-Path $backendPkg
}

function Get-DefaultAppPaths {
    return @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Point of Sale'),
        (Join-Path $env:LOCALAPPDATA 'Programs\point-of-sale-desktop')
    )
}

function Resolve-AppInstallPath {
    if ($AppPath) {
        $resolved = (Resolve-Path -LiteralPath $AppPath -ErrorAction SilentlyContinue).Path
        if (-not $resolved) {
            throw "No existe la ruta indicada: $AppPath"
        }
        if (-not (Test-DesktopInstallRoot $resolved)) {
            throw @"
La ruta no parece una instalación desktop válida (falta resources\backend\package.json):
  $resolved

Usá la carpeta que contiene 'Point of Sale.exe' o win-unpacked, por ejemplo:
  C:\Temp\pos-build\win-unpacked
"@
        }
        return $resolved
    }

    $candidates = @(Get-DefaultAppPaths | Where-Object { Test-DesktopInstallRoot $_ })

    if ($candidates.Count -eq 1) {
        Write-Ok "Instalación detectada: $($candidates[0])"
        return $candidates[0]
    }

    if ($candidates.Count -gt 1) {
        Write-Host "`nSe encontraron varias instalaciones:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $candidates.Count; $i++) {
            Write-Host "  [$i] $($candidates[$i])"
        }
        $pick = Read-Host "Elegí el número de la instalación a parchear"
        if ($pick -match '^\d+$' -and [int]$pick -ge 0 -and [int]$pick -lt $candidates.Count) {
            return $candidates[[int]$pick]
        }
        throw 'Selección inválida.'
    }

    Write-Host @"

No se detectó Point of Sale en las rutas habituales:
  $($env:LOCALAPPDATA)\Programs\Point of Sale
  $($env:LOCALAPPDATA)\Programs\point-of-sale-desktop

Indicá la carpeta de la app (win-unpacked o instalación NSIS).
"@ -ForegroundColor Yellow

    $manual = Read-Host 'Ruta completa de la carpeta de la app'
    if (-not $manual) { throw 'No se indicó ruta.' }
    $resolved = (Resolve-Path -LiteralPath $manual.Trim('"') -ErrorAction SilentlyContinue).Path
    if (-not $resolved -or -not (Test-DesktopInstallRoot $resolved)) {
        throw "Ruta inválida o sin backend empaquetado: $manual"
    }
    return $resolved
}

function Resolve-LicensePublicKeySource {
    $bundled = Join-Path $ScriptDir 'license-public.pem'
    if (Test-Path $bundled) { return $bundled }

    $repoFallback = Join-Path $ScriptDir '..\..\backend\src\license\keys\license-public.pem'
    $repoFallback = (Resolve-Path -LiteralPath $repoFallback -ErrorAction SilentlyContinue).Path
    if ($repoFallback -and (Test-Path $repoFallback)) { return $repoFallback }

    $distFallback = Join-Path $ScriptDir '..\..\backend\dist\license\keys\license-public.pem'
    $distFallback = (Resolve-Path -LiteralPath $distFallback -ErrorAction SilentlyContinue).Path
    if ($distFallback -and (Test-Path $distFallback)) { return $distFallback }

    throw "No se encontró license-public.pem junto al script ni en el repo backend."
}

function Ensure-NpmAvailable {
    $npm = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npm) {
        throw @"
Node.js / npm no están en el PATH.
Instalá Node 20+ desde https://nodejs.org y volvé a ejecutar el parche.
"@
    }
    Write-Ok "npm detectado: $($npm.Source)"
}

function Install-BackendProductionDeps {
    param([string]$BackendDir)

    Push-Location $BackendDir
    try {
        if (Test-Path (Join-Path $BackendDir 'package-lock.json')) {
            Write-Host 'Ejecutando npm ci --omit=dev...' -ForegroundColor Gray
            npm ci --omit=dev
        } else {
            Write-Host 'Ejecutando npm install --omit=dev...' -ForegroundColor Gray
            npm install --omit=dev
        }
        if ($LASTEXITCODE -ne 0) {
            throw "npm install falló con código $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
}

function Invoke-ElectronRebuild {
    param([string]$BackendDir, [string]$Version)

    Write-Host "Recompilando módulos nativos para Electron $Version (sqlite3, bcrypt)..." -ForegroundColor Gray
    Push-Location $BackendDir
    try {
        npx --yes @electron/rebuild --version=$Version --force -w sqlite3 -w bcrypt
        if ($LASTEXITCODE -ne 0) {
            throw @"
electron-rebuild falló (código $LASTEXITCODE).
Instalá Visual Studio Build Tools con 'Desktop development with C++' y reintentá.
"@
        }
    } finally {
        Pop-Location
    }
}

function Assert-NativeModules {
    param([string]$BackendDir)

    $sqliteNode = Join-Path $BackendDir 'node_modules\sqlite3\build\Release\node_sqlite3.node'
    $bcryptNode = Join-Path $BackendDir 'node_modules\bcrypt\prebuilds\win32-x64\bcrypt.node'

    if (-not (Test-Path $sqliteNode)) {
        throw "Falta node_sqlite3.node tras el rebuild: $sqliteNode"
    }
    if (-not (Test-Path $bcryptNode)) {
        throw "Falta bcrypt.node (win32-x64): $bcryptNode"
    }
}

Write-Host "`n========================================" -ForegroundColor White
Write-Host " Parche desktop — Point of Sale" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White

Write-Step 'Comprobando prerrequisitos'
Ensure-NpmAvailable

Write-Step 'Comprobando puerto 3001 (pos-api)'
if (Test-PortListening -Port 3001) {
    throw @"
El puerto 3001 está en uso.

Cerrá Point of Sale y cualquier 'npm run dev:stack' antes de aplicar el parche.
No se modificó ningún archivo.
"@
}
Write-Ok 'Puerto 3001 libre'

Write-Step 'Resolviendo instalación desktop'
$installRoot = Resolve-AppInstallPath
$backendDir = Join-Path $installRoot 'resources\backend'
$distDir = Join-Path $backendDir 'dist'
Write-Ok "Backend: $backendDir"

Write-Step 'Copiando license-public.pem'
$pemSrc = Resolve-LicensePublicKeySource
$pemDst = Join-Path $distDir 'license\keys\license-public.pem'
New-Item -ItemType Directory -Force -Path (Split-Path $pemDst -Parent) | Out-Null
Copy-Item -LiteralPath $pemSrc -Destination $pemDst -Force
Write-Ok "Clave pública en dist: $pemDst"

Write-Step 'Reinstalando dependencias de producción del backend'
Install-BackendProductionDeps -BackendDir $backendDir
Write-Ok 'Dependencias instaladas'

Write-Step 'Recompilando sqlite3 y bcrypt para Electron'
Invoke-ElectronRebuild -BackendDir $backendDir -Version $ElectronVersion
Assert-NativeModules -BackendDir $backendDir
Write-Ok 'Módulos nativos listos'

Write-Host @"

========================================
 Parche aplicado correctamente
========================================

Instalación: $installRoot
Electron:    $ElectronVersion

La base de datos en %APPDATA%\PointOfSale no fue modificada.
Abrí Point of Sale normalmente.

"@ -ForegroundColor Green
