<#
.SYNOPSIS
    确保当前进程环境可使用 Java 17+，供 OpenAPI Generator CLI 7.x 调用。

.DESCRIPTION
    按以下优先级查找并启用 Java 17+：
    1. 当前 PATH 中已可用的 java（不覆盖调用方配置）。
    2. 调用方已设置的 JAVA_HOME（如果其 bin/java.exe 满足版本要求）。
    3. 本机默认 Zulu 17 路径（C:\Program Files\Zulu\zulu-17）。
    若以上均不可用，抛出明确错误。

.EXAMPLE
    PS> . "$PSScriptRoot\ensure-java17.ps1"
    PS> Set-Java17Environment
#>

function Set-Java17Environment {
    function Get-JavaMajorVersion {
        param([string]$JavaPath = 'java')
        try {
            $output = & $JavaPath -version 2>&1
            $verLine = $output | Select-String -Pattern 'version "([^"]+)"' | Select-Object -First 1
            if (-not $verLine) { return 0 }
            $ver = $verLine.Matches.Groups[1].Value
            if ($ver -match '(\d+)') {
                $major = [int]$matches[1]
                # 处理 legacy 版本号如 1.8.0_372
                if ($major -eq 1 -and $ver -match '^1\.(\d+)') {
                    return [int]$matches[1]
                }
                return $major
            }
            return 0
        } catch { return 0 }
    }

    $currentMajor = Get-JavaMajorVersion
    if ($currentMajor -ge 17) {
        return
    }

    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        $javaHomeMajor = Get-JavaMajorVersion -JavaPath "$env:JAVA_HOME\bin\java.exe"
        if ($javaHomeMajor -ge 17) {
            $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
            return
        }
    }

    $zuluPath = 'C:\Program Files\Zulu\zulu-17'
    if (Test-Path "$zuluPath\bin\java.exe") {
        $env:JAVA_HOME = $zuluPath
        $env:PATH = "$zuluPath\bin;$env:PATH"
        return
    }

    throw "OpenAPI Generator 7.x 需要 Java 17+。当前环境未检测到符合条件的 Java（当前 PATH 中的版本主号: $currentMajor）。请设置 JAVA_HOME 指向 Java 17+ 安装目录。"
}
