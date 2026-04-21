<#
.SYNOPSIS
    将指定文件或目录中的文本文件统一为 LF 行尾，并清理末尾多余空白行。

.DESCRIPTION
    该脚本用于解决 Windows 开发环境中混入 CRLF 或 mixed line endings 的问题。
    它支持处理单个文件或整个目录，递归扫描目标下的所有文件，跳过疑似二进制文件，
    将文件末尾连续空白行收敛为单个最终换行，并仅在内容实际发生变化时以
    UTF-8 without BOM 重新写回。

.EXAMPLE
    PS> .\tools\openapi\normalize-line-endings.ps1 -Path libs/shared/api-client
    递归将 shared-api-client 目录中的文本文件统一为 LF。

.EXAMPLE
    PS> .\tools\openapi\normalize-line-endings.ps1 -Path tools/openapi/check-shared-api-client.ps1
    仅修正单个脚本文件的行尾。

.NOTES
    该脚本主要服务于 OpenAPI 生成物与校验脚本，避免 `git diff --check`
    和 `git diff --no-index` 因平台默认行尾或生成器末尾空白差异产生噪音。
#>
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Path
)

# 任何未处理异常都应直接终止，避免静默产生半完成状态。
$ErrorActionPreference = 'Stop'

# 统一以 UTF-8 without BOM 写回，避免额外引入 BOM 差异。
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# 提前解析目标路径；若路径不存在，会在这里直接失败。
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path

function Test-IsBinaryFile {
    param([byte[]]$Bytes)

    # 用最保守的空字节检测跳过二进制文件，避免误改生成资产或其他非文本文件。
    foreach ($byte in $Bytes) {
        if ($byte -eq 0) {
            return $true
        }
    }

    return $false
}

if ((Get-Item -LiteralPath $resolvedPath) -is [System.IO.FileInfo]) {
    # 单文件场景也包装成数组，复用后续统一处理逻辑。
    $files = @(Get-Item -LiteralPath $resolvedPath)
} else {
    # 目录场景递归扫描所有文件，包括隐藏文件，确保生成工具写出的元文件也被覆盖到。
    $files = Get-ChildItem -LiteralPath $resolvedPath -Recurse -File -Force
}

foreach ($file in $files) {
    # 先按字节读取，先做二进制检测，再决定是否按文本处理。
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)

    if (Test-IsBinaryFile $bytes) {
        continue
    }

    $original = [System.IO.File]::ReadAllText($file.FullName)

    # 同时收敛 CRLF 和孤立 CR，保证最终仓库文本统一为 LF。
    $normalized = $original.Replace("`r`n", "`n").Replace("`r", "`n")

    # OpenAPI Generator 会在少量 union/enum 文件末尾生成多余空白行。
    # 生成与校验都经过本脚本，收敛后可同时满足同步检测和 git diff --check。
    $normalized = [System.Text.RegularExpressions.Regex]::Replace($normalized, "(?:[ `t]*`n)+\z", "`n")

    # 未发生变化时不重写，减少无意义时间戳变动和文件系统噪音。
    if ($normalized -ceq $original) {
        continue
    }

    [System.IO.File]::WriteAllText($file.FullName, $normalized, $utf8NoBom)
}
