# RUST-R2L / BUSINESS-LOOKUP 实施校准检查点

- Gate：G3 Pending。本文件记录实施中的真实差异及修正，不修改联合 G1 受审原件，不代表运行验收或 G4 已完成。
- GitHub：L #79；lookup #84，父 #61。原联合基线见 [实施基线](rust-r2l-lookup-baseline.md)。
- 范围：既有四项 L 操作的原行为等价实现，以及两项业务号 lookup 的直接切换。
- 模式：既有隔离 worktree、solo-worktree checkpoint；Root 集成与实际执行，A/B 分域实现，C 非作者审查。

## 实际参照与差异分类

原应用在本轮新建隔离数据库执行了完整业务链校准 `commnative01`：114 次 HTTP、2,270 条原 SQL 观测，七次请求各实际创建 FinalSettlement 和 RuleExplanation 两行，八个链状态检查。SDK 与 PG 原生 INSERT / 外层提交证书分别保留，原始回执及失败尝试不回写。该运行只证明原实现行为，不自行认证 Rust 等价、整个 R3–R5 或生产部署。

校准确认以下 `new-real-drift` 属于尚未交付的 Rust 候选与原实现之间的实现差异：

- 原持久化拓扑需要 RuleExplanation 对 FinalSettlement 的真实外键依赖。首次两个 CREATE 的顺序，以及存在旧 current 时多次 flush 的 CREATE / UPDATE 次序，不能以统一末尾 flush 代替。
- 两类快照已显式提供主键时，原 INSERT 的 `RETURNING` 只取 `row_version`。候选需保持这一投影，不增加生成主键的处理。
- 原 `onUpdate` 日期在 UoW 变更计算阶段逐点采样，实际 SQL 执行顺序不能代替采样顺序。原 managed-auth 与先前 dirty 的审批、待办、付款记录须参加同一 flush / 外层事务。

修正限定在本片批准的公共机制兼容扩展与实际域 store，不增加表、迁移、crate、产品测试接口或额外业务校验。既有公共 API 入口保持兼容。候选构建、源指纹、原 SQL 与具体拓扑回归分别留证。

## 已执行验证与仍需闭合的边界

- 最终 Rust `candidate08` 的格式、全目标编译、测试、严格 Clippy 和 release 构建均实际退出 0；219 项通过、54 项既有 ignored 保持原标签。主程序 SHA-256 为 `ee558d02f8a5ee7f49d3e3aced266338282e958cf84bf1cb96ef2e3b61b8b475`，169 件来源由独立构建绑定固定。
- 原四项基础 HTTP、两类真实行锁并发及原界面路径已有独立运行原件。最终 Rust release 已完成原 Angular 界面正常操作和登录后受控取消；HTTP / SDK / PG 状态与 UI 截图的视觉稳定性分别记录。
- 只读进程 / socket 观测确认 rootless 容器会改写连接端口，直接以本地端口匹配 PostgreSQL 会话得到 0 匹配。此尝试保留为未绑定事实，没有执行取消，也不作为会话所有权证明。
- 最终 release 的受控联合业务链已实际完成：两端各 114 次 HTTP、127 个本轮对象，40 张相关表逐字段与全部 DTO 的严格比较为 305477 项检查、0 failure / gap / difference；Root 和 C 分别独立重放。原自然时间输入运行仍按真实 308 项 auth_session 差异保留为 Fail：两次独立墙钟在不同请求越过原 60 秒阈值，均发生在 Native 原认证实现，不是 Rust 业务差异。新运行只在每次请求前准备明确归属 session.last_seen_at，12 个显式到期输入原样保留；不修改服务时钟、guard、版本或旧结果。此项分类为 `tool-noise`（原比较输入不等），不将自然运行改判 Pass。
- 共享 UoW 的首次真实多行 coflush 暴露 `new-real-drift`：CASE 更新分支中两个 SQL token 缺少分隔空格，实际 PostgreSQL 返回 42601。修正仅在多行分支增加两个空格，旧单行分支字节不变。失败源码与原回执保留，异常外层事务已按原归属证书清理。本次 candidate08 重建后，成功提交、成功后外层回滚、gate 失败后回滚、gate 失败后继续提交四场景已各执行 Native / Rust；八次 owner 均已退出 0，语义对照与非作者复核单列后才关闭该 P2。
- 十二类 gate / 日期 / current 竞争 / 晚阶段故障均已有原 Native / Rust 实际运行。行锁等待、两个竞争者的真实状态、数据库约束胜负及连接终止在释放锁前取证；旧日期 witness 序列化、模型身份重复归一化及初始准备行时序错误分别作为 `tool-noise` 保留失败，修正后的只读比较使用原输入，不重新伪造运行。candidate07 的这些运行保留原 ELF 标签；最终两空格改动只影响多行更新，由 C 对未变的单行执行路径作显式范围复用，不能称为 candidate08 全部重跑。
- Todo42 采用独立显式 profile；既有四十表夹具默认值与旧证书不改。两端实际执行五组原 mapper 的全 DTO 读取，补充 Lead / Customer 关联、名称变化、processing / terminal、assignee 隔离及真实 createdAt tie。新 profile 覆盖 42 张允许表，另 65 表保留未支持标签；七行只作为来源明确的 prepared facts，不冒称原销售生产者 HTTP 已迁移。
- 两项 lookup 的旧 / 新原应用在独立进程执行；查询解析、精确谓词、404、权限、敏感投影与实际审计路径分别比对。计划条目不计作运行次数，运输层异常须按实际结果分类。
- lookup 原旧 / 新路径的 26 个配对比较已实际通过，SDK、44+44 个完整日期投影和实际审计事件有来源约束。NUL 请求两端实际均为 PostgreSQL 08P01 / HTTP 500，按原错误边界保留，不另造业务 400。
- 双库 migration-check 实际退出 1，属于既有低权限 CHECK 可见性与注释差异，分类 `existing-baseline-drift`；schema dump 退出 0，92 份迁移和完整 107 表 / 1778 列 / 207 外键前后不变，生成 DDL 未执行。
- 原 Angular 的正常与受控取消路径已有真实请求、SDK、PG、进程与截图证据。旧 UI02 缺失的入口来源另按原 dev sourcemap 逐字提取并标注晚补证，未回填旧 runtime manifest。历史许可提示、工作台表格尚在加载的截图和 Todo 区域已就绪的范围分别记载，不认证全页面或最终 ELF 的重新 UI 执行。

## 最终保存证据解释

UoW Source02 的原比较如实保留：成功提交和回滚各 372 项差异，gate 后继续提交 280 项，gate 后回滚没有可比值差异。逐项复核确认，版本和 JSON 差异属于原 ORM change-detection snapshot 与 Rust Data 的表示边界；冻结的 `519a` 量义已经明确不允许对全部内部布局自动作严格相等。原 SDK 7.0.11 的八件确切来源说明 version 属性不进入原 comparable snapshot，JsonType 保存序列化 JSON，而 current 属性与数据库版本仍须严格保持。Source03 只对已登记版本属性和 `participantsJson` 作具名映射，保留双方所有 raw 值及 key inventory，核对 current / CAS、真实 metadata、完整 JSON 数字词法、数组顺序和已存事实；其他字段仍严格比较。

gate 后继续提交的一组时间差异来自取证工具 first-fit 选窗：Rust 的实际毫秒值同时等于 child 结束和 outer 开始。新规则按已观测的首次属性变化及原调用路径指定 outer flush 窗口，并加入越界与错误阶段反例；不修改产品采样、时间原件或版本。以上为 `tool-noise` / 已冻结表示边界的解释校正，未产生 candidate09。

Source03 的 45 项纯检查通过；Root 与 C 分别独立重放四对实际保存输入，合计 30026 项可比检查、0 差异。每对仍明确保留一项 Rust 实际 SQL wire 未捕获的覆盖 gap；实际 Native SQL、编译来源、同连接 PostgreSQL 行和 caller 状态分别证明其声明范围，不将源码推导改名为 Rust wire 记录。此前 42601 多行 SQL 缺陷由最终08真实同表批更新与提交/回滚事实闭合；仅在此有界范围内解除产品 P2，联合 G3 仍须最终保全包与独立决定。

second-freeze 的独立 132 项和 Todo42 的独立 247 项实际复核通过；前者是旧 FSS freeze 与新 current freeze 不等的反遮蔽专项，日期缺失/未来/当天另由 retention-date 实际 400/400/200 覆盖。两项均保留 full107/catalog、归属证书、二次零残留和 writer closeout，不认证完整 R3–R5 生产者命令。

## 收口条件

C 对最终源码、实际验收、差异分类、冻结机器验收与完整保全包完成非作者审查且未闭 P0 / P1 / P2 为 0 后，才可通过 G3。按已冻结联合基线 §9，G3 后提交并推送分支，再做独立固定提交复核、干净主区快进和 main 推送，随后完成生命周期归档及 GitHub G4 回写。原快照中的前期“固定提交为 G3 前置”措辞按此权威顺序解释，不倒写冻结机器验收或初始 tar。

四项 L 实际 G4 后 R2 才可从 104/108 改为 108/108。#61 只在其全部直接子项和自身验收条件满足时关闭；R2M #80 及父 #67 / #57 保持 Open。无部署、生产流量、PG17 变更或真实性能结论。
