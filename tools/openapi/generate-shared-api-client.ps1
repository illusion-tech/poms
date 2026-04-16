<#
.SYNOPSIS
    生成并同步共享 API Client 到仓库目录。

.DESCRIPTION
    该脚本先在临时目录生成 TypeScript Angular client，再将完整结果镜像到
    `libs/shared/api-client`。这样可以避免 Windows 环境下目标目录被占用时，
    先删后生策略带来的目录删除失败问题。

.EXAMPLE
    PS> .\tools\openapi\generate-shared-api-client.ps1
    基于最新 openapi.json 生成共享 API Client，并同步到仓库目录。

.NOTES
    设计意图：
    - 生成过程与工作树写入解耦，降低半完成状态概率
    - 避免对目标根目录执行整目录删除，减少 Windows 文件锁影响
    - 在同步前后统一 LF 行尾，保持生成物稳定
#>

# 任何异常都立即终止，避免留下部分更新的生成物。
$ErrorActionPreference = 'Stop'

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) 'poms-shared-api-client-generate'
$targetDir = (Resolve-Path -LiteralPath 'libs/shared/api-client').Path
$projectFile = Join-Path $targetDir 'project.json'
$generatorConfig = 'tools/openapi/typescript-angular.config.json'
$normalizeScript = 'tools/openapi/normalize-line-endings.ps1'

if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Write-Host '开始在临时目录生成共享 API Client...' -ForegroundColor Green

    & corepack pnpm exec openapi-generator-cli generate `
        -c $generatorConfig `
        -o $tempDir `
        --skip-validate-spec

    if ($LASTEXITCODE -ne 0) {
        throw "OpenAPI Generator 失败，退出码: $LASTEXITCODE"
    }

    # project.json 属于 Nx 项目元数据，不由 generator 输出，因此显式带入临时工作树。
    Copy-Item $projectFile (Join-Path $tempDir 'project.json') -Force

    Write-Host '统一临时生成物的行尾为 LF...' -ForegroundColor Green

    & powershell -NoProfile -File $normalizeScript -Path $tempDir

    if ($LASTEXITCODE -ne 0) {
        throw "临时生成物行尾归一化失败，退出码: $LASTEXITCODE"
    }

    Write-Host '镜像同步生成物到工作区...' -ForegroundColor Green

    & robocopy $tempDir $targetDir /MIR /NFL /NDL /NJH /NJS /NP
    $robocopyExitCode = $LASTEXITCODE

    if ($robocopyExitCode -gt 7) {
        throw "robocopy 同步失败，退出码: $robocopyExitCode"
    }

    Write-Host '统一目标目录的行尾为 LF...' -ForegroundColor Green

    & powershell -NoProfile -File $normalizeScript -Path $targetDir

    if ($LASTEXITCODE -ne 0) {
        throw "目标目录行尾归一化失败，退出码: $LASTEXITCODE"
    }
}
finally {
    if (Test-Path $tempDir) {
        Write-Host '清理临时生成目录...' -ForegroundColor Gray
        try {
            Remove-Item $tempDir -Recurse -Force
        } catch {
            Write-Warning "临时目录清理失败，可稍后手动删除: $tempDir"
        }
    }
}
