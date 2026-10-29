# R2K＋R4 最小 facts 与两项参数裁决输入

状态：G0/G1 作者 B 输入，G1 Pending。新批次以 `f23490d0f0e145fb030d8f070726dd2aa00cf074` 为来源；不是已完成 L1/#82 的继续验收。用户已授权 K 五操作、R4 最小真实 facts 适配与 #61 的两项 R4 参数裁决；此阶段只读取源码和编写本输入，不改产品、canonical、OpenAPI、client、数据库、Git 或在线 Issue。

使用 `poms-implementation-governance` 及其 governance-summary 的 G0/G1 边界；在线状态与正式 G1 由 Root 核验。本文件与同目录 `facts-route-sources.json` 供同次非作者审查，不自行宣布 G1 Pass。JSON 保存 74 件明确源文件的 raw/LF SHA256、两个当前 operation、全量规范边界、579 件 client manifest、consumer 检索及 originalSeeder recipe。

## 1. 推荐冻结的范围

建议 R4 两项路径参数统一为 canonical `{id}`。只改两条 controller decorator 与对应 `@Param`、完整规范的两个 path key/path-parameter name、原 CLI 生成的两个 RequestParams 及其内部取值/encodeParam metadata、适用绑定与生成客户端测试；业务局部变量、service 位置参数、DTO 字段继续叫 `handoverId`/`projectId`。不新增 alias、路由或 operationId。

facts 产品适配只实现 K 真正调用的四个只读 getter，不迁移完整 R4 query/confirm/rebaseline 写链；不新增 summary、freeze、confirmation 查询，不加 confirmed-only、快照完整性或更强 owner ACL。冻结来源的观察属于 Root 验收生产者事实与边界的证据，不冒称 K 消费了这些字段。

原 draft 创建公开 API 尚未发现，本批不新增、也不宣称交付。R3/R4 其余业务、两个 lookup、L 四操作和 R2M 不在本输入；R4 两项标签同步不增加 Rust 公共操作交付计数。

## 2. K 实际读取的最小事实

权威入口为 `apps/poms-api/src/app/features/attachment/attachment.service.ts:1468–1484`：先判断 `project:read` 或 `project:write`，再按 ID 查 handover；不存在原文为 `Project handover ${handoverId} not found`。随后按 `handover.projectId` 查 project，不存在原文为 `Project ${projectId} not found`。顺序必须保持，不先合并 inner join 造成错误分类变化。没有 owner、confirmed、summary/freeze 门槛。

`attachment.repository.ts:294–295、318–346` 和 `attachment.service.ts:1497–1539` 冻结如下读取：

1. `project_handover WHERE id = input`，产品投影只有 `id`、`project_id`。无状态过滤。
2. `project WHERE id = handover.project_id`，产品投影只有 `id`、`source_lead_id`。来源线索 nullable；源 TS 的分支为 truthy 判断。无 owner/status 过滤。
3. `contract WHERE project_id = project.id ORDER BY created_at DESC`，产品输出 `id`、`contract_no`，供来源标签 `合同 ${contractNo}`。原 K 查该项目全部合同，不采用 R4 detail 的 active-contract 过滤，不额外加 id tie-break。
4. `sales_follow_up_record WHERE project_id = project.id OR lead_id = project.source_lead_id`，仅有 truthy sourceLeadId 才加 OR 分支；`ORDER BY occurred_at DESC, created_at DESC`，输出 `id`。原 K 无状态过滤，不重复返回同一行、不强制项目与线索同时匹配。

候选来源次序是项目、可选来源线索、上述合同、上述跟进、移交自身。作者 A 负责 J 附件查询、version-group 去重、sourceRefs 合并与中文排序。最小 facts getter 不排序或重写这个来源数组，不引入跨调用一致快照或行锁。

K 只读取 handover `id/projectId`、project `id/sourceLeadId`、contract `id/contractNo`、followup `id`。这一字段集合已经与作者 A 交叉确认。`attachments/store.rs:324` 的既有 J handover 投影只有 `{id}`，不能误当 K 所需的项目关联已经交付。

清单 GET 即使已有 selections 也先核真实 handover/project；它在 `attachment.service.ts:927–941` 先读取 selections、写 viewed audit，再按是否有 selections 决定是否收集候选。建包没有 selections 时隐式 refresh（`:1024–1031`），会进一步要求 `project:write`。权限及调用顺序由 K 服务保留，facts 模块不代替它。

## 3. 可冻结的 Rust facts port 与作者分工

建议产品模块为 `crate::handover_facts`，仅依赖已有 `Database`/SQLx，不加 Cargo crate、配置、HTTP、DDL 或域写入。类型与签名候选如下，最终以 Root G1 主包为准：

```rust
pub struct HandoverFact { pub id: String, pub project_id: String }
pub struct ProjectFact { pub id: String, pub source_lead_id: Option<String> }
pub struct ContractSource { pub id: String, pub contract_no: String }
pub struct FollowUpSource { pub id: String }

impl HandoverFacts {
    pub fn new(database: Database) -> Self;
    pub async fn find_handover(&self, id: &str)
        -> Result<Option<HandoverFact>, StorageFailure>;
    pub async fn find_project(&self, id: &str)
        -> Result<Option<ProjectFact>, StorageFailure>;
    pub async fn find_contracts_by_project(&self, project_id: &str)
        -> Result<Vec<ContractSource>, StorageFailure>;
    pub async fn find_followups_for_sources(&self, project_id: &str, source_lead_id: Option<&str>)
        -> Result<Vec<FollowUpSource>, StorageFailure>;
}
```

沿用 `crate::attachment_storage::StorageFailure`，保留单一 `JsString` message 机制，不新建全局 error authority。作者 A 已确认 K 复用原 `Result<T,StorageFailure>`：不存在返回 `Ok(None)`，由 K 按原次序构造 404；SQL/连接错误为原未捕获内部失败的 HTTP500，不错误转换成缺失事实。保持 parameterized UUID 查询的实际 PG 行为，不在此口新增 Rust UUID 预验证或强制 canonical 化。DB 重读 ID 是实际数据库值，调用前的原输入 ID 保持原字符串来源。

每个方法只发对应普通 SELECT，不 `FOR UPDATE`，不打开额外事务、不提交调用方事务、不写审计或 managed session。既有 `Database::with_connection` 的运行策略不扩展。K 的 UoW、pending-auth flush、审计与包生成 catch 边界继续由作者 A 持有，不能为方便 facts 查询而提前 flush。

- 作者 B 在 G1 后独占新增 `apps/poms-api-rust/src/handover_facts/**` 和对应 facts 测试；以及 R4 controller 两个标签/Param 与真实绑定测试。现阶段没有实现。
- 作者 A 独占 K HTTP/service/selection/package/ZIP 业务及其测试，调用此四 getter；不复刻另一套 facts 来源。
- Root 持有 Cargo/lib/router 接线、完整 spec、generator baseline/CLI、环境/fixture、真实 PG/HTTP/UI、证据与治理。Root 冻结 `Arc<HandoverFacts>` 的构造/注入方式；B 不修改共享构造器或配置。
- frozen-field/producer 来源观察只由 Root 验收工具读取，明确撤回额外 `EvidenceFact` 产品 API 候选。

## 4. R4 事实生产者与 prepared-state 来源

`ProjectHandoverRepository.create()` 虽定义于 `project-handover.repository.ts:36–38`，本次全 `apps/poms-api/src/app` 的有限检索未发现生产调用方。原 workflow 名称虽然含 through public APIs，它实际上从原 seeder 准备好的 draft、摘要、基线、已确认参与人开始，不证明公共 API 从零创建 draft/摘要/参与人已存在。

固定原输入为：

- `apps/poms-api/src/seeders/database.seeder.ts:1195–1225`：`seedProjectHandoverE2EFixtures`，原 package definitions 及 fixture dispatch。
- 同文件 `:1279–1531`：`seedProjectHandoverE2EFixture`，project、contract/current snapshot、commercial baseline/diff、readiness 及 prepared-state 调用；`:2063–2104` 给具名 fixture 与参与人 ID 派生。
- 同文件 `:1535–1685`：`seedProjectHandoverPreparedState`，两个 summary snapshot、draft handover、confirmed confirmation_record 和两名 confirmed participants，另有可选 processing rebaseline/freeze 分支。
- `apps/poms-api-e2e/src/support/project-handover-seed-fixtures.ts` 的 `main` 与 `project-handover-workflow.e2e-spec.ts:22–69` 的真实 GET/detail/POST confirm/GET 场景。HTTP helper 在 `support/project-handover-api.ts:26–40`。

Root 新夹具建议采用原 `makeHandoverE2EFixture(2, 'main', true)` 的形态，替换为 fresh owned UUID/marker，不执行原 seeder 全局清理，不复用静态 E2E ID。原 main 已有 draft，confirmation 及 execution-owner/sales-owner 参与人已 confirmed；这一步应标签为 **originalSeeder prepared state**。本批可另外见证已交付 L1 的公共机制，但不能把本片未执行的初始化写成 R4 公开命令成功。

### 4.1 真实表、关键边与 ownership

JSON 的 `preparedStateRecipe.tables` 从这三个固定函数中的 INSERT 机械抽取列名、行号和 actor/ownership 列，列明以下范围。它是来源清单，不是已执行 SQL：

1. `approval_summary_package_definition` 两行：scenario/package/projection/export 规则，`created_by/updated_by`；原 `handover-confirmation`/`contract-handover-summary` 与 `project-handover`/`project-handover-confirmation` 组合，projection=`handover-confirmation`，export=`handover-controlled`，active。
2. `project`：id、具名编号/名称、active/handover，`owner_org_id/owner_user_id/created_by/updated_by`；原 main 的 customer FK 为 null。可选 sourceLeadId 关系是 K 额外真实来源验证，不伪称原 main 原本就有。
3. `contract` 与 `contract_term_snapshot`：双向 current_snapshot_id/contract_id 关联，原 active 合同与 active snapshot；contract 的 `created_by/updated_by`，snapshot 的 `effective_by/created_by`。原 recipe 先 contract 再 snapshot 的创建顺序需要按真实现有 DDL/SQL见证处理，不能以未运行推断所有 FK 时点。
4. `commercial_release_baseline`、`commercial_baseline_diff_result`：project/baseline 关联，baseline effective/current，diff approved/not-required；baseline 的 `created_by/updated_by`。原先插 baseline 的 latest_diff_result_id=null，再精确更新为已插 diff ID。
5. `contract_readiness_package`：project/source_baseline/latest_diff/initialized_contract_snapshot 的真实关联，initialized_receivable_plan_version_id 按原 recipe 字段保留，initialized/current 的原状态与时间、`created_by/updated_by`。原这个函数没有 INSERT receivable-plan-version 行，不能凭列名编造一个已通过真实写链的额外表。
6. `approval_summary_snapshot` 两行：project→contract summary、handover→handover summary，各自 package FK、scenario/projection/export/business status/generated_at/status/actor。
7. `project_handover`：project_id、contract_summary_snapshot_id、effective_handover_baseline_snapshot_id、summary_snapshot_id、nullable handover_rebaseline_record_id；原 main draft、confirmed_at/by=null，`created_by/updated_by`。
8. `confirmation_record`：targetType/confirmationType/businessDomain=`project-handover`，target_id=handoverId、project_id、confirmed/required_count=2/confirmed_count=2、submitted/confirmed_at、actor。
9. `confirmation_participant` 两行：各自 fresh row ID、confirmation_record_id、两个实际 owned actor UUID、execution-owner/sales-owner、confirmed、confirmed_at/comment/displayName、`created_by/updated_by`。不能把 participant row ID 与 participant_id 混为一项。

receipt_record/payment_record、processing-rebaseline/amendment/impact、原 optional pre-seeded receipt freeze 不属最小 main 先决条件；若选其分支必须完整记录其原 recipe 和 fresh ID 映射。为了证明实际 confirm 新建 freeze，起点不能预置 current freeze。lead/followups 合法来源另按现有实体与已有 owned 基础夹具准备，关联/actor/ID 都登记；不拓展客户销售写链。

完整 fresh 映射至少涵盖 actor/viewer/org、两 package definition、project/contract/term snapshot/commercial baseline/diff/readiness/receivablePlanVersion 标识、两个 summary snapshot、handover、confirmation record、两个 participant row。所有 FK、target_id/source_id、actor/owner 字段必须经同一映射，不仅替换顶层 ID。原编号/名称也换成本 run marker；逐项 durable intent、插入回执、精确 ownership/关联验证、反向 cleanup，不能按前缀清理。若重用本 run 已有 actor/org，记录它们的 owning fixture，不将别的库/旧 batch/真实账号当 owned。

### 4.2 实际 confirm 与事务见证入口

原 controller 两条路由之外，不迁其业务。`ProjectHandoverCommandService.confirmProjectHandover:34–89` 的路径是读取 existing handover→expectedVersion→draft→contractSummarySnapshotId匹配→真实 query detail（包含 active合同/readiness/summary/baseline/参与人）→逐参与人校验→设置 confirmed/confirmedAt/by/comment/updatedBy。可选 receiptJudgmentMode 再查 current freeze，已存在为409，否则构造实际 freeze。

不带 receipt mode 调 `ProjectHandoverRepository.save` 的 `persist(handover).flush()`；带 mode 调 `ProjectReceiptJudgmentFreezeRepository.saveWithHandover` 的 `persist([handover,freeze]).flush()`。这不是显式 service transactional，也不能仅凭一个 flush 就宣布 SQL 顺序、auth coflush、CAS、并发唯一性或失败后 identity-map 行为已经验证。Root 在新受控 PG/原 Nest 先见证：

- prepared draft 实际 GET 与成功 confirm、不带/带 mode 两条分支，捕获 response、所有真实 SQL/事务、handover 版本及 actor/time/FK；支持确认成功但无 freeze 的原分支。
- 带 mode 的实际 INSERT freeze 必须 sourceType=`project-handover`、sourceId/sourceHandoverId=实际 handoverId、sourceHandoverSummarySnapshotId=同一 handover.summarySnapshotId，nullable rebaseline、current=true、frozenBy=actor；追踪实际生成 ID，不从 fixture猜 ID。
- 原 stale expectedVersion409、缺参与人400、存在 current freeze409；失败前后行状态/版本与对象副作用实测。原 workflow 已提供这些业务入口，但本输入没有运行它们。
- K 在同一组真实 confirmed/freeze facts 上实际读项目关联、清单/刷新/包，证明消费者边界；另外真实 draft 也应被 K 正常接受，freeze缺失不改变其 gate。K 不能回写 handover/snapshot/confirmation/freeze。

`ProjectHandoverQueryService:60–128` 的完整业务投影不是 K 的 facts 口。它读取 active contracts、readiness、active contract summary、handover summary、latest confirmation progress/current freeze、rebaseline/impacts，并做 sensitive-field projection。原生产者依赖与候选 K 最小读取必须分列，不能将两者字段混成同一 API。

观察字段（仅 Root 验收）：handover 的 status/rowVersion/confirmedAt/by、contractSummarySnapshotId/effectiveHandoverBaselineSnapshotId/summarySnapshotId/nullable rebaseline；实际 summary 的 target/package/projection/export/status；confirmation record/participants 的 target、角色、状态、counts；freeze 的 id/project/mode/sourceType/sourceId/sourceHandoverId/sourceHandoverSummarySnapshotId/nullable sourceHandoverRebaselineRecordId/isCurrent/frozenAt/by/supersedesId/rowVersion。对照实体 `project-handover.entity.ts:100–171、210–294` 与原迁移。无记录保持无记录，不补 fake ready/frozen/成功。

## 5. #61 两项 R4 参数裁决

authoritative inventory 为 `docs/design/api-route-canonical-inventory.md:100–101`，ADR-015 `:133–166、179–182、240–242` 明确 item `{id}`、命令 `:verb`、受控单次收敛与 alias 例外条件。

- GET 当前 `/api/project-handovers/{handoverId}`，目标 `/api/project-handovers/{id}`；operationId=`ProjectHandoverController_getProjectHandoverDetailByHandover`，`project:read`，原 JSON200。controller `:36–41`。
- POST 当前 `/api/project-handovers/{handoverId}:confirm`，目标 `/api/project-handovers/{id}:confirm`；operationId=`ProjectHandoverController_confirmProjectHandover`，`project:write`，原 JSON200。controller `:44–50`，Nest decorator 保留 literal colon escape，只把 capture 和 Param key 改为 `id`。

保留 controller method 名、局部 `handoverId`、真实 req.user/sub、body、sensitive projection 的实际 URI、service 参数顺序；project 路由的 `projectId` 完全不动。`ConfirmProjectHandoverRequest` 的 comment/participantConfirmations/receiptJudgmentMode/contractSummarySnapshotId/expectedVersion 与 `ProjectHandoverDetailView.handoverId/projectId`、confirm response targetId 均不改。DTO 实际定义在 `libs/api/contracts/src/lib/contract/contract.dto.ts:53–57`，共享 schema 在 `shared-contracts.ts:6358–6418`；不能错误地改 project DTO 或全局 handoverId 字段。

保留当前 `handoverId` 的方案只少改当前实现，但需正式修订既有 canonical/ADR依据且保持长期不同 item 标签；目前无新的业务语义或不可控外部调用方依据，推荐不采用。裁决不是仅改两行文档；完成条件包含真实 Param、完整 spec/client 与测试同步。

### 5.1 命名 request object 与调用方

生成配置 `useSingleRequestParameter=true`。生成 service `libs/shared/api-client/api/project-handover.service.ts:38–49` 的两个接口分别持有 `handoverId`，confirm 另持有 `confirmProjectHandoverRequest`。目标只将这两个 path 对象键改成 `id`，对应读取、required-parameter 错误标识与 encodeParam.name 会按原 generator改变；不能手工编辑生成 service。observe/reportProgress/options 仍为后续位置参数，body key不改。

机械扫描当前全部 `apps/**/*.ts` 与 `libs/**/*.ts`，排除 generated client，未找到这两个 generated 方法/RequestParams 的命名对象消费者（JSON记录 pattern/扫描数/空结果）。不要把此前 K 的四个 consumer 改动复制到这里；project workspace 实际使用 projectId 查询不在两项内。原 API e2e 使用 literal URI helper，原 route 标签变化不改变具体 URL，所以 helper函数/位置参数及 fixture.handoverId 保留。14处 literal path引用已登记，包含 K 的其他路由，不是14处待改项。

原 `project-handover.controller.spec.ts:64–100` 是直接 method delegation，须保留并补真实 Nest HTTP Param 绑定（实际 URL与权限 metadata、actor/body/业务参数转发）；不能靠直接调用 controller 证明 `@Param('id')`。成功 producer 业务另由 Root 原 Nest/PG验证；绑定测试不认证 Rust R4写链。

### 5.2 完整规范、579 client 与生成保护

当前 full OpenAPI 为237 paths/291 operations/585 schemas。两个 operation的完整原 JSON、其余289 operations 的确定排序 canonical SHA、components/top SHA、全 paths/schema 名单及579client raw/LF逐文件 manifest在 JSON，全部仅是当前输入指纹，不是新生成已通过。

Root 实施顺序建议沿已验生成协议：G1明确批准后改两项controller/绑定测试→原 `poms-api:openapi` 导出全量规范→精确 inverse 两项标签后等于原 full spec、其余289操作/所有schema/security/DTO不变→独立非作者短审 exact generation-input diff→本地 feature-only 实际 S checkpoint commit→新baseline仅更新 sourceHead/specHash/two mapping→原 CLI generate/check（固定7.20.0 JAR，SHA `871e0155287a87b579ff31096b2d45b1f95a115edfe631411ec6cff4848d0f03`）→实际客户端/调用方检查。

当前 generator baseline sourceHead=`687827d45da2047028f625a600fe207876d40d6f`，六 protectedSources为 fullspec、generator config、openapitools、package、pnpm-lock、gitattributes。`shared-api-client.mjs:149–170` 的原 guard对 working tree、index、untracked 及LF指纹均拒dirty，不能只改hash/删除路径/跳过guard。新 S 仍需在最终 main 的实际可达祖先中；Root负责 checkpoint与正式baseline，不让作者为过检查自行提交。

预期579client只有 `api/project-handover.service.ts` 随两个参数标签改变；其余578件（含3个手管metadata）逐文件保持。若 generator产生其他变化应逐项解释/裁定，不能自动接受；source input manifest也不等于再次生成/check Pass。

## 6. G1 待冻结项与验收执行清单

- Root冻结 prepared-state recipe、fresh ID/actor/org全映射与owned lifecycle；把原初始化输入和实际 Nest confirm/freeze输出分列，明确未交付 draft创建/RustR4业务。
- Root采用四getter/StorageFailure及Arc构造接线，确认作者B/A所有权；没有额外freeze/snapshot产品查询。
- 两条 canonical `{id}` 的精确source/spec/client/inventory同步与新生成S方案，保留#61其他lookup打开；不全局重写旧R0/L1/IJ原件/指纹。
- G1后产品facts实际PG读取：missing handover/project、null/有sourceLead、project OR lead跟进、合同无status过滤、原排序、malformed UUID/真实不存在UUID行为、权限前置，及只读表前后不变。使用真实 owned行/原Nest producer，不mock响应。
- K五操作、ZIP/对象/版本/敏感/audit/UoW/TTL/错误路径的实际双端验收由A/Root主包冻结，本输入不重复提供存储authority。
- 路由最小检查：poms-api lint/受影响controller tests/API build与full OpenAPI消除；shared-api-client 原生成/check/build；受影响admin-data-access/admin既有target与原HTTP helper编译/e2e。无实际named消费者时不制造虚假consumer用例；可以验证原生成方法真实请求对象/URL/body。
- DB92migration/catalog只读检查与已有失败分类沿新主包冻结。B未启动DB、服务、容器或编译，也未写Fixture/产品/DDL；源码和原单测不是本批 runtime Pass。

本输入支持本批 G1 审查，不关闭 #78/#61/R4 或父阶段；最终能认领的交付与 Issue checklist 由 Root 依据完整实际证据决定。
