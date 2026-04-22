<#
.SYNOPSIS
    验证共享API客户端代码是否与OpenAPI规范保持同步

.DESCRIPTION
    该脚本用于检测libs/shared/api-client目录下的API客户端代码是否基于最新的OpenAPI规范生成。
    它通过重新生成临时API客户端并与现有代码进行git diff比较来实现验证。
    此检测确保API客户端代码始终与后端API规范保持一致，避免接口不同步的问题。

.EXAMPLE
    PS> .\tools\openapi\check-shared-api-client.ps1
    执行API客户端同步检测，如果代码不同步则返回非零退出码

.NOTES
    业务背景：
    - 该脚本是POMS项目CI/CD流程的一部分，用于确保前端API客户端与后端API规范同步
    - 基于Nx工作区架构，作为shared-api-client项目的check目标执行

    OpenAPI检测规则：
    1. 使用typescript-angular生成器基于openapi.json生成API客户端
    2. 生成配置来自tools/openapi/typescript-angular.config.json
    3. 通过git diff比较临时生成代码与现有代码的差异
    4. 任何差异都表示API客户端需要重新生成

    共享API客户端校验逻辑：
    - 在临时目录生成新的API客户端代码
    - 复制project.json配置文件保持项目结构完整
    - 使用git diff进行无索引比较，检测所有文件差异
    - 清理临时文件，确保系统整洁

.COMPONENT
    OpenAPI Generator CLI (typescript-angular)
    Git diff工具
    PowerShell Core

.ROLE
    代码质量检测
    API一致性验证
    CI/CD流程检查
#>

# 设置错误处理偏好：发生错误时立即停止执行
# Stop on any error to ensure script reliability
$ErrorActionPreference = 'Stop'

# 定义临时目录路径，用于存放生成的API客户端代码
# Create unique temp directory for API client generation comparison
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) 'poms-shared-api-client-check'

. "$PSScriptRoot\ensure-java17.ps1"
Set-Java17Environment

# 清理已存在的临时目录（如果存在）
# Remove existing temp directory to ensure clean state
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

# 创建新的临时目录
# Create fresh temp directory for this validation run
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    Write-Host "开始生成临时API客户端代码..." -ForegroundColor Green

    # 使用OpenAPI Generator CLI生成TypeScript Angular API客户端
    # Generate fresh API client using OpenAPI Generator with TypeScript-Angular template
    # Configuration loaded from: tools/openapi/typescript-angular.config.json
    & corepack pnpm exec openapi-generator-cli generate `
        -c tools/openapi/typescript-angular.config.json `
        -o $tempDir `
        --skip-validate-spec

    # 检查生成命令是否成功执行
    # Validate API generation completed successfully
    if ($LASTEXITCODE -ne 0) {
        Write-Error "API客户端生成失败，退出码: $LASTEXITCODE"
        exit $LASTEXITCODE
    }

    Write-Host "API客户端生成完成，开始配置项目文件..." -ForegroundColor Green

    # 复制project.json文件到临时目录，保持项目结构完整性
    # Copy project configuration to temp directory for complete project structure
    # This ensures git diff compares against a complete, valid Nx project
    Copy-Item 'libs/shared/api-client/project.json' (Join-Path $tempDir 'project.json') -Force

    Write-Host "统一临时工作树的行尾为LF..." -ForegroundColor Green

    # 在补齐project.json之后再统一行尾，确保整个临时工作树都遵守同一文本规范
    # Normalize after the temp tree is complete so generated files and copied config
    # follow the same line-ending convention before diffing.
    & powershell -NoProfile -File tools/openapi/normalize-line-endings.ps1 -Path $tempDir

    if ($LASTEXITCODE -ne 0) {
        Write-Error "临时API客户端行尾归一化失败，退出码: $LASTEXITCODE"
        exit $LASTEXITCODE
    }

    Write-Host "开始执行代码差异检测..." -ForegroundColor Green

    # 使用git diff进行无索引比较，检测API客户端代码差异
    # Perform git diff comparison between generated and existing API client
    # --no-index: Compare two paths on the filesystem (not in git repository)
    # --exit-code: Exit with 1 if there are differences, 0 if identical
    & git diff --no-index --exit-code -- $tempDir 'libs/shared/api-client'

    # 获取git diff的退出码
    # Capture diff result - non-zero means differences detected
    $diffResult = $LASTEXITCODE

    if ($diffResult -eq 0) {
        Write-Host "✅ API客户端代码与OpenAPI规范完全同步" -ForegroundColor Green
    } else {
        Write-Host "❌ 检测到API客户端代码与OpenAPI规范不同步" -ForegroundColor Red
        Write-Host "请运行 'nx run shared-api-client:generate' 重新生成API客户端代码" -ForegroundColor Yellow
    }

    # 返回git diff的结果作为脚本退出码
    # Propagate diff result as script exit code
    exit $diffResult
}
catch {
    # 捕获并处理执行过程中的任何异常
    # Handle any unexpected errors during execution
    Write-Error "执行过程中发生错误: $($_.Exception.Message)"
    Write-Error "错误位置: $($_.InvocationInfo.PositionMessage)"
    exit 1
}
finally {
    # 确保清理临时目录，无论执行成功或失败
    # Cleanup temp directory regardless of execution result
    if (Test-Path $tempDir) {
        Write-Host "清理临时文件..." -ForegroundColor Gray
        try {
            Remove-Item $tempDir -Recurse -Force
        } catch {
            Write-Warning "临时目录清理失败，可稍后手动删除: $tempDir"
        }
        Write-Host "临时清理完成" -ForegroundColor Gray
    }
}
