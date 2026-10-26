# Retained for callers that dot-source the old function name.
function Set-Java17Environment {
    $ErrorActionPreference = 'Stop'
    $javaInfoJson = & node (Join-Path $PSScriptRoot 'shared-api-client.mjs') --java-info
    $javaExitCode = $LASTEXITCODE
    if ($javaExitCode -ne 0) {
        throw 'A configured Java 17+ executable is required for client generation.'
    }
    $javaInfo = $javaInfoJson | ConvertFrom-Json
    $env:JAVA_HOME = $javaInfo.javaHome
    $javaBin = Split-Path -Parent $javaInfo.executable
    $env:PATH = "$javaBin$([System.IO.Path]::PathSeparator)$env:PATH"
}
