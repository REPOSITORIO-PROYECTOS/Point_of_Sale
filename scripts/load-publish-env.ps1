function Read-DotEnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return @{}
    }

    $vars = @{}
    Get-Content $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }

        $eq = $line.IndexOf('=')
        if ($eq -lt 1) {
            return
        }

        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
        if ($key -and $value) {
            $vars[$key] = $value
        }
    }

    return $vars
}

function Import-PublishEnv {
    param(
        [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
    )

    $backendEnv = Read-DotEnvFile (Join-Path $RepoRoot 'backend\.env')
    $publishEnv = Read-DotEnvFile (Join-Path $RepoRoot '.env.publish')

    foreach ($source in @($backendEnv, $publishEnv)) {
        foreach ($entry in $source.GetEnumerator()) {
            if (-not (Get-Item -Path "Env:$($entry.Key)" -ErrorAction SilentlyContinue)) {
                Set-Item -Path "Env:$($entry.Key)" -Value $entry.Value
            }
        }
    }

    if (-not $env:GH_TOKEN -and $env:GITHUB_TOKEN) {
        $env:GH_TOKEN = $env:GITHUB_TOKEN
    }

    if (-not $env:GH_TOKEN) {
        $examplePublish = Join-Path $RepoRoot '.env.publish.example'
        throw @"
GH_TOKEN no encontrado.

Opcion A (recomendada): agregá en backend\.env
  GITHUB_TOKEN=ghp_tu_token

Opcion B: copiá .env.publish.example a .env.publish en la raiz del repo.
  Copy-Item '$examplePublish' (Join-Path '$RepoRoot' '.env.publish')
"@
    }

    if (-not $env:GH_UPDATER_TOKEN) {
        $env:GH_UPDATER_TOKEN = $env:GH_TOKEN
    }

    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
}
