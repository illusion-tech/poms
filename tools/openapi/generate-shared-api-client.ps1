# Compatibility entry point. All generation rules live in the Node tool.
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'shared-api-client.mjs') --write @args
exit $LASTEXITCODE
