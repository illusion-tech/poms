# R2B 角色与权限验收及收口

- 切片：`RUST-R2B` / [#69](https://github.com/illusion-tech/poms/issues/69)；父 [R2 #67](https://github.com/illusion-tech/poms/issues/67)，总体 [#57](https://github.com/illusion-tech/poms/issues/57)。
- 类型：`cross-layer-high-risk`；执行方式：独立managed worktree及专用Linux checkout，solo worktree checkpoint。
- 起点：`9734515f84ebe1a4833d207124adbfbe378f691f`。主代理负责集成、环境、HTTP/UI验收与治理；A负责契约、HTTP入口及排序；B负责持久化、事务与数据库测试；C为非产品作者独立审查。
- 正式输入：[冻结基线](rust-r2b-role-permissions-baseline.md)、[R2范围](../../rust-r2-scope-and-dependencies.md)、[108操作归属](../../rust-r2-operation-slices.json)。失败、原行为与纠正见[纠偏记录](rust-r2b-corrective-checkpoint.md)。
- 当前gate：G1 Pass、G3 Pass；实现已集成推送并通过集成后检查，G4随本归档提交推送和Issue同步生效。

## 1. 交付边界

Rust新增权限字典、角色列表/创建/详情/修改、启停与全量权限替换八个既有操作，累计16路径、18操作。所有新增操作复用原会话、CSRF及`platform:roles:manage`权限守卫；系统角色最低集合、激活字段被接受但当前忽略、创建运行201而原规范200等既有语义保持原状。

权限和DTO仍由原TypeScript单向拥有编辑权。导出工具直接执行锁定Zod4.6.1 schema，保留135项输入oracle、其中109项非法输入。未知历史权限不丢弃；排序采用固定ICU4X revision及配套Unihan Root/Jamo数据，484字符串、234256成对比较仅证明该有限语料与锁定Linux Node默认en-US一致，不代表全Unicode或不同默认locale等价。

事务保持原业务flush与独立审计flush。审计失败可以发生在业务已提交之后；认证raw touch独立提交，pending session CAS由第一个实际flush消费。请求局部角色快照及列表nullable合并、UTF-16响应与PG UTF-8存储、UUID别名的详情计数和权限审计原路径，均由真实Nest见证限定。

原Angular产品、完整OpenAPI及579个生成客户端文件、原92份产品迁移保持不变。新增排序依赖保留原253项registry依赖身份，增加固定revision的22项git及3项registry包；typed数据producer使用独立lock。没有产品DDL、部署或性能验收。

本片不包含其余97个R2操作、其它平台业务、外部provider、业务审批处理器或R3–R5。R2C–M继续各自冻结G1后实施；#61既有事项保持打开。

## 2. 实际验证

| 检查             | 结果及边界                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust最终候选     | 固定Rust1.99.1；fmt、locked/offline check、105普通测试、clippy all-targets零warning及release通过。32 ignored不计通过；本片8项PG service测试另行执行全部通过。                                       |
| 单向契约         | 权限字典37项、四类输入schema oracle及最低集合从原源导出；最终累计18操作的metadata/schema校验通过，新增8操作/11可达schema逐字段一致，继承10操作递归通过原校验器。                                    |
| 原Nest见证       | 普通28场景与补充3场景实际完成，保留完整SQL配对及原响应码元；只证明原行为。UUID别名6项两端差分通过，实际Rust为52e4版本。URI51项差分通过，实际Rust为e171版本。最终ee21的HEAD15项两端比较通过。        |
| HTTP/持久化      | 最终ee21的179场景执行通过，与同harness原Nest179逐项差分通过；服务退出与二次清理0/0。                                                                                                                |
| 并发             | 最终ee21与Nest六场景逐项差分通过，覆盖role CAS、唯一性竞争、late session CAS与请求局部读取；服务退出与二次清理0/0。早期nullable列表不匹配保留。                                                     |
| 系统角色         | 首轮22场景完成但release失败，报告保持fail。独立恢复精确成功。最终Nest与ee21 Rust各22场景及跨端比较通过、固定角色恢复、进程退出、二次清理0/0。                                                       |
| 原Nest单测与构建 | 原platform controller/service两suite共79测试通过；原Angular production及依赖build通过。                                                                                                             |
| 纯工具与静态     | 最终Windows 199项：198通过、1项symlink权限条件跳过；未将跳过记通过。全部相关JS工具与三个UI测试文件ESLint零warning，浏览器测试TypeScript类型检查通过。                                               |
| 基础认证回归     | Windows/Linux × Nest/Rust四组合各13通过，共52项；本轮Rust两组合绑定最终ee21。                                                                                                                       |
| 原页面           | Windows/Linux × Nest/Rust四组合各3通过，共12项，零skip/flaky。8张桌面/390×844实际截图已查看，保留既有许可提示与窄屏表格横滚。Windows首轮缺完整浏览器在业务前失败，原件保留。                        |
| 数据结构         | 新Nest/Rust副本各92原迁移、相关catalog检查完成。原migration:check两库均exit1且已分类；执行只读schema:update --dump，生成SQL未执行。107表/1778列/515约束/504索引/92迁移/0用户trigger的捕获前后相同。 |
| 最终独立审查     | C最终G3 Pass；当前157份来源与最终二进制绑定，未关闭P1/P2均为0。                                                                                                                                     |

schema差异为低权MikroORM对CHECK的introspection可见性限制，以及既有`lead_score_override.status`注释差异。168条提议均有同名现存约束，不声称表达式逐项相同，不提升运行权限、不执行建议DDL。

HEAD为原GET的隐式行为，不增加OpenAPI操作。三类GET的canonical、大写静态段与单尾斜线HEAD均返回200且空body，双斜线/encoded静态段返回原HTML404且空body。成功HEAD必须与本端真实GET长度及必要header一致；角色列表Nest5078字节、Rust5864字节，保留既有JSON Unicode编码表示差异，不声称跨端字节或所有header相等。负例header跨端严格比较。

普通JSON验收逐字段比较解码后的响应和完整持久化、审计、会话事实。只有明确证明原查询无排序约束的局部允许无序：原15个固定角色的相同SQL微秒排序键桶、URI fixture内同事务创建的两角色、六个系统权限操作审计beforeSnapshot中的相同赋权时间桶，以及八个指定拒绝事件中已核实的四项权限集合。组外次序、时间桶分区、完整对象字段、afterSnapshot及其它数组仍严格比较；没有给产品查询添加排序键。

PG8在URI/HEAD修正前执行，其53个输入中51个仍逐字节相同，仅两个HTTP路由文件变化；独立审查确认service/store/auth/data输入未变，不冒称PG8运行了最终二进制。URI51与UUID别名6保留实际二进制标签；最终HEAD变更仅扩展三个GET方法谓词，最终普通179、并发6、系统22及适用页面另行绑定ee21。

## 3. 证据与环境边界

所有失败、部分完成与旧二进制运行保留其原标签。原R1/R2A的受控PG目标和完整legacy页面矩阵仅为历史证据，不冒充本轮重跑。未迁移页面请求只作观察；原页面PrimeUI许可提示与窄屏表格滚动仍保留，不宣称全站视觉修复。

仅使用新`poms_r2b_nest`、`poms_r2b_rust`和低权`poms_r2b_app`。固定系统角色通过连续控制锁、持久化快照和逐步授权记录精确恢复，普通fixture按明确run/actor/角色身份清理；不使用reseed或全库清空。Windows PG17只观测服务元数据，当前仍Running/Auto/PID6768，没有连接SQL或修改实例与数据。旧PG15副本保留。

最终51个run二次清理均为0/0，5份系统lease均已恢复，58份journal目录与字节保持不变。Windows external Rust在两套测试退出后仍为同PID16、同ee21二进制，随后由owner正常回收；Windows/Linux的5100/5101/5200均无监听。详见[机器验收记录](../../rust-r2b-validation.json)。工作树回收前还须逐文件保存本轮原始证据。

## 4. Gate与G4

C于2026-10-26T22:10:46.396Z完成最终非作者G3审查，结论Pass，未关闭P1/P2均为0。审查报告SHA256为`2eec6e4ce96c00d90f366b7bc0794c66079c7536609eb7c05ac3e343a9ea6dd0`；受审机器汇总SHA256为`36edff6a1b625dc817de83aeb22ffd4700561bd334585e4dc1de0745c3afd477`，157文件来源清单SHA256为`fe396c6297a10812a971897e1d8c517cc89567bb8c004fc293b25b6a716f233d`。产品与工具输入保持冻结，后续仅补G3/G4元数据，原受审文件另存原字节。

实现`31555b76d1d9a453aef44172211e4b35e30df573`已按solo worktree流程快进集成并推送main。集成后22项适配器测试、角色及导航单向导出、累计18操作OpenAPI与完整579客户端校验通过；157份源码/工具输入前后一致。集成检查不冒充重跑旧数据库或浏览器矩阵。

## 5. G4归档与状态

三份生命周期文件已迁入本目录，长期[机器验收](../../rust-r2b-validation.json)保留在设计根层。原G1与C受审汇总按原字节独立保留；归档仅变更链接和交付状态，产品源码、实际运行版本及失败分类不变。108操作JSON的operations、sourceManifest和routeDecisions保持原G0快照；当前状态由slices拥有，只将R2B更新为Done。

G4随本归档提交推送和GitHub状态核对生效，最终归档提交SHA由#69的G4评论绑定。只关闭R2B #69；R2A/B累计交付R2的11操作，其余97操作与阶段验收未完成。父#67/#57保持Open，R2C–M为Todo，#61不变。

工作树回收前，Windows原始报告、失败轮次、脚本与截图逐文件复制并校验至`E:/projects/poms/tmp/rust-r2b`，回执为`evidence-preservation.json`；Linux checkout、受控新旧PG15数据库、private journals与二进制继续保留原位置。可再生的工具缓存单独列为排除项，不把它们称作已保存。PG17只作服务元数据观察，保留实例与数据。
