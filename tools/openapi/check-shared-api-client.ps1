# Compatibility entry point. The Nx dependency separately refreshes the full spec.
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'shared-api-client.mjs') --check @args
exit $LASTEXITCODE
