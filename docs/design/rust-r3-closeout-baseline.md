# RUST-R3-CO 联合实施与阶段验收基线

- Gate Status: Pending；本文件是联合 G1 候选，独立审查和线上冻结前不进入产品实施。
- 日期：2026-11-03（Asia/Tokyo）。来源：main `5041275d7ad82af4becbb4462e7213ffe465bc7a`。
- 在线：#57 → #85 → [收口父片 #97](https://github.com/illusion-tech/poms/issues/97) → [A #98](https://github.com/illusion-tech/poms/issues/98)、[B #99](https://github.com/illusion-tech/poms/issues/99)、[交付审计与验收 #100](https://github.com/illusion-tech/poms/issues/100)。
- 类型：cross-layer-high-risk；沿用 solo-worktree checkpoint。Root 在干净的既有 managed worktree 创建 `codex/poms-r3-closeout`；primary 保留。作者修复使用单独 checkout，Root 单一集成。
- G1 / G3 / fixed-commit / G4 由未参与本批产品、执行器和治理实现的独立审查者完成。三作者及审查者显式 `gpt-6.1-sol` / `max`，Fast 无独立控制参数，保持未核实。

## 1. 本批范围和可依赖边界

R3 A–K 的 58 项 HTTP 操作已各自 G4，#86–96 全部 Closed。该事实只作为本批输入；完整 R3 内部机制、审批归属和阶段集成尚未认证。本批核对逐项交付，对真实遗漏做最小修复，并在统一候选上完成必要阶段验收。默认新增公共操作、路径、DTO、schema、permission、migration 和生成客户端均为 0。

完成条件是三条交付线、当前候选验收、独立 G3、固定提交、main 集成、归档保全、独立 G4 和线上本地状态全部一致。只有这些条件实际满足，才关闭 #98/#99/#100/#97 及 R3 父 #85；总体 #57 保持 Open。R4–R7 按自身 G1 后续推进。

不增加通用 R3 审批处理器、后台调度或迁移接管；不把未来 R4/R5 生产命令作为 R3 阶段循环等待条件。无部署、切流、旧运行时退出、真实租户接管或性能收益结论。Windows 浏览器连接 Linux Rust 服务的轴不改称 Windows 原生 Rust 服务认证。

## 2. 正式输入与业务准绳

正式输入是迁移计划 §1.1/1.2、R3 归属与阶段边界，ADR-015/017/018，现行 canonical inventory、Native、共享 Zod、完整 OpenAPI、生成客户端和 92 个 migration，以及 R3 A–K 的冻结输入、独立决定和最终收口。当前机器清单为 `rust-r3-operation-slices.json`；旧时点 frozen 原件不回写。

本批 `g1-input-manifest01.json` 记录直接来源、235 个左右的当前 Rust 工程文件、原保护集合 1373 项及作者输入的实际数量和 SHA-256；以实际清单为准。58 项均须 canonical aligned 且唯一归属。Rust 当前总数 173 操作 / 138 路径 / 585 schemas；Native 237 路径 / 291 操作 / 585 schemas；客户端 579 文件，migration 92。G3 对实际候选重新绑定，来源变化须做影响分析。

用户已明确：以业务语义、正确性、合理性为准，不追求 Node bug 级对齐。必要业务状态、评分快照、已注册必要审计及业务侧写入须在调用者同一事务整体提交或回滚；审批失败不得留下已提交状态。独立业务号预留允许失败后有计数空洞，按既有明确决定单独记录。会话保活与业务写分列；查询和真正业务 no-op 不制造业务版本、快照或审计。需要新增业务决策的差异才提交用户裁决。

SSOT：UUID 按身份比较，不让大小写拼写改变合法关联；业务号仍是业务号。日期型字段保持 date，`plannedSignAt` 保持既有 ISO datetime。金额使用精确 Decimal，quantity/unitPrice 最多 4 位，税/毛利 8 位的既有 signedness 和存储界限保持。Missing / null / value、状态、CAS、current/supersedes、权限和错误协议依各正式来源。过时的 Node 故障或偶发 flush 顺序只作调查见证，不当正确性目标。

## 3. 审批与非 HTTP 归属

R3 的审批是 Lead 人工评分覆盖 submit / approve / reject / revoke，位于 `leads/service.rs`，由 #93 交付；本批复核资格、状态、版本、语义去重以及必要快照/审计回滚。

通用 `OriginalApprovalDomain::apply_with_session` 的 contract / contract-review 属 R4；commission-payout 与 commission-adjustment 两组属 R5。R2 已交付公共 Todo / approval / summary / confirmation 机制及冻结最小真实消费；本批只对 R3 真实调用链复核。未发现 R3 通用 ApprovalRecord 生产者，不能虚构 handler 或用未迁 R4/R5 写链阻塞 R3。

逐链矩阵由 A/B/D 输入列 source → caller → transaction/lock/CAS → guard/no-op → 原证据及哈希 → 本批实际断言。至少覆盖评分事实/触发与快照、覆盖审批、转换项目/真实附件、客户/联系人/别名、跟进/Todo、销售情报/讨论、成本/竞标/报价、工作区与时间线。情报写入不自动重算 Lead 存储评分，沿现有明示触发。未发现 R3 scheduler 只能作为源代码结论，主机任务接管属 R6。

未来合同、资金、移交和佣金事实的只读适配可使用逐项声明的合法 prepared facts，标明来源、写入、外层提交、独立可见性及清理；不能冒称本批完成未来生产命令。

## 4. 三线归属和已知补缺候选

A（#98）独占 `apps/poms-api-rust/src/leads/` 中非 `http.rs` 产品与纯用例定义。B（#99）独占 customers / customer_contacts / sales_follow_up / sales_intelligence / business_discussions / project_workspace / project_technical_cost / project_bid_commercial / project_pricing_margin 中非 `http.rs` 产品与纯定义。第三线 D（#100）负责交付矩阵、54 ignored 逐项分类和 E1 受支持重放工具，不参与独立 Gate 审查。各线不得并写他人目录。

Root 独占所有公共 HTTP / lib / Cargo / toolchain / 共享桥、原 UI 精确两文件修复、正式治理、Git/GitHub，以及所有安装、构建、测试、环境、fixture、HTTP、DB、浏览器、故障注入、清理和保全执行器。作者不读取任何旧 private，不执行环境程序；只提交纯定义和独占源码变更。阶段矩阵实际运行串行统筹，共用检查不按子 Issue 机械重复。

G1 前静态发现，纳入本批的修复与真实验收：

- Customers / Contact CAS0 被 store 的 Protocol 错误变成 500；真实并发应仅一方提交，另一方 409，必要会话/审计整体回滚。
- Customer 相同业务值由另一 actor PATCH 时，updatedBy 不应单独制造版本/审计；UUID 大写 ownerOrg 的即时响应与后续 GET 应指向同一组织并返回名字。
- Lead 转换原 UI 把非空 `plannedSignAt` 发为 date-only，违反已有 datetime 契约。Root 仅修改 `apps/poms-admin/src/app/features/lead/lead-list.ts` 和其 `.spec.ts`：所选 Date 使用标准 `toISOString()`；其他 date 字段不变，不放宽公共 DTO。Angular 22.1.6，遵循 Angular 技能，执行受影响 lint / unit / production build 及真实 UI 非空日期转换。
- Lead 系统重算与快照构建分别读取评分 facts，可能形成已存分数与 breakdown.total 不一致；人工审批在新情报写入后也会使用旧系统分数和新解释。系统重算须用同一 materialized 结果同时落 Lead 与快照；正常人工覆盖/撤销沿用匹配的已存系统 tuple，不触发无条件重算。

2026-11-03 用户针对历史 Lead 缺少可匹配系统快照作出明确裁决：**审批事务内先补算系统评分并留快照，再执行覆盖审批；任一必要写入失败整体回滚。** 该 fallback 须核真实当前生产者路径及逐项声明的历史无快照 prepared sample，验证 system/manual 两快照与 Lead 一致、必要 snapshot/audit 故障完全回滚。查询仍不回填，不新增情报写触发器；不能把猜测的历史解释冒充已知 facts。

这些是冻结的缺口候选和验收要求，静态审计不是实际通过。G2 若发现新的实质设计/边界差异，保留失败、建立 corrective checkpoint 并独立复核，不倒改本 G1。

## 5. 本批统一验收矩阵

计划数不是通过数。所有实际结果绑定同一最终产品输入清单和构建产物；修复前失败、partial、旧候选和复用证据分列。

- M0：原完整规范和生成树保护；173/138/585 当前 Rust 路由集合；R3 58/58 每入口至少一有效调用，完整 method/URI、缺会话、CSRF、权限与拒绝无成功副作用集合。有效调用可以由后续链路覆盖，但每项必须有实际 request/response/receipt。
- M1：新数据真实客户/别名/联系人 → Lead/情报事实 → 评分/人工覆盖审批 → 资格/转换；真实附件上传和可复制集合 → Project；同一候选查库核对关系、分数、状态、原线索附件和复制附件。
- M2：Project 成本/竞标/报价版本及精确金额 → 销售跟进/唯一 Todo → 情报/讨论/工作区与时间线；原生 R3 生产者和未来 prepared facts 分列。查询、无变更、不同 actor no-op 均核业务表、版本和审计不变。
- M3：每条必要事务路径的 business / snapshot / registered audit 故障整体回滚并恢复重试；customer/contact/lead/override/情报 CAS；F 空流目标锁与同源版本冲突；版本 current 唯一和金额边界。不重复未变更全部历史深层矩阵，但必须给来源到候选的影响分析。
- M4：真实 Angular 登录后的客户、Lead/人工覆盖及填写签约日期转换、情报/讨论/项目工作区旅程。Linux Native/Rust、Windows Native、Windows 浏览器 → Linux Rust 四轴；每轴独立 actors/cohort，断言真实网络、完整响应和 PG 结果，禁止 route mocks / DOM 注入 / 失败后 fallback。截图实际审看，既有许可提示如实保留。
- M5：E1 支持入口实际代表性重放、5 alias 删除后成功、原字节归档验证；全 owned 数据图/对象/权限/日志设置终态恢复，二次清理零变化；本批进程与 PG 停止，保留卷和恢复日志。

原 Native 未改的 1373 项中除声明的两 UI 文件外均须精确匹配；原双端深层见证可按来源不变/因果影响说明引用，不能计本批实跑。UI 变更后的四轴必须重新构建/运行。所有 inherited ignored 按真实原因分类；普通 cargo test 中 53 个 DB opt-in 和 1 个显式子进程 fixture 不会自动变成通过，要求的当前集成语义由本批实际 PG/HTTP 另证。

## 6. 隔离环境和证据

新 Linux checkout `/home/wangzishi/projects/poms-rust-r3m`，state `/home/wangzishi/.local/share/poms-r3m`，新 private 0700、文件 0600；Windows 本批 state `%LOCALAPPDATA%/poms-r3m`。新 PG15.12 容器/卷 `poms-r3m-pg15` / `poms-r3m-pg15-data`；新 marker、secret、`poms_r3m_nest` / `poms_r3m_rust` 与低权 `poms_r3m_app`。

端口仅 loopback：PG 23433 → 15432、Linux Native 13400、Windows Native 13410、Linux Rust 13500、UI 13600。执行前 bind 核对；原 92 migrations 和显式 seed 仅进入新库，核 schema catalog（107 表 / 1778 列 / 207 FK 以实测为准）。迁移仍是原单一执行方，不增加 Rust migration。旧 PG17 不 SQL、不重置、不停止；旧 private、cohort、密钥不读不复制。

固定公共镜像、Node/Rust 工具链、依赖下载缓存及浏览器 executable/library/font pin 可以只读复用并校 hash；不得把旧 private、JWT、auth 原始输出当缓存。原始 HTTP auth、凭证和原 SQL 流只留本批 private；公开保留脱敏派生结果及私有原件哈希，绝不无标记编辑原件。当前来源和产物集中捕获一次，各阶段引用，避免大树重复复制。

清理只按本批 marker、run ownership 与明确 FK 图，保留 seed 原行、未拥有 facts、编号预留和所有权边界；失败也入 ledger。最终归档到 `docs/design/archive/slices/rust-r3m/`，保留逻辑原路径和逐字节映射，历史 failed / partial / stopped / uncertified / quarantine 原标签不变。

## 7. E1 本次重新审定与退出

上批允许的 5 个 regular compatibility aliases 共 419264 字节，23 个直接消费者，Root 负责，2026-11-09 不延长；其审查结论仅对上批有效。本次 G1 请求独立审查在原期限内、仅为本批退出工作继续保留同样 5 个逐字节别名，不能新增镜像或消费者；必须在本批 G3 前完成退出。

D 输入列精确 alias → canonical archive → SHA、23 consumers 的历史/当前支持分类。实现小型 canonical archive/hash resolver 和受支持 replay 入口；历史 frozen 工具保持原字节，以受支持入口解释历史逻辑路径并实际重放代表性 manifest、fixture builder 和只读验证。删除恰好 5 aliases 后证明支持入口仍可用、归档 hash 不变、无新增路径镜像；历史脚本原始 hardcode 限制如实声明，不声称其未经适配可直接运行。必要时本次审查拒绝继续保留即先以临时支持入口退出，不以 E1 为无限期例外。

## 8. 检查与 Gate

统一候选执行 cargo fmt / clippy all-targets deny warnings / locked offline test all-targets / release；受影响 admin lint、相关 unit 和 production build；必要 API build/回归、当前 HTTP/PG、完整规范/schema/client/migration 保护以及只读 migration-check。原已知低权 CHECK/comment drift 独立标注，不执行建议 DDL。未触及的产品全量 lint/test 可列不要求及原因，不将 mock / 静态 / 历史 / 当前实跑混算。Markdown check 和 git diff check 必须通过，无新增未解释 warning。

G1：独立结论和精确 manifest 在 GitHub 冻结后 G2。G3：三个子片和全部必要实际验收、drift、终态、保全及 E1 退出完成，无未闭 P0/P1/P2；随后提交/分支 push → 非作者固定提交 → 干净 primary FF/main push 与集成核验。G4：生命周期归档、精确原字节/远端状态读回及独立实际关闭许可，才在线收口 #98/#99/#100/#97/#85；#57 保持开放并更新 R3 checkbox，R4–R7 仍未完成。
