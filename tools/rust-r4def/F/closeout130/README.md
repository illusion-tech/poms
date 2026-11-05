# R4DEF G4 文档与原字节归档支持包130

仅作者工作树中的候选支持包。未修改Root、产品、私密文件、Git或GitHub；未执行归档入口、移动或清理。Root为 `E:/projects/worktrees/poms-r3hijk-next28/poms`。

本包不认证G3、清理、提交或G4。`root-facts130.template.json`中的最终字段均为`null`，由Root绑定真实原件、SHA256、JSON pointer和值；`null`不能作为Pass。Ready和Final模板中的`{{...}}`不能直接应用。

## 已交付文件

- `manifest130.json`：本支持包文件、字节数及SHA256；不包含自身的递归哈希。
- `source-guards130.json`及`sources/**.bin`：8份可写回索引的Root原字节与源SHA保护。
- `ready-template/writeback130.patch`、`ready-template/writeback130.json`及8份完整候选：G4Ready，官方210/本批0，四本批Issue仍Open。
- `final-template/writeback130.patch`、`final-template/writeback130.json`及8份完整候选：实际线上关闭后67/92、余25、官方240；`G4Certified=null`、实际终审待签。候选未应用，不表示当前已关闭。
- `archive-plan130b.json`：可用、不可变的逐文件归档计划和完整排除清单。
- `archive-plan130.json`：保留的首轮Blocked计划。6份公开源码的cookie/credential名称被初始策略误拦；不供执行，不回写成通过。
- `policy130.json`、`Common130.ps1`、`Invoke-Archive130.ps1`、`Invoke-Writeback130.ps1`、`prepare130.py`：安全策略、校验、Root应用入口与候选渲染器。

8份写回白名单为根README、design README、backend Rust plan、Rust migration tracker、phase2 tracker、R4 scope、R4DEF机器索引及canonical inventory。两个新路由仅将当前实现/状态与真实实现对齐；历史G1与失败原件不改写。整阶段R4仍Doing，G4Ready只对应本批。

## 固定计数和边界

本批D7/E11/F12共30 HTTP，其中28既有＋2新增。G4线上收口后R4累计67/92、余25（经营17＋验收/完工/归档8），Rust正式240；此前正式210。完整spec为239 paths、293 operations、626 schemas，client616。永久S4为`4f0ad88e78622a75b88b4e3cc72aded9da67458a`。

仅#107/#108/#109/#106可收口；#101/#57保持Open。完整R4阶段验收、R5、部署切流、性能、S3 WORM和真实lost COMMIT ACK均未完成。既有R2的`createUser(initialRoleIds)`500（`actualapi32/00011`，`users/service.rs:469 intentionalProtocol`）留#57后续跟进，本批不修。

## 归档计划实数

`archive-plan130b.json`包含9,079文件，共178,735,821 bytes；其中1,432生命周期move（active目录1,431＋baseline1），7,647份公开证据copy。最大文件为`tmp/rust-r4def/root/cleanup-provenance125.json`，4,331,932 bytes。生命周期排除阻断为0。

完整`exclusions`共1,335项：构建output bulk1,275、非证据扩展54、私密/对象/构建目录1、运行二进制/秘密后缀5。这些是归档选择计数，不是运行测试/ignored计数。private、对象原件、JAR、运行二进制、cargo/target/node_modules及构建大体不读取不打包；构建公开manifest/receipt/log保留。公开原始JSON/MD/SQL/PNG/log/bin等保留原分类，归档入选不等于验收通过。

后缀筛选保守排除了4份`public-static.env`及1份公开`tsconfig.lib.json.bin`（`.lib`命中后缀规则，并非断言它是运行二进制）。后者如需完整独立输入包，可由Root在独立增量中保全，旧计划不改写。

文本原件统一以`.bin`封装文件名，原`.bin`及PNG保留后缀；不改变文件字节，不依赖Git换行转换。baseline目标为`docs/design/archive/slices/rust-r4def-next30-baseline.md.bin`，active目录目标为`docs/design/archive/slices/rust-r4def/**`。origin map记录`logicalOrigin/storedAt/bytes/rawBytesSha256`。tmp只复制，不移动、不删除。

本计划是当前切片，后续132–138、实际cleanup125、objects、独立G3/G4等新增公开证据由Root另追加不可变evidence包及origin-map addendum，不改旧plan或旧原件。若新增文件放入active lifecycle目录，归档入口会硬阻断遗漏；Root应将其列入独立增量移交方案，不能静默忽略。支持包不强制把后续证据塞回130b。

## Root应用条件与顺序

1. 实际cleanup、借用原件恢复、二次noop、自有API停止及保留private/卷均有真实回执。
2. 非作者G3 Pass、固定实现提交、永久S4祖先与实际验收证据齐备；Root填写facts中的精确SHA及实际JSON pointer检查。不存在的GitSHA不可填猜测值。
3. 原字节归档和Ready写回。Ready保留官方210/本批0、四Issue Open；Root独占commit/push/main集成。`Invoke-Archive130.ps1`默认只核验；加`-Apply`才移动生命周期原件，失败留下`FailedPartial` journal，不覆盖目标。
4. 非作者preclose许可后，Root独占GitHub更新与关闭四本批Issue；实际六Issue body/comment/native tree读回确认四Closed、#101/#57 Open。
5. Final写回只要求已存在的main/归档提交、preclose及实际线上读回；官方240、67/92、四项Done。此时实际G4终审仍可待签，不要求尚未创建的Final提交或actualG4预先存在。
6. Final文档提交/main后，非作者实际G4终审独立进行，再追加Seal和comment。`Seal`模式才要求actualG4 Pass与已存在的`finalMetadataCommit`。

`Invoke-Writeback130.ps1`默认只在支持包中新目录渲染候选，`-Apply`才写8份Root索引。可先审patch再由Root执行必要局部；不强制使用入口。Ready应用receipt可通过`-PriorReceiptPath`交给Final，Final receipt再交给Seal；逐文件核当前SHA且保留先前Ready/Final历史。源文件变动、待填值、目标冲突、符号链接、归档字节漂移或Issue状态不符均停止。

示例仅表示调用形态，必须先由Root填写真实facts并核其原件：

```powershell
$packetRoot = 'E:\projects\worktrees\poms-r4f-cost-governance\poms\tools\rust-r4def\F\closeout130'
$repoRoot = 'E:\projects\worktrees\poms-r3hijk-next28\poms'
$actualFacts = Join-Path $packetRoot 'root-facts130.actual.json'
$frozenPlan = Join-Path $packetRoot 'archive-plan130b.json'
& (Join-Path $packetRoot 'Invoke-Archive130.ps1') -Root $repoRoot -PlanPath $frozenPlan -FactsPath $actualFacts
& (Join-Path $packetRoot 'Invoke-Writeback130.ps1') -Root $repoRoot -PlanPath $frozenPlan -FactsPath $actualFacts -Stage Ready -OutputName 'ready-actual-review'
```

本包校验只涉及Python语法、PowerShell AST、候选计数/范围/哈希与Markdown格式；归档入口和Root应用入口均未运行。Root实际写回后仍须按仓库要求运行`git diff --check`、`pnpm run format:md:check`，并核main与GitHub读回。产品build/test不由本支持包重复认证。
