# R4 首批内部共享协议 01

这是联合G1候选输入，签名目前尚不存在；G2由Root实现公共模块，作者只实现各自领域模块。所有返回 `serde_json::Value` 都是内部明确字段的类型边界，不允许把未验证body直接持久化或响应。

## 1. 公共类型与helper

Root拥有 `apps/poms-api-rust/src/contract_support/`：

```rust
pub struct Actor {
    pub id: uuid::Uuid,
    pub request_id: Option<String>,
    pub session: crate::auth::model::ResolvedSession,
    pub request_context: crate::auth::projection::ProjectionRequestContext,
}
// No Serialize or secret-bearing Debug on Actor.
pub enum Error {
    BadRequest(String), NotFound(String), Conflict(String),
    Unprocessable(String), Forbidden(String),
    Selection { ids: Vec<uuid::Uuid> },
    CodedConflict { code: &'static str, message: String },
    Database(sqlx::Error), Common(crate::approval_common::CommonFailure), Internal,
}
// From<sqlx::Error> and From<CommonFailure>; into_api_error retains required statuses.
pub fn money(value: &str) -> Result<i128, Error>; // positive cents
pub fn nonnegative_money(value: &str) -> Result<i128, Error>;
pub fn money_string(cents: i128) -> String;
pub fn ratio(value: &str) -> Result<i64, Error>; // 0..10000
pub fn ratio_string(value: i64) -> String;
pub fn canonical_hash(value: &serde_json::Value) -> Result<String, Error>;
pub async fn lock_project(connection: &mut sqlx::PgConnection, id: uuid::Uuid) -> Result<(), Error>;
pub struct ContractFact {
    pub id: uuid::Uuid, pub project_id: uuid::Uuid, pub status: String,
    pub signed_amount: String, pub currency_code: String, pub row_version: i32,
    pub current_snapshot_id: Option<uuid::Uuid>,
}
pub async fn contract_fact(connection: &mut sqlx::PgConnection, id: uuid::Uuid,
    project_scope: Option<uuid::Uuid>, lock: bool) -> Result<Option<ContractFact>, Error>;
pub struct AuditWrite {
    pub operation_id: String, pub target_type: String, pub target_id: uuid::Uuid,
    pub project_id: uuid::Uuid, pub contract_id: Option<uuid::Uuid>,
    pub before: Option<serde_json::Value>, pub after: Option<serde_json::Value>,
    pub reason: Option<String>, pub metadata: serde_json::Value,
}
pub async fn audit(session: &mut crate::approval_common::CommonSession<'_, '_>,
    actor: &Actor, input: AuditWrite) -> Result<(), Error>;
```

AuditWrite.metadata由helper叠加 schemaVersion=1/projectId/contractId/operationId，领域可传sourceIds/payloadHash；helper不得覆盖真实operator为body。未知SQL映射500，唯一约束白名单409。已知原约束有 `invoice_record_invoice_no_unique`、`contract_contract_no_unique`、`commercial_release_baseline_project_code_unique`、`uq_contract_term_snapshot_contract_active`；新增明确unique索引/约束见schema-freeze01.sql。真实catalog复核若名称不同必须在共同候选修正白名单，不吞其它23505。业务金额不可解析/超容量400，合法语法但金额层/状态不一致C为422。

Root可再提供纯JSON/SQL投影小helper；新增公共签名在正式补充单中统一通知作者，不能三作者各写一份不同公共错误/Decimal实现。

## 2. 领域入口与A/B依赖

各模块 `contract_readiness` / `contracts` / `contract_finance` 暴露：

```rust
pub async fn execute(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    operation_id: &str, id: Option<uuid::Uuid>,
    query: &serde_json::Value, body: &serde_json::Value,
    actor: &crate::contract_support::Actor,
) -> Result<serde_json::Value, crate::contract_support::Error>;
```

operationId和schemaName只能取37清单。Root HTTP验证body/query，UUID path decode后解析，执行前授权。已知path新增query是设计变更，仍不新增canonical method/path。A owns `contract_readiness/` 全目录；B owns `contracts/`；C owns `contract_finance/`。Root owns这些目录之外所有共享产品、Native编译适配、DTO/entity/migration/UI及生成结果。作者不写Git/环境/脚本执行器，仅交纯case和源文件。

A额外暴露真实同连接接口：

```rust
pub async fn load_preparation(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    contract_id: uuid::Uuid, preparation_id: uuid::Uuid,
    require_current_sources: bool,
) -> Result<serde_json::Value, crate::contract_support::Error>;
```

内部PreparedTerms JSON必须含：id/projectId/contractId/version/rowVersion/status/isCurrent/sourceReadinessId/sourceBaselineId/sourceDiffResultId/sourceFacts/currencyCode/contractCoreHash/payloadHash，以及ContractCommercialTerms全部金额/ratio/date/paymentTerms/receivablePlanSeeds。loader持有Project→Contract锁，核同合同及core/hash；require_current_sources=true时核真实R3current与exact diff资格、current准备；false仅用于reject的历史绑定核验，不能赋予新激活资格。服务内部禁止再开连接/控制事务。A09不调用require_current_sources=true，而是消费已Active快照冻结身份。

B额外暴露供Root现R2 handler调用：

```rust
pub async fn validate_review_binding(
    session: &mut crate::approval_common::CommonSession<'_, '_>,
    contract_id: uuid::Uuid, approval_id: uuid::Uuid, approve: bool,
) -> Result<(), crate::contract_support::Error>;
```

approve须真实exact binding及prepared有效；无binding409 preparation_binding_required。reject可无旧binding退回draft，有binding则核真实历史身份/版本/hash但不要求source仍current。实际approval target/type/contract归属仍由现R2 handler核对，不另造placeholder。Root对approve/reject必要audit负责，B不重复写同decision审计。

## 3. outerTX、flush和身份图

Root每请求仅一个借入connection与outerTX，构造新CommonState及PendingAuthentication participant；trace.begin(true)对应真实outer begin，失败rollback丢弃request state，只有真实outerCOMMIT ACK才发布收据。

B submit顺序：Project→Contract锁及全部draft/版本/prepared校验 → 通过common创建Approval/Todo、修改tracked Contract为pending-review → **同outerTX先common flush，materialize真实Approval/Todo** → INSERT立即FK binding → 必要audit → 最后common flush → outerCOMMIT。第一flush可能一次消费pending auth，后续不得重新构造participant重复消费；后续binding/audit/最后commit失败仍回滚前面全部写。不得为绕FK开第二连接。CommonState已flush的Contract原始快照随该outerTX继续使用。

其它命令typedSQL / common写均在同outerTX，末尾flush必要pending auth。纯读、同值PATCH或exact初始化无业务/audit写时不为touch会话专门flush；敏感投影确实产生现security_event时才沿现公共规则与pending auth同连接flush。Query业务无写结论将security_event/auth行单列。

TypedSQL每次INSERT成功可调用session.state.trace.inserted(table,id)，仅记录证据不决定owned；Root仍以真实before-absence/outerACK/after-PG/登记表归属判定。nested savepoint release不能冒称outerCOMMIT。

ContractTerm继续common read_only。首次激活只INSERT新的typed snapshot、更新tracked Contract与typed preparation/package；若同请求已加载该新ID，仅该identity exact refresh，且不得覆盖dirty。不得全局clear或解禁所有read-only实体；新snapshot源prep/hash/seeds为typedSQL读模型，R2读取历史字段不受新列影响。

## 4. 显式读模型与原Native边界

字段required/nullable见dto-freeze01.json。B currentPreparation/latestReviewBinding只含身份/版本/hash/时间，原合同及快照金额仍用现projection。A新增financialProjection沿ContractFinancePackage，以现auth::projection::plan生成隐藏事件；hidden contractTerms/candidateTerms、scalar金额/ratio/自由文本、diff old/new摘要均不得绕入JSON其它字段或business audit。

原Native只作已捕获历史参考。新Rust必满足真实producer模型，不能为了旧Native fake marker补随机preparation/plan ID。Shared/DTO修改造成旧Native编译适配时允许显式legacy本地类型保留参考行为，必须标明不认证新Rust contract，也不能把兼容adapter当真实producer。Root最终G3要说明哪些Native行为只参考、哪些新contract仅Rust与更新后的UI验收。
