# #118 独立审查与真实R文件慢路径组件

本轮依据用户“开始吧”，完成非作者审查、现存真实输入盘点和必要的隔离纠正。候选01、原284执行文件、P及I保持，未安装、未启动Debian、未运行pnpm或真实SQL/HTTP/Auth/新快照/探针。实际预算及完整业务范围不由本轮代码/组件证据认证。

## 01独立结论与02纠正

[01具名独审](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/REVIEW.md)结论为 **NOTREADY**。非作者 `/root/performance118_independent_review01` 对精确72275c80和285图实测三个P1：观测故障覆盖主错误或已成功close事实、读中增长缺逐块尺寸上限、目录typed/names合法组合被拒。还实测了缓存压力4→6次读和snapshot平方复杂度。原负例和完整模块模型原件已封存；模型的最小Root品牌/活性适配不冒充真实constructor。

[02纠正输入](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-performance-candidate02-corrective-2026-11-16.md)落实诊断故障隔离与schema2健康/UNKNOWN、三路径尺寸+1字节哨兵限制、typed/names统一、线性snapshot、缓存压力减少首个额外读，并补wire诊断时钟隔离。原强预算时钟、ticket身份校验和封口未改成可选诊断。

根据[非作者限定设计意见](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/static-metadata-design-opinion02.md)，02只对真实Native品牌中冻结的source/compile/helper/execution精确名单共享同scope静态metadata。未知/动态输入默认fresh；current角色覆盖名单，当前holder脚本明确fresh FD/path。末尾完整SHA/身份/目录书挡及最终Native复核保持，不声称与旧每次重复调用时点等价或持续活性。

02精确审查输入为[review-input.json](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-candidate02/review-input.json)，217827B/SHA `42afdb5f347d4918299d18981eb826ab16aea4a244c0ae1cc3e49a81892b456d`，285成员、相对01为3 MOD/282 SAME。作者87项/87过/0 skip。独立02结论以其实际封存件为准，本文不代签。

## 真实输入与身份

盘点发现P历史、M镜像、两个ELF和Linux Node位于已停止Debian，不能为基准启动或挂载。通过Windows现存R文件及旧archive344独立叶清单，重建了以下描述符原字节：

| 输入              |      成员 |       字节 | SHA256                                                           | 与既有描述符   |
| ----------------- | --------: | ---------: | ---------------------------------------------------------------- | -------------- |
| sourcePins        |       420 |      68385 | 4f20c9848613d6fb53133f5779ee74c9586642c403a966f36b4c07833eb4bedf | 精确匹配       |
| compileInputs     |       528 |      83968 | 3197f2439ea136220089906cc3eb3e02284945d885ecf9062fc8612ab4795bc8 | 精确匹配       |
| 当前helper/执行图 | 229 / 284 | 各成员实读 | 按原01输入中before图核对                                         | 全部原字节匹配 |

重建清单是不同路径的组件输入副本，不是P中原Full3身份，不能用于samePin准入。最初Windows混斜杠排序造成420清单SHA不同；按原Linux相对路径顺序核准后才匹配。最初source+Cargo联合仅455项，不等于528编译闭包；后经746归档叶减218 helper得到实际528，并与既有hash精确相同。初版和失败都保留，没有把不匹配件改称通过。

## 方法与边界

原版与候选读取同一真实R420/528/229/284文件。模型装载完整现存模块中的实际函数体，以严格双向路径桥将唯一Linux R前缀映射到Windows同一工作树，真实执行lstat/realpath/FD/内容/SHA，不接受M/P、不替换原件身份。

CP-R组件执行原currentTaxFiles与currentTree的R文件段；候选额外执行其末尾Native复核对应的R tree段和完整封口。close-R组件按已核调用图执行原1份currentTaxR+8份treeR，候选1份currentTaxR+3份treeR+封口。没有调用真正close、构造真实Root或效果端口。

每变体每组件预定1 warmup及3交替串行样本；OS缓存warm/未受控，不清缓存，不按结果追加样本。Source/编译清单重建和模块装载在组件计时外。并行审查可能带来宿主噪声；结果只描述本机该组件，不作高尾保证。

## 实测结果

01正向R组件因目录模式冲突失败，不能给其补造性能值。02初版仍出现CP组件退化，保留配对原件：

| 02未共享静态metadata的首轮 |    原版中位 |     02中位 | 观察                                         |
| -------------------------- | ----------: | ---------: | -------------------------------------------- |
| CP-R                       |  600.9925ms | 739.0241ms | 内容读减少，但显式metadata调用翻倍，组件变慢 |
| close-R                    | 2677.9761ms | 952.5077ms | 嵌套重复树验证减少                           |

在独立设计意见限定名单后，新的预定三样本配对为：

| 组件    | 原版中位及范围                     | 02中位及范围                    |  本组中位差 |
| ------- | ---------------------------------- | ------------------------------- | ----------: |
| CP-R    | 581.1722ms（561.0104–598.3321）    | 494.0101ms（475.9586–504.9958） | 减少约15.0% |
| close-R | 2205.3851ms（2162.9058–2314.3613） | 569.2351ms（540.9925–576.7336） | 减少约74.2% |

| 每样本工作量         |    CP原版 | CP候选02 | close原版 | close候选02 |
| -------------------- | --------: | -------: | --------: | ----------: |
| 内容读次数           |      4235 |     1624 |     16065 |        1624 |
| 内容读字节           | 121778708 | 56453926 | 423152319 |    56453926 |
| SHA输入字节          | 124672361 | 56453926 | 446301543 |    56453926 |
| 显式metadata API调用 |     13387 |    17061 |     45454 |       18597 |
| 目录枚举             |       208 |      113 |       579 |         113 |

这些不是物理磁盘流量或完整内核syscall计数；readFileSync内部隐含操作未单列，不能只看metadata列推算WSL成本。前后两轮基线本身不同，不能拿不同轮次中位交叉比较。所有组件输出断言通过，真实效果为0。

## 未覆盖与后续

未测M、P恢复历史与DBrows、两个ELF、Linux Node/跨文件系统时延、当前进程/Windows holder、完整constructor与真实CP/close。原113.436秒CP、629.801秒close及49分钟外层命令没有因此获得新的分段实测归因。工程目标CP≤10秒、close≤30秒、outer≤300秒及完整FI/618成本仍UNKNOWN。

后续资格结论须由非作者对精确输入实际签发。即使隔离代码范围通过，也不授安装、新源码图准入、启动系统或新探针；原Native/G1仍绑定旧图，必须另有具体现存输入和批准。保持#118/#57开放，旧STOPPED_PRESERVE和业务新增认证0不变。

## 02新增问题与03纠正

非作者[02独审](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/candidate02/REVIEW02.md)验证了F01–F05的23个独立组合及87项适配回归，但又独立复现可淘汰decoded cache使合法目录cold过warm拒，故02仍为NOTREADY。角色记录随重复命中累积另列P2关注；均未夸大为实际Native64MiB已失败或真实堆限突破。

[03纠正输入](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-performance-candidate03-corrective-2026-11-16.md)只修缓存腾挪与等价角色Map去重。03的[精确审查图](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-candidate03/review-input.json)217471B/SHA `1d803d4d2cbeb6ffb02b2b69a8a4107a82a8776d45dd34ddce7f7c1fe53307f7`，较02为1 MOD/284 SAME。原件/摘要/身份/目录依赖不因逐出缓存而丢失，真实current角色每次FD检查不因role已去重而省略；不可腾挪名字节仍硬拒。

作者92项/92过/0 skip，公开冻结回归入口实际exit0。非作者[03最终结论](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/candidate03/REVIEW03.md)已实际封存：`READY_LIMITED_ISOLATED_CORRECTIVE_CODE`，机器原件[review03.json](E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/runtime118-performance-review01/candidate03/review03.json) SHA `fdbf5b3eafd40c4fb5b2e12453dc7ec4a852373b9366d1bd3906b5e240532496`。31项独立组合和92项适配回归全过，F01–F07在该隔离纠正范围内无新增阻断。完整模块模型的最小Root品牌/活性适配及harness模板旧kind标签均披露，不冒充constructor或真实运行。

该限定READY只可作为准备新具体输入与准入审查的代码证据。actualConstructor/fullNative/fullToolG3G4/businessG3G4/install/sourcePromotion/recoveryOrProbe均为false或UNKNOWN；不得简写成“工具已通过G3/G4”“可以安装”或“预算通过”。01/02的NOTREADY不撤销。

03最终预定三样本的同机R文件段配对如下，不能拿不同轮基线交叉比较：

| 组件    | 原版中位及范围                     | 03中位及范围                    |  本组中位差 |
| ------- | ---------------------------------- | ------------------------------- | ----------: |
| CP-R    | 624.4439ms（615.8531–779.4987）    | 567.3103ms（551.3160–577.9456） |  减少约9.1% |
| close-R | 2415.8516ms（2389.3322–2516.0006） | 638.9951ms（636.7026–716.0885） | 减少约73.6% |

03工作量与前述02最终文件组件相同：CP内容读4235→1624、close内容读16065→1624，两者候选均56453926B/SHA输入；当前角色FD/path及末尾完整原字节封口保持。这只是Windows R组件，完整私有历史、Linux/跨文件系统、原真实CP/close和预算均未据此认证。

## 开发驱动原路径复用纠正

最终原件核对发现开发用`benchmark-r-files.mjs`同一路径在02封包后被03参数版本复用。旧索引所指原路径已不匹配旧Full3；旧驱动字节在既存bin复制件中完整保留，03版本另有原字节副本，但两者不能同时冒称该原路径的当前原件。新`retention-origin-path-correction.json`按`new-real-drift`记录这一事实，不改旧索引、不恢复路径伪造同pin，也不把复制件当原件别名。该开发驱动不是实际运行准入或批准输入；候选代码、独审命令/报告原件与原284另外逐字核准。组件结果仍只按已捕获版本/输入/输出事实解释，不新增当前原件保全认证。
