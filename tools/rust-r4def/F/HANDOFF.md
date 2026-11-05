# R4F 作者交付说明

基线 `756d813c9578090fcf8e56821acce01b46b40420`，分支 `codex/poms-r4f-cost-governance`。F 只交付 `apps/poms-api-rust/src/project_cost_governance/**` 与本工具目录；Root 在本 WT 写入的 `lib.rs` / `contract_support/mod.rs` 仅用于编译接线，不属于 F 交付。未 commit / push，未修改 Shared、DTO、spec/client、DDL/entity、UI、GitHub 或正式治理文档。

## 实现边界

`execute` 按 protocol01 的 borrowed `CommonSession` 签名接收 12 个现有 operationId。六个写入口不新取连接、不 BEGIN/COMMIT；业务行、唯一当前、完整批次替代、不可变证据、审计与必要投影安全事件共享 Root 的事务。成本、份额和税务事实均不自动 INCLUDED。

- 分摊：严格 18,2 金额 / 18,6 权重，按 UUID 字节序排序、最大余数分配尾差；已知 net/tax 分别分配，gross 为两者之和。未知金额层不补零、不改层；混币、无证明币种、未知所选层拒绝。展示 ratio 6 位，不参与金额反算。`residual_minor_units` 在三层齐全且主层为 gross 时记录 net/tax 两个分量尾差之和（0..2），其它主层为单分量尾差（0..1）。
- 调整：path 锚定旧 result，但新建 basis + 完整新 results，切换旧批状态和逐源占用，保留逐项目 predecessor。锚定项目须仍存在于新完整集合；其它退出项目的旧份额 superseded。仅说明修改也走新版本，不覆盖旧权重、金额或依据。
- 阶段：源有效性、cost/source 版本及已有归属在锁内重验；REGISTERED → CONFIRMED 连同 confirmedAt/By、rowVersion、唯一 attribution 与阶段锁原子写入。已有 CONFIRMED 兼容项必须匹配原具证来源，保留原确认人 / 时间。日期使用既有 Hong Kong business date；签约前成本不要求已移交。
- 税务：受控真实来源或具证 manual assessment；真实 actor 来自会话，金额精确到分、pending flag/amount 相符，替代保留旧链。只保存税务事实，不自动把可抵扣 / 不可抵扣税额再次加进成本。
- 投影：源集合、历史 predecessor 任一 LABOR 即整组污点传播；GET 任一敏感权限不足均用最限制的已登记 package 遮蔽，相关写缺双敏感则 403，值校验错误不回显金额。依据、源金额、ratio、weight、历史和结果复用相同规则。来源项目和分摊目标项目分别执行 projection plan；无额外虚构 scope hook。
- 审计：通用 audit 只写 server-owned identity/status/version/evidenceId 及固定 reason，避免 RuntimeAudit 原值旁路。完整来源、金额、自由说明、阶段 costBefore/costAfter 与版本转换证明保留在同事务不可变 governance evidence。未把 raw source payload 直接返回；受控读视图给出必要来源摘要和金额组。

## E → F 精确接口

直接消费真实 E 模块，不存在模拟生产者：

```rust
pub async fn source_facts(
    connection: &mut PgConnection,
    cost: &serde_json::Value,
    lock: bool,
) -> Result<serde_json::Value, Error>;

pub async fn lock_source_families(
    connection: &mut PgConnection,
    costs: &[serde_json::Value],
) -> Result<(), Error>;

pub fn compare_source_transition(
    cost: &serde_json::Value,
    prior_source_payload: &serde_json::Value,
    current_source_payload: &serde_json::Value,
) -> Result<Option<&'static str>, Error>;
```

cost 为 DB snake_case JSON，金额 / 费率 / 数量以 `::text` 保精度，必须有 `basis_origin='captured'` 与 `source_basis.sourceRowVersion/sourcePayload`。helper 返回 camelCase：`sourceRowVersion`、`currency`、`amountExcludingTax`、`taxCostAmount`、`amountIncludingTax`、`occurredOn`、`sourceStatus`、`sourceType`、`sourceId`、`contractId`、`payableRecordId`、`sourcePayload`，以及新增 `sourceVersionTransition`。三金额 string|null，sourcePayload 为真实 snake_case 行；多余零尾数由 E exact-only 规范至分，非零超精度不 round。

接口示意（只是 typed contract，未作为运行 fact 或验收 fixture）：expense cost 的 `source_basis.sourceRowVersion=2`、`amount_excluding_tax='100.00'`、`tax_cost_amount='6.00'`、`amount_including_tax='106.00'`，真实 helper 对应返回 `sourceRowVersion=2`、`sourceType='expense-record'` 和同币种 / 同三金额 / 同 occurredOn；F 逐项核对，不直接相信客户端总额。

F 先按 UUID 排序锁所有来源和目标项目；任何多源 `source_facts(true)` 之前，先给 E `lock_source_families` 完整真实成本集合，统一排序取得 rate/person families，再逐项重验。不能按成本 UUID 的偶然顺序逐次首次取得全局费率 family。

客户端 cost/source CAS 始终严格。经济事实版本只能通过 E 的具名证明变更：`payable-payment-progress-only` 或 `rate-superseded-covered-period`。每个新治理 evidence 都保存 `sourceVersionTransitions`，保留原 `capturedVersion`、最高已认证 `previousCertifiedVersion`、真实 `currentVersion`、reason、前后 payload hash 与真实 sourcePayload；匹配 cost ID / source type / ID，校验原捕获 hash、当前锚点 hash 与 source row_version。新 2→3 必须再次比较不变 core，不能凭曾通过 1→2 就忽略后续变化。锚点先按已认证 currentVersion 降序，时间 / UUID 仅作同版 tie-break；避免冻结时钟下误选低版本。E immutable basis 不变。

## Root 集成与实际验收

- 最终正常 lib 注册 F 与真实 E；移除 F WT 临时 `#[path="/mnt/e/...E.../mod.rs"]` 编译脚手架。F 不导出路由、不修改公共校验或 Source/DTO 生成器。
- 使用 `joint-g1-06/schema06.sql` 的精确列及 Root 统一迁移。需业务冲突映射的 F 索引包括既有四个 current unique，以及 `uq_r4f_basis_successor`、`uq_r4f_result_successor`、`uq_r4f_stage_successor`、`uq_r4f_tax_successor`、`uq_r4f_allocation_source_current`。复合 source snapshot 的 trace ID 是 `basis_id:cost_record_id`。
- 一条真实正链：E 费用创建 → 真实确认费用 → 成本映射 REGISTERED → F manual/source 具证阶段确认 → 从读模型获取新 cost rowVersion → F 共享分摊 → 读权限矩阵 → 完整批次替代。LABOR / mixed 必须用两项敏感权限的真实角色。
- 实际验收还须覆盖两次 C 付款进度分别刷新版本 proof、旧费率受控未来截短仍覆盖原期间，以及金额 / 期间 / 币种实质改变、来源 / CAS / 并发、证据和 audit / auth / security event 故障回滚。作者纯测试不是这些场景的实际通过证据。
- 非空 `lockedBySnapshotId` 不能仅凭同项目或日期窗口证明 cost membership；当前冻结表没有逐 cost 成员关系，F 拒绝以此伪造锁定依据，留给未来经营 / 重述切片。已被 active allocation 冻结的成本不能普通阶段重分类改变版本；应先走受控治理替代 / 重述链。
- auto 只接受匹配的真实业务里程碑阶段；不会从当前项目阶段、移交已确认或另一条成本的归属推断执行区间。多日 LABOR 不用一个里程碑冒充全期间阶段证明；可提供真实完整期间的 manual 依据或拆分。

## 验证标签

实际作者检查及每个原字节指纹见 `delivery01.json` 与 `build/author-checks*/receipt.json`。检查脚本保留各版输出，不覆盖旧失败。`author-checks01` 为无输出 formatter 日志缺失的脚本错误，非产品失败；`author-checks02` 已跑 21 项纯测试通过、Clippy 有四项作者代码告警，随后修正。最终版本另有显示载体长度回归，实际结论以 final receipt 为准。

本工作树未运行共享 PostgreSQL、migration、HTTP、浏览器、故障注入、并发或真实业务验收；这些由 Root 集中执行。独立 G3 / G4 尚未完成，#109 / #106 / #101 / #57 未在本作者任务中关闭。
