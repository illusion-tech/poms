param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path
)

# The frozen old implementation is exercised by capture-normalization-oracle.mjs.
$ErrorActionPreference = 'Stop'
& node (Join-Path $PSScriptRoot 'shared-api-client.mjs') --normalize $Path
exit $LASTEXITCODE
