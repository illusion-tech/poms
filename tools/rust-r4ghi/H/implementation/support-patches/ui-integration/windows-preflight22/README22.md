# Windows 私有 ACL / preflight 最小修正22

Root已实机证明旧 Node→Windows PowerShell5 `-Command` 继承PS7 `PSModulePath` 后无法加载 Microsoft.PowerShell.Security；相同脚本独立 `-File` 成功。此候选只修子进程运行环境与失败诊断，不改业务、ACL授权、Chrome选择或profile复用规则。

两个产品：新共用 `business/ui-windows-preflight22.mjs`，以及 Root Runtime14 `windows14.mjs`（before `6e9f4ef2...`）。只 Root 审核后写入。旧20文件原件、旧run01目录/失败/独立诊断均保留，不重用。

按已读 powershell-safe-invocation skill，使用 Root实际现存的pinned PowerShell7 `pwsh.exe`，复杂代码以 `-File` 参数数组执行。没有cmd/IEX/ExecutionPolicy Bypass。仅对子进程env移除大小写变体的PSModulePath，让该已pin PS7生成原生默认模块路径，父环境不改。每个子脚本再核Core和精确PS版本，exe前后由SHA约束。

新run02的prepare input需合入 `powershell22.plan-fragment.json` 中的 `plan.windows.powershell`，Root须再次核实际exe bytes。作者仅FS读取当前Codex内置Core7.6.9路径/SHA，未安装或执行新shell子进程。

ACL仍是原owner+SYSTEM、protected inheritance的相同原脚本。新的task目录必须不存在；仅无secret的bootstrap `.ps1` 先写入该目录，ACL成功并核Protected/Core/version之后才写proof、file-version脚本、日志、profiles或任何actor/cookie材料。脚本均create-new，重复调用只能读同一run完全相同脚本字节；不覆盖旧文件、不放宽ACL。

topcatch将脱敏的name/code/阶段/stack帧及仅来自该无secret PowerShell子脚本的stderr写明确stderr；不会输出环境、Cookie/actor对象或多行assertion actual值。原task-private运行日志流程保持。

Root晋升后必须给Windows14更新exact20 corrective receipt，并重新prepare完整source/helper/dist/plan/actors闭包；新business helper由现有source-closure自动纳入。旧dom14-source12-01不可重用。其余18 worker的同类PowerShell代码尚未在本最小候选里修改，后续可经独立exact增量复用同helper，不暗改它们。

作者实际仅Node24：5纯回归通过，两个候选Node语法检查通过。没有执行ACL、PowerShell子进程、浏览器、HTTP、DB或服务；真实新run preflight由Root运行。
