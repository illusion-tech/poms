# R3 E1 受支持读取与代表性重放 API 01

这些模块只导出函数/常量，导入不执行 IO 或重放。没有 CLI self-run、环境发现、进程、HTTP、DB、文件写入、删除、日志或认证动作。D 未运行 Node、重放、测试或构建。Root 提供显式 repositoryRoot，集中调用、记录、删除恰五 alias、负例和最终独审；函数返回的 E1ExitCertified/G3Certified/G4Certified 始终 false。

## API

- `e1-registry01.mjs`：五个 E1 logical pins、canonical archive authority pin、完整 Native OpenAPI pin及纯构造参数。它是明确新增的 logical registry 文件，非 direct alias payload 消费者。23 个 legacy literal 消费者保持原件；literal 搜索可能得到这 23 个加这个新 registry，必须分类报告，不能把 registry 隐藏或把总 literal 文件数仍写23。
- `createE1Resolver({ repositoryRoot })`：从归档读取并验证已冻结 CDEFG map，支持其 source/destination moves 与 immutableInputSnapshots。`.resolve(pin)` 只按完整(file,bytes,SHA)查已登记身份；精确 snapshot 优先，同级不同目标冲突失败；`.read(pin)` 返回已验证 canonical bytes，`.readJSON(pin)`另返回value。没有活动旧路径或latest fallback。
- `.aliasesAbsent()`：只 lstat 五个 logical 路径及其父目录，不读取 alias payload。返回每项是否缺失。已有 alias、symlink或其它文件不能冒称缺失。
- `readCanonicalPin(repositoryRoot,pin)`：仅接受archive/slices相对目标，拒绝绝对/drive/反斜线/空组件/traversal和symlink/junction祖先；用只读描述符校文件类型、长度、SHA及读取前后身份/mtime/ctime。Root应保持受控源树稳定；该工具不获取工作树写锁。
- `buildArchiveIndex([{ pin, rawBytes }])`、`verifyPinnedBytes(pin,rawBytes)`：可用Root内存lab输入验证纯解析、精确快照优先与负例，不需要复制实际归档大树。
- `replayManifests(resolver,nativeOpenAPIRawBytes)`：真实读取两个归档manifest及冻结operations；核历史base、872份Native pin列表一致、44 formal pin结构及16操作/11路径在完整已pin Native OpenAPI的投影。它不逐项读取或认证872/44个嵌套源文件，不冒称历史工具环境已重建。
- `replayFixtures(resolver)`：读取两个已pin canonical纯模块，以验证后的相同bytes data URL加载，实际调用cost/direct-pricing/bid-pricing/bid-with-children四模式；完整结果与独立literal期待比较，并重复实际调用验证确定性，返回完整输出和expected/actual SHA。纯构造ID不是HTTP或DB事实。历史模块的导入依赖不被重写，当前允许的两个纯模块没有imports。
- `replayE1({ repositoryRoot,nativeOpenAPIRawBytes,requireAliasesAbsent=true })`：上述正例总入口，前后核alias状态并重新读取map及五个canonical原件。默认有alias即拒绝；Root在删除前比较时显式传false。返回结果没有写盘或Gate认证。

## Root 的实际调用方式

以下只是调用示例，不是新执行器。Root在自己的受控adapter中调用，原始命令、时间、输入/源码hash、结果、失败/partial及终态由Root记录。

```js
import fs from 'node:fs';
import path from 'node:path';
import { NATIVE_OPENAPI } from './e1-registry01.mjs';
import { replayE1 } from './e1-replay01.mjs';

const result = await replayE1({
    repositoryRoot,
    nativeOpenAPIRawBytes: fs.readFileSync(path.join(repositoryRoot, NATIVE_OPENAPI.file)),
    requireAliasesAbsent: false, // 删除前。删除后必须true。
});
```

先捕获并保留五alias及canonical、map、23个legacy源的实际原字节状态，运行上述删除前支持重放。Root按本批已批准范围删除恰五regular alias，再用`requireAliasesAbsent:true`实际重放，核全部缺失、四模式实际输出与确定性hash相同、canonical/map/历史脚本原件hash不变、无镜像或新alias。第二次执行不能只重读先前report；应再次调用API。

`e1-cases01.mjs`有14个纯index定义和8个Root读取/退出定义。Root对每个index定义用`Buffer.from(JSON.stringify(case.map))`生成内存map，提供该bytes的精确pin给`buildArchiveIndex`，调用`.resolve(case.input)`，分别比较expectedCanonical/expectedKind或预期E1Error.code。不要把所有异常都当预期失败。特别包括snapshot优先、同logical不同hash、两种move schema、未知/坏长度、同级冲突、改内容move、绝对/drive/traversal/非archive目标。

另实际验证authority坏SHA/长度在解析前失败，canonical坏payload、symlink/junction祖先与目录冒充文件失败，以及默认有alias拒绝。文件类型负例只在Root新建的小型owned lab root做，不改变真实archive、不复制大树、不读任何旧private。正例/负例结果均保留真实错误code与原件，不把这里的计划数量计为通过。

该入口只支持明确的manifest/projection/四fixture构造语义；旧bootstrap、环境、build、HTTP/PG/UI runner、source generator及旧case library保留历史hardcode限制，不承诺未经适配可原样运行。Root新stage adapter直接使用新纯定义/本支持入口，不能继续依赖五旧文件。

E1 owner Root，2026-11-09不延期且本批G3前实际退出，取更早。实际代表性重放、恰五删除后复跑、原字节/23原件保护、无新增镜像和独审全部满足前，仍是未退出。Stage/G3/G4与#100/#97/#85/#57按各自条件另行处理。
