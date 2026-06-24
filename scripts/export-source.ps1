# Exporta el código fuente del POS (sin secretos ni artefactos de build).
# Uso: powershell -ExecutionPolicy Bypass -File scripts/export-source.ps1
# Salida: exports/Point_of_Sale-YYYYMMDD-HHmmss/ y .zip equivalente

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$exportName = "Point_of_Sale-$stamp"
$exportsDir = Join-Path $repoRoot 'exports'
$rawDir = Join-Path $exportsDir $exportName
$zipPath = Join-Path $exportsDir "$exportName.zip"
$tempDir = Join-Path $env:TEMP "pos-export-$stamp"

New-Item -ItemType Directory -Force -Path $exportsDir | Out-Null
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
if (Test-Path $rawDir) {
    Remove-Item -Recurse -Force $rawDir
}

$excludeDirs = @(
    'node_modules', 'dist', 'build', '.git', '.codegraph', '.qodo',
    'release', 'nodejs', 'storage', 'source',
    '.vite', '.turbo', 'coverage', '__pycache__', '.venv', 'venv',
    'keys', 'exports'
)

$excludeFiles = @(
    '.env', '.env.local',
    'user.crt', 'user.key',
    'Thumbs.db', 'Desktop.ini', '.DS_Store',
    'database.sqlite'
)

$robocopyArgs = @(
    $repoRoot, $tempDir,
    '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP'
) + ($excludeDirs | ForEach-Object { '/XD'; $_ }) + ($excludeFiles | ForEach-Object { '/XF'; $_ })

& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -gt 7) {
    if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
    throw "robocopy falló con código $LASTEXITCODE"
}

# Quitar certificados por extensión (robocopy /XF no soporta bien globs)
Get-ChildItem -Path $tempDir -Recurse -Include '*.pem','*.crt','*.key','*.sqlite' -File -ErrorAction SilentlyContinue |
    Remove-Item -Force

$readme = @"
# Export Point of Sale — $stamp

Copia del código fuente lista para compartir o desplegar en otra máquina.

## Excluido (por seguridad / tamaño)

- node_modules, dist, build, instaladores (.exe)
- .env, certificados (*.pem, *.crt, *.key)
- base de datos local (storage, *.sqlite)
- AFIP sidecar compilado y clone Python
- .git, .codegraph

## Restaurar en otra PC

``````powershell
cd $exportName
npm install
npm install --prefix frontend
cd backend; copy .env.example .env; npm install; npm run db:init; cd ..
npm install --prefix desktop
npm run dev:stack
``````

Ver AGENTS.md y docs/ai/dev-runbook.md para más detalle.
"@

Set-Content -Path (Join-Path $tempDir 'EXPORT-README.md') -Value $readme -Encoding UTF8

Move-Item -Path $tempDir -Destination $rawDir

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}
Compress-Archive -Path $rawDir -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host ""
Write-Host "Export listo:" -ForegroundColor Green
Write-Host "  Carpeta: $rawDir"
Write-Host "  ZIP:     $zipPath"
$zipSizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "  Tamaño:  ${zipSizeMb} MB"
