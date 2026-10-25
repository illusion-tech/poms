# Rust R0 数据库、事务与数据类型盘点

## 1. 边界与证据等级

- 基线提交：`033aedd028fc25ea990450a7854fc92c567cfb8a`，盘点日期：2026-10-26。
- 直接输入：[Rust 后端迁移方案](backend-rust-migration-plan.md)、[ADR-012](../adr/012-data-persistence-technology-selection.md)、[schema DDL 设计](schema-ddl-design.md)、`CLAUDE.md` 与 POMS 实施治理技能。
- 切片性质：`docs-only`，附带离线证据提取工具；没有 Rust 应用、DDL、业务行为、依赖、数据库或部署变更，没有性能实测。
- 本文记录当前源码的兼容基线。正式规则发生变化须另立规则切片；不能在 SQLx 改写中顺便修正金额、日期、状态或事务边界。
- **JSON 生成与源码盘点没有连接数据库。** 表数指源码中的物理表映射。随后根据用户环境要求只读核实了本机/TEST 的版本、扩展、locale、会话时区与 schema 计数，结果见第 8 节及[环境清单](rust-r0-environment-inventory.md)；未核实完整 DDL、迁移历史、业务行、database/server timezone 或角色权限。静态 JSON 的 `databaseConnected: false` 继续只描述离线生成器。

完整、逐项、可复算证据在 [rust-r0-database-inventory.json](rust-r0-database-inventory.json)，提取器为 [rust-r0-database-inventory.mjs](../../tools/rust-r0-database-inventory.mjs)。提取器只读取源码与 Git HEAD，不导入应用模块，不读取私有环境文件，不执行 SQL。

```powershell
node tools/rust-r0-database-inventory.mjs
node tools/rust-r0-database-inventory.mjs --check
```

JSON 中 `entities` 记录每张表的文件、行号、全部字段、关联、索引、约束及涉及迁移；`migrations` 保存每个迁移的 up/down 可达 `addSql` 源码、分类与 SHA-256；`transactions`、`serviceMethodGraph`、`persistenceSites`、`concurrencySites`、`numericSites` 分别提供事务、调用链、保存与数值证据。`dataTypeMatrix` 可直接作为后续切片的字段检查输入。

提取器使用 TypeScript AST；SQL 模板插值保留源码而不求值；迁移私有 helper 从 `up`/`down` 的 `this.helper()` 调用图归属。`addSql` 调用点数量不是数据库最终执行的 SQL 条数。业务静态调用图最多跟踪五层，长调用参数/内联回调保留行号、摘要和原文 hash，不能证明 request context、动态派发或数据库锁的运行行为。

`baseline.head` 固定为已审查源码参考提交，后续纯文档提交不使 `--check` 失效。生成/检查前会只读比较 API 源码、API project 配置及部署迁移 gate 相对该参考的差异，也检查未跟踪输入；存在变化则拒绝继续，要求重新审阅并显式更新参考提交。该 guard 的输入范围没有因 R0E 文本规范化而扩大或放宽。

JSON `formatVersion = 2`：所有文件以 UTF-8 文本读取，只执行 `text.replace(/\r\n/g, '\n')`，在 AST parse/getText、源片段提取和哈希之前统一 CRLF→LF；不移除 BOM，不改裸 CR、Unicode、其他空白或源码中显式转义值。已经解码的 SQL literal/JSON 语义值不再做全局替换。`fileHashes[].sha256` 与生成器自哈希标识此规范化 UTF-8 文本，长度字段为 `normalizedUtf8Bytes`，不能误称原始工作树字节 hash。`--check` 也只在 JSON 文本层采用同一换行规则，允许 Windows/WSL checkout 换行形式不同而保持相同证据。

## 2. 重新核验的数量与归属

| 口径                               | 数量          | 解释                                                                                                       |
| ---------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| `.entity.ts` 文件                  | 78            | 与原方案一致，一个文件可定义多个实体                                                                       |
| `defineEntity` 定义 / 不重复表映射 | 106 / 106     | 全部显式使用 `poms` schema，106 张表均找到历史 `CREATE TABLE` 来源                                         |
| migration 文件                     | 92            | 从 `Migration20260322193000_init_project` 到 `Migration20260610120000_ex72b_external_org_sync_persistence` |
| up 可达 `addSql` 静态调用点        | 2654          | 包括私有 helper，包含注释、DDL、数据及初始化逻辑                                                           |
| 映射字段                           | 1775          | 不是数据库实际列数认证                                                                                     |
| 平台 / 业务 / 外部集成表           | 27 / 71 / 8   | 责任归属不等于迁移时可以独立上线                                                                           |
| `.transactional()` 调用点          | 43            | 41 个业务回调与 2 个 repository 委托包装，不是 43 个独立顶层事务                                           |
| 显式 `.version()` 映射             | 79            | 仅这些表表达 ORM 行版本自动管理意图                                                                        |
| numeric 映射字段                   | 79            | 67 个 `p.decimal()`，12 个 `p.string().columnType('numeric(...)')`                                         |
| 日期 / 时间戳 / JSON 映射          | 13 / 297 / 30 | `date`、`datetime`、`json` 源码口径                                                                        |
| `.onCreate()` / `.onUpdate()` 字段 | 185 / 80      | SQLx 必须逐列明确其触发条件                                                                                |

### 2.1 模块责任与后续阶段

| 模块                                                       | 表数      | 责任     | 主要阶段                     |
| ---------------------------------------------------------- | --------- | -------- | ---------------------------- |
| auth                                                       | 1         | 平台     | R1                           |
| platform                                                   | 7         | 平台     | R2                           |
| runtime-audit                                              | 2         | 平台     | R2，认证写入基础在 R1        |
| business-number                                            | 1         | 平台     | R2                           |
| approval                                                   | 4         | 平台     | R2 框架，R3–R5 各域行为      |
| approval-summary                                           | 3         | 平台     | R2 框架，R4–R5 消费          |
| attachment                                                 | 7         | 平台     | R2 存储与版本，移交选择在 R4 |
| dictionary / system-setting                                | 1 / 1     | 平台     | R2                           |
| identity-provider / external-org-sync                      | 4 / 4     | 外部集成 | R2                           |
| customer / lead                                            | 2 / 4     | 业务     | R3                           |
| sales-follow-up / sales-intelligence / business-discussion | 1 / 4 / 2 | 业务     | R3                           |
| project                                                    | 14        | 业务     | R3 签约前，R4 验收/完工/归档 |
| contract-readiness / contract / contract-finance           | 6 / 3 / 4 | 业务     | R4                           |
| project-cost / project-handover                            | 17 / 4    | 业务     | R4                           |
| commission                                                 | 10        | 业务     | R5                           |

此归属按源码目录和能力责任记录。审批直接修改合同/提成表，提成直接消费合同/回款/成本/移交事实，因此同一业务命令必须留在同一进程和需要的同一 PostgreSQL transaction 中。

### 2.2 全部 106 个当前表映射

下列各项的精确实体文件、字段行号、建表迁移和后续迁移均见 JSON 的同名 `entities[].table`；这里保留完整表名索引，避免只数文件而漏掉子表。

- auth：`auth_session`。
- platform：`local_credential`、`org_unit`、`platform_user`、`role`、`role_permission_assignment`、`user_org_membership`、`user_role_assignment`。
- runtime-audit：`audit_log`、`security_event`。
- business-number：`business_number_sequence`。
- approval：`approval_record`、`confirmation_participant`、`confirmation_record`、`todo_item`。
- approval-summary：`approval_summary_field_projection`、`approval_summary_package_definition`、`approval_summary_snapshot`。
- attachment：`attachment`、`attachment_download_package`、`attachment_download_package_item`、`attachment_link`、`attachment_storage_provider_config`、`attachment_upload_session`、`project_handover_attachment_selection`。
- dictionary / system-setting：`dictionary_item`、`system_setting`。
- identity-provider：`external_identity`、`external_login_ticket`、`identity_provider_config`、`identity_provider_oauth_grant`。
- external-org-sync：`external_department_mapping`、`external_org_source`、`org_sync_diff_item`、`org_sync_run`。
- customer：`customer`、`customer_alias`。
- lead：`lead`、`lead_owner_assignment_record`、`lead_score_override`、`lead_score_snapshot`。
- sales-follow-up：`sales_follow_up_record`。
- sales-intelligence：`competitor_intelligence_record`、`customer_contact`、`opportunity_stakeholder`、`sales_discovery_record`。
- business-discussion：`business_discussion_comment`、`business_discussion_thread`。
- project：`acceptance_record`、`project`、`project_archive_record`、`project_bid_commercial_material_item`、`project_bid_commercial_process`、`project_bid_commercial_timeline_item`、`project_completion_record`、`project_owner_reassignment_record`、`project_pricing_margin_condition_item`、`project_pricing_margin_review`、`project_technical_cost_item`、`project_technical_cost_package`、`project_technical_risk_item`、`project_technical_scope_item`。
- contract-readiness：`commercial_baseline_diff_item`、`commercial_baseline_diff_result`、`commercial_baseline_review_record`、`commercial_release_baseline`、`contract_readiness_package`、`contract_readiness_package_item`。
- contract：`contract`、`contract_amendment`、`contract_term_snapshot`。
- contract-finance：`invoice_record`、`payable_record`、`payment_record`、`receipt_record`。
- project-cost：`accounting_tax_treatment_snapshot`、`change_package_baseline`、`commission_gate_review_record`、`cost_stage_attribution_snapshot`、`data_maturity_evaluation_result`、`expense_record`、`internal_cost_rate_version`、`operating_baseline_package`、`operating_restatement_record`、`operating_signal_evaluation_result`、`operating_signal_gate_binding`、`operating_signal_review_record`、`period_closing_snapshot`、`project_actual_cost_record`、`project_operating_snapshot`、`shared_cost_allocation_basis`、`shared_cost_allocation_result`。
- project-handover：`contract_handover_rebaseline_record`、`handover_baseline_impact_item`、`project_handover`、`project_receipt_judgment_freeze`。
- commission：`commission_adjustment`、`commission_calculation`、`commission_departure_exception_decision`、`commission_final_settlement_snapshot`、`commission_freeze_change_request`、`commission_freeze_dispute_record`、`commission_payout`、`commission_role_assignment`、`commission_rule_explanation_snapshot`、`commission_rule_version`。

历史 `lead_source` 表仍在 migration 中，最终由 `Migration20260529120000_ex70a_lead_source_dictionary_direct_cutover.ts` 迁到 `dictionary_item` 并移除，不能作为当前第 107 张映射表，也不能丢掉历史数据转移步骤。

## 3. 92 个迁移的接管边界

### 3.1 分类与数据步骤

按 up 可达 SQL 分类：74 个仅 DDL；8 个 DDL 加数据回填；9 个 DDL 加数据/seed/bootstrap；1 个 DDL 加数据前置验证。分类是非业务推理的源码标记，seed/bootstrap 是数据变更子集；`migrations[].statements` 保留原 SQL 与行号以便逐项审阅。列/表注释也属于 DDL。

以下 17 个迁移含数据变更，不能仅从最终 schema 重建后直接跳过。其余 75 个迁移也须保留约束、索引、注释和前置条件；完整 92 项清单在 JSON 中。

| 迁移简称       | 数据/初始化责任                                                    | 源码证据                                                                                                      |
| -------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 20260405100000 | 从平台用户抽取历史密码哈希到 `local_credential`                    | `apps/poms-api/src/migrations/Migration20260405100000_extract_local_credential_and_add_verified_fields.ts:15` |
| 20260411120000 | 成本率 key、version/current 链回填；增加日期重叠排斥约束           | `apps/poms-api/src/migrations/Migration20260411120000_align_actual_cost_rate_version.ts:8`                    |
| 20260413093000 | 付款、应付与实际成本税额语义回填                                   | `apps/poms-api/src/migrations/Migration20260413093000_ex06d_payable_payment_tax_semantics.ts:9`               |
| 20260415142000 | 通过合同变更补齐再基线记录 project 链                              | `apps/poms-api/src/migrations/Migration20260415142000_ex08b3b1_rebaseline_project_chain.ts:6`                 |
| 20260426113000 | 业务编号与成本记录编号重建、序列初始化                             | `apps/poms-api/src/migrations/Migration20260426113000_ex35a_business_number_generation.ts:51`                 |
| 20260429140000 | 从历史名称去重生成客户/别名、关联 lead/project、初始化客户编号序列 | `apps/poms-api/src/migrations/Migration20260429140000_ex42_customer_master_data.ts:84`                        |
| 20260430100000 | 历史线索来源 seed、来源关联回填                                    | `apps/poms-api/src/migrations/Migration20260430100000_ex43_lead_source_and_profile_enrichment.ts:37`          |
| 20260430180000 | 线索评分/门关解释历史回填                                          | `apps/poms-api/src/migrations/Migration20260430180000_ex47_lead_scoring_and_gate_explanation.ts:10`           |
| 20260501110000 | 项目 status/stage 数据规范化再加 CHECK                             | `apps/poms-api/src/migrations/Migration20260501110000_ex56a_project_status_stage_checks.ts:8`                 |
| 20260503160000 | 跨域枚举直切，含审计事件及成本/提成值                              | `apps/poms-api/src/migrations/Migration20260503160000_ex58b_enum_code_value_direct_cutover.ts:7`              |
| 20260503170000 | 字典表、初始化字典项/权限、附件分类改值；seed 在私有 helper        | `apps/poms-api/src/migrations/Migration20260503170000_ex58c_configurable_dictionary_runtime.ts:63`            |
| 20260505100000 | 历史附件 `version_group_id = id`                                   | `apps/poms-api/src/migrations/Migration20260505100000_ex51_attachment_version_final_runtime.ts:5`             |
| 20260507130000 | 外部身份配置表及平台管理权限初始化 helper                          | `apps/poms-api/src/migrations/Migration20260507130000_ex64b_identity_provider_config.ts`                      |
| 20260511140000 | 存储提供方表及管理权限初始化 helper                                | `apps/poms-api/src/migrations/Migration20260511140000_ex65b_attachment_storage_provider_config.ts`            |
| 20260526100000 | 系统配置初值、历史上传大小上限回填                                 | `apps/poms-api/src/migrations/Migration20260526100000_ex67a_system_setting.ts:27`                             |
| 20260529120000 | 来源迁入字典、`lead.source_id` 切为 `source_code`、移除旧权限/旧表 | `apps/poms-api/src/migrations/Migration20260529120000_ex70a_lead_source_dictionary_direct_cutover.ts:8`       |
| 20260610120000 | 外部组织同步持久化及权限初始化 helper                              | `apps/poms-api/src/migrations/Migration20260610120000_ex72b_external_org_sync_persistence.ts`                 |

另外 `Migration20260418183000_ex13b1_gate_review_summary_anchor.ts:14` 对已有 `commission_gate_review_record` 主动 `RAISE EXCEPTION`，要求表为空再补摘要必填列。该约束不是通用回填脚本；R6 存量升级必须先核实目标库迁移位置及数据，不得吞掉异常。

### 3.2 迁移执行权与历史登记

当前配置 `apps/poms-api/src/app/core/persistence/persistence.config.ts:14` 固定 `transactional: true`、`allOrNothing: true`、`safe: true`、`snapshot: false`，历史表名来自 `MIGRATIONS_TABLE_NAME`，默认 `poms_migrations`（`apps/poms-api/src/config/environment.schema.ts:33`）。`ensureDatabase: false` 表示库的 provision 属运维边界。

现有发布 gate 为 pending → migration:up → pending 为空 → migration:check，见 `deploy/scripts/lib/migration-gate.ts:127`。`migration-check` 是模型/schema 差异检查，不能代替 pending 或历史记录核对。

R1–R5 保留 Node/MikroORM 为唯一 schema 演进入口；Rust 业务代码只访问既有表。R6 必须交付：

1. 切换提交对应的最终 PostgreSQL baseline，包含 FK、CHECK、部分/表达式索引、排斥约束、默认值和必要数据初值。
2. 空库：baseline 加各类 bootstrap；对照旧迁移链的最终结构及必要数据不变量。
3. 存量库：核实达到指定旧 migration，备份并校验结构/数据后登记 Rust baseline；禁止重放建表或历史 backfill。
4. 固定 Rust migration 文件名/校验和、迁移锁、失败恢复和历史登记方式。现有配置不能证明存在足够的部署互斥锁，本轮未核实运行行为。
5. 回滚窗口内保持旧后端可读写新数据。保留全部旧 migration 与记录，不能用 SQLx 自己的 migration 表直接替代或伪造旧完成历史。

## 4. seed、bootstrap 与配置初值

| 入口                                                                          | 当前范围/副作用                                                                                | Rust 接管要求                                                                              |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/poms-api/src/seeders/database.seeder.ts:8`                              | DEV/E2E 平台账号、bcrypt 哈希、组织/角色/权限与大量业务样本；按 fixture 身份删除/重建部分数据  | 仅隔离开发/E2E，保留确定性 ID 和场景覆盖；不作为共享试用环境初始化                         |
| `apps/poms-api/src/seeders/platform-bootstrap.seeder.ts:23`                   | 组织与角色 upsert；受管角色权限先删除再重建；不创建业务试用用户                                | 独立 bootstrap 工具，保留 role/org identity 与权限集合，不与开发账号 seed 合并             |
| `apps/poms-api/src/seeders/business-trial.seeder.ts:46`                       | 读取私有 `POMS_TRIAL_USERS_CSV`；先 bootstrap，再用户凭据/组织/角色与试用客户/线索/项目/合同等 | 保留 CSV 校验、拒绝固定 DEV 用户名、必需角色及可重复导入语义；不得把 CSV 秘密写入 evidence |
| migration 内字典/设置/权限/业务编号初值                                       | 第 3 节 9 个 seed/bootstrap 分类迁移，包含私有 helper                                          | 从历史迁移链接管时保留原数据；空库 baseline 明确谁创建初值，避免漏建或覆盖运营配置         |
| `apps/poms-api/src/app/features/system-setting/system-setting.service.ts:102` | 缺失配置使用定义中的默认值；更新可创建记录                                                     | SQLx 读取需保持“缺行默认”与显式 JSON 值的区别                                              |

JSON 的 `seeders[].tables` 列出 raw SQL 使用的表；不能只按实体类引用统计这些工具。没有执行任何 seed，也没有认证这些入口当前是否具有整体原子性。试用初始化文档 `docs/operations/poms-business-trial-initialization-runbook.md:64` 仅列 `pgcrypto`，需要在 R6 补齐 `btree_gist` 要求。

## 5. 事务、嵌套调用与并发

### 5.1 43 个事务调用点的完整索引

下面行号均对应同名 `apps/poms-api/src/app/features/` 文件；逐回调范围、实体引用、服务调用参数与五层静态可达链见 JSON `transactions`。回调中的 repository 调用仍可能依赖 MikroORM ambient context；不能按“没有传 em”推断它一定另开连接。

| 文件                                               | 方法 / `.transactional` 行号                                                                                                                                                                                                                                   | 数据及跨域责任                                                                     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `approval/approval.service.ts`                     | submitContractReview 111；submitCommissionPayoutApproval 200；submitCommissionAdjustmentApproval 319；resolveApprovalDecision 474                                                                                                                              | 合同/提成业务状态、approval、todo；质保发放还调用同一 em 的结算/规则快照写链       |
| `approval/confirmation.service.ts`                 | createConfirmationRecord 87；confirmParticipant 176；closeConfirmationRecord 244                                                                                                                                                                               | confirmation、participant、todo、完成计数及状态                                    |
| `commission/commission.service.ts`                 | createRoleAssignment 264；arbitrateCommissionFreezeDispute 443；createDepartureExceptionDecision 578；createCalculation 737；approvePayout 949；registerPayout 1084；executeAdjustment 1254；recalculateCalculation 1346                                       | 冻结/争议/替代、计算/current、发放/补偿及结算/规则解释快照                         |
| `commission/commission.repository.ts`              | transactional 70                                                                                                                                                                                                                                               | 上述服务的委托包装，不能再计为独立嵌套业务事务                                     |
| `contract-readiness/contract-readiness.service.ts` | createCommercialReleaseBaseline 50；reviewCommercialReleaseBaselineDiff 168；createContractReadinessPackage 224；initializeFromReadinessPackage 359                                                                                                            | current 替换、差异项/复核记录、就绪包/子项；初始化目前只写包上标识                 |
| `contract/contract.service.ts`                     | createAndSave 81                                                                                                                                                                                                                                               | 合同与同事务业务编号                                                               |
| `customer/customer.service.ts`                     | createCustomer 118；deleteAlias 212                                                                                                                                                                                                                            | 客户/别名/编号；删除别名审计显式传 entityManager                                   |
| `lead/lead-score.service.ts`                       | submitLeadScoreOverride 94；approveLeadScoreOverride 142；rejectLeadScoreOverride 186；revokeLeadScoreOverride 211                                                                                                                                             | 人工覆盖状态、评分 current 快照；检查刷新与审批规则                                |
| `lead/lead.service.ts`                             | createLead 110；updateLead 152；convertToProject 340                                                                                                                                                                                                           | 编号、线索/项目、评分历史、附件 link；更新审计显式传 em                            |
| `project-cost/project-cost.service.ts`             | activateOperatingBaselinePackage 755；createOperatingRestatement 960；confirmSharedCostAllocationBasis 1056；replaceSharedCostAllocationResult 1117；confirmCostStageAttribution 1168；reclassifyCostStageAttribution 1219；replaceAccountingTaxTreatment 1334 | 成本基线/current、重述、分摊/阶段/税务替代及级联状态                               |
| `project-cost/project-cost.repository.ts`          | transactional 225                                                                                                                                                                                                                                              | 上述成本命令的委托包装                                                             |
| `project/project.service.ts`                       | createAndSave 142                                                                                                                                                                                                                                              | 项目与同事务业务编号                                                               |
| `sales-intelligence/sales-intelligence.service.ts` | updateCustomerContact 97；updateOpportunityStakeholder 203；updateCompetitorIntelligenceRecord 294；updateSalesDiscoveryRecord 386                                                                                                                             | 情报/联系人更新及审计；部分回调使用外部已读取对象，不能只扫描 em.create 推断表集合 |

### 5.2 必须保留的跨域调用和提交顺序

| 边界                                                | 当前证据                                                                                                         | SQLx 必需动作/后续验证                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 编号分配 → 客户/线索/项目/合同创建                  | `business-number/business-number.service.ts:32` 的 UPSERT RETURNING；以上创建均传入 em                           | 将 sequence 更新与实体插入放在同一 transaction；按 UTC 年分期；并发唯一及业务失败回滚样本                                        |
| 线索转项目 → 附件/评分/审计                         | `lead/lead.service.ts:340`；`attachment/attachment.service.ts:862` 接收 `entityManager`；末尾评分快照显式 em     | 同一个 transaction 贯穿；附件 helper 无 em 时会自己 save；审计 helper 默认路径依赖上下文，须故障注入核实实际归属                 |
| 审批 → 合同或提成 + todo + 快照                     | `approval/approval.service.ts:111/200/319/474`；`commission/commission-settlement-write-chain.ts`                | 不能把处理器变为远程调用；所有冻结快照/业务状态/todo 完成一起提交；共用 em 的 helper 作为参数化写链迁移                          |
| current 替换 → 新版本插入                           | `commission/commission.service.ts:737`；`contract-readiness/contract-readiness.service.ts:50`                    | 保留先取消旧 current、flush，再插入新 current 的次序；同一 transaction 回滚两步，不能因延迟写队列重新排序                        |
| 合同激活 → 条款快照 → 合同 active                   | `contract/contract.service.ts:195/214`、`contract/contract.repository.ts`                                        | 当前源码没有外层显式 transactional；快照保存与合同保存是多步提交边界候选。R4 记录故障结果，再决定是否另立一致性修复切片          |
| 移交/再基线 → 合同、摘要、经营引用                  | `project-handover/project-handover-command.service.ts:95`；`project-handover/project-handover.repository.ts:101` | 读取多域，确认/冻结由一次 flush 持久化；再基线先 nativeUpdate 旧记录再 persist/flush，未见外层显式 transaction，不认证全链原子性 |
| 财务事实 → 实际成本 → 经营/提成消费                 | `contract-finance/contract-finance.service.ts:465`；`project-cost/project-cost.service.ts:297` 等                | 当前跨域事实按命令逐次保存；不得把读取最新事实改成重算历史快照；保留 source/current、撤销/替代链及金额样本                       |
| 上传对象 → session → attachment/link                | `attachment/attachment.service.ts:264/276/421/635`                                                               | 对象存储不受 PostgreSQL 回滚保护；保留 completing/失败/清理与重复完成行为，不声称一个 DB transaction 能回滚外部对象              |
| 外部登录票据 → 本地 auth_session                    | `identity-provider/identity-provider.service.ts:292` 与 `core/auth/auth-session.service.ts:84`                   | 当前票据消耗、会话创建为不同服务保存；R1/R2 覆盖重放、并发消耗和创建失败，不能凭 SQLx 类型认证一次性                             |
| 组织同步 preview/apply → org/mapping/run/diff/audit | `external-org-sync/external-org-sync.service.ts:383/409/487/505/543`                                             | 保留预览、逐项失败、最终汇总与审计，不自动改成全量失败回滚；外部目录读取与本地保存分别验收                                       |

静态调用图发现的 `CommissionRepository.transactional` 和 `ProjectActualCostRecordRepository.transactional` 是委托包装；不能据此宣称已经验证 savepoint 或 nested transaction。所有动态/ambient context 路径以及外部已加载对象的 dirty tracking，均列入 R1/R4 PostgreSQL 集成验证。

### 5.3 并发控制清单

1. **行版本**：79 个 `.version()` 映射和许多 `expectedVersion` 前置比较并存；先读后比不等于原子比较更新。SQLx 应按每条命令的既有意图写 `UPDATE ... WHERE id = ... AND row_version = ... RETURNING ...`，处理受影响行数为零、递增及响应版本；旧运行行为与错误映射必须通过集成对照冻结。
2. **单一 current 与业务 version**：部分唯一索引和 `(主体, version)` 唯一约束是数据库仲裁边界；见 `commission-calculation.entity.ts:18`、`Migration20260418110000_ex11d3_commission_current_unique.ts`。`max/version+1` 不能替代约束，也不能偷偷添加无限重试。
3. **条件唯一、表达式唯一与状态门关**：成本来源 current、open/processing todo、组织 parent/name lower-case、附件 latest/final/default provider 等须逐条复制 SQL 原条件；JSON 的 `uniquesSource` 与 migration SQL 是审阅入口。项目来源 lead 与 pending approval 的应用层重复检查不能冒充数据库唯一约束，需要单独并发对照。
4. **日期范围排斥**：成本率 `rate_key + daterange(...,'[]')` 的 active 范围通过 GiST exclusion 防重叠，依赖 `btree_gist`（`Migration20260411120000...:59`），不能只做应用层查询。
5. **会话条件 UPDATE**：`core/auth/auth-session.repository.ts:113` 起使用原生 UPDATE RETURNING，显式检查 active、idle/absolute expiry、last_seen throttle、least 上限并递增版本。SQLx 应保留这条原子路径，不降为读改写。
6. **编号 UPSERT**：`business-number.service.ts:35` 用 `(scope, period)` 冲突更新并 RETURNING；整数经 `Number(...)` 转换，需保留可用边界与溢出诊断。
7. **nativeUpdate 特例**：成本替代有四处 `nativeUpdate`，移交替代有一处；其 where 仅 id，没有 `.version()` 的实体更新路径保证，时间/版本/hooks 与 managed object 后续状态要单独验收。
8. **冲突响应**：`commission/commission.service.ts:2040` 起仅对指定约束名的 SQLSTATE `23505` 转为 ConflictException，并解包 cause/driverException；不能将所有 DB 错误统一改为 409。排斥约束、CHECK、FK、锁冲突的现行错误投影另从异常层合同对照。

源码未发现 `LockMode`、显式 `FOR UPDATE` 或 advisory lock 的业务使用。此为搜索结果，不证明 PostgreSQL 执行时没有锁，也不证明当前并发行为已足够。

## 6. 数据类型兼容矩阵

| 类型/语义                               | 源码与持久化基线                                                                                                                                     | SQLx/Serde 兼容输入及必验项                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 内部 UUID                               | 357 个直接 uuid 字段，另有 207 个 manyToOne，普遍 mapToPk；DB 默认 `gen_random_uuid()`，服务也用 randomUUID                                          | 保持已有 UUID、nullable 与 FK 删除/更新规则；不能把 mapToPk 关系序列化为关联对象                                     |
| 外部 ID / 多态 source ID                | 外部 provider/department/open/union identifiers 为字符串；`project_actual_cost_record.source_id` 是 varchar(64)，而很多 `source_*_id` 是内部 UUID FK | 以逐字段矩阵区分；禁止按名称以 Id 结尾就统一反序列化 UUID；保留外部大小写、空串/缺省和归属范围                       |
| 业务编号                                | customerNo/leadNo/projectNo/contractNo/recordNo 为字符串唯一键；UTC 年分期                                                                           | 保留完整字符串、前缀、padding、来源编号和序列冲突语义                                                                |
| `date`                                  | 13 个 p.date：合同/条款 retention_due_date，费用/发票/应付日期，成本率有效期、线索决策日期、成本发生日/人力周期、经营来源窗口                        | Rust 用业务日类型；输出 YYYY-MM-DD；不可统一做 UTC timestamp；详见 JSON dateFields                                   |
| `datetime` / timestamptz                | 297 个 datetime 映射，历史 DDL 主要为 timestamptz；receipt_date/payment_date 当前也为 datetime，不因名字含 date 改型                                 | 保持时刻和 ISO 输出、毫秒截断/精度样本；真实列类型与 session timezone 需 DB 对照                                     |
| 业务日期时区                            | `core/date/business-date.utils.ts:1` 为 `Asia/Hong_Kong`；Date 经该时区，string 分支仅 slice(0,10)                                                   | 保留分支差异，测试带偏移 timestamp、跨日和纯日期；DB timezone 未知不能代替这个应用时区                               |
| numeric / decimal                       | 79 个字段，precision/scale 非统一；通常通过字符串表示，部分 p.string 指定 numeric columnType                                                         | SQLx 精确解码后按旧接口字符串和计算链投影，保留尾零/空值；不能使用 f64 持久化替代 numeric                            |
| JS number 运算                          | 服务把金额字符串 Number(...) 后算术，再 toFixed(2/4/6)；JSON 规则中的 rate 为 number                                                                 | 当前输出为兼容 SSOT；引入 decimal 差异逐样本登记，不能默认纠正历史结果                                               |
| JSON/JSONB                              | 30 个 json 字段；规则 JSON 的 tier 采用 JS number；部分 default '{}'::jsonb，审计/外部快照可 null                                                    | 区分 SQL NULL、JSON null、缺 key、空对象/数组；保留字段/数组顺序对快照解释与摘要的语义；不能将 JSON 当 text 双重编码 |
| null / undefined / 默认                 | `.nullable()`、`?? null`、optional 输入与 `'{}'::jsonb`、false/0/defaultRaw 并存                                                                     | SQL NULL 与字段省略分别建合同样本；部分 update 仅修改显式给定字段，禁止默认覆盖成 null/0                             |
| `row_version`                           | 79 个 integer.version 默认 1；是并发 token                                                                                                           | 与业务 `version` 分离，SQLx 显式 where/increment/RETURNING，保留 expectedVersion 可省略路径及错误                    |
| `version` / `is_current`                | 业务版本 + 条件唯一 current；并非所有表都有 row_version                                                                                              | 保持主体键、版本起点、替代次序、状态和 current；禁止用 row_version 取代业务版本                                      |
| supersedes/recalculated/reversed/voided | `supersedes_id`、`supersedes_record_id`、`recalculated_from_id`、补偿发放等不同链                                                                    | 按现有列名/FK与状态守卫逐链保留；历史查询固定已冻结引用，不挂最新事实重新解释                                        |

### 6.1 金额和数据库 numeric 审计

| 映射精度      | 字段数 | 主要用途                                          |
| ------------- | ------ | ------------------------------------------------- |
| numeric(18,2) | 54     | 合同/财务、经营基线/快照、提成金额等              |
| numeric(15,4) | 9      | 实际成本金额、成本率、labor amount                |
| numeric(18,4) | 2      | 技术成本 quantity/unit_price                      |
| numeric(18,8) | 2      | 报价评审 tax_rate/gross_margin_rate               |
| numeric(5,4)  | 6      | 商务基线/合同条款 tax/down-payment/retention 比例 |
| numeric(8,4)  | 1      | 提成计算毛利率                                    |
| numeric(9,6)  | 3      | 经营/关账毛利率与分摊比例                         |
| numeric(10,2) | 2      | actual_hours / actual_person_days                 |

这张表来自实体声明，不替代 migration-check 或数据库 introspection。每个字段的实体行号在 JSON `numericFields`，历史 numeric SQL 原文在 `migrations[].statements[].sql`。

当前计算顺序至少有以下差异，不能统一替换成“金额两位、比例四位”：

- `commission/commission.service.ts:727`：先 number 收入减成本、除法计算毛利率、按规则 rate 乘毛利；最后 amount `toFixed(2)`、rate `toFixed(4)`（2506/2510）。规则 JSON 中的 tier number 也是兼容输入。
- `contract-finance/contract-finance.service.ts:658`：number 汇总付款、校验结清上限，再 `toFixed(2)`（699）。比较发生在格式化之前。
- `project-cost/project-cost.service.ts:2881`：amount `toFixed(4)`、rate `toFixed(6)`；实际成本 numeric(15,4)，但经营快照金额列 numeric(18,2)，存在应用格式化后数据库按列 scale 再处理的边界。不能把内存返回值与重新读取值当作当然相同。
- `project/project.service.ts:880`：技术/报价相关 helper `toFixed(2)`，而 quantity/unit_price 存四位、tax/gross-margin rate 存八位；逐命令输入是否直接传字符串须按源码复刻。
- `contract-readiness/commercial-release-baseline.entity.ts:34`：金额/比例是 `p.string().columnType('numeric(...)')`，不能按 TS 字符串误建 varchar。

R3–R5 必需建立 Node 输出与重新读库的 golden 样本，覆盖 `0`、负向冲销、`1.005/2.675` 等舍入边界、极大值、超列 scale、重复相加/抵扣、跨档比例、分摊残差、重算、JSON number rate、前端字符串尾零和数据库超范围错误。边界数值仅是待测输入，本轮没有运行业务或数据库，不宣称当前系统的这些边界已通过。

`docs/design/schema-ddl-design.md:134` 的 decimal(18,2)/decimal(8,4) 是统一建议；当前源码已有多种精度。Rust 首先按现有逐列结构和输出兼容，`rust_decimal` 更精确但结果不同的样本登记为独立规则问题，附批准与数据影响后再决定迁移，不在 R0 或无说明地改历史金额。

## 7. SQLx 必须显式复制的 MikroORM 行为

1. **请求级 EntityManager/identity map**：`persistence.config.ts:65` 的 `registerRequestContext` 和 `autoLoadEntities`。跨 repository/service 取得同一对象的 dirty state 与事务上下文需要显式设计；SQLx 没有单位工作自动跟踪。
2. **flush 的完整写集合与顺序**：很多方法修改已查询对象后只 `.flush()`，不再次 persist。必须复制被改变的字段/表以及调用链上的审计/版本副作用，不能仅迁移显式 create/persist 列表。
3. **自动事务与多次 flush**：不能把每个 repository.save 当作整个 HTTP 命令事务；对第 5 节的每次写入建立提交/回滚和故障注入样本。外层 transaction 内两次 flush 与两次独立事务不同。
4. **行版本与更新时间**：79 个 version、185 个 onCreate、80 个 onUpdate；普通 ORM 写入与原生 UPDATE 分别处理。默认 now()、应用 new Date()、显式业务时间及原始更新时间不能统一覆盖。
5. **mapToPk/FK/null 规则**：207 个 manyToOne、deleteRule/updateRule、nullable 和循环引用；保留 deferred 分步插入、先旧后新 current 的顺序。禁止仅靠 Rust 引用关系替代数据库 FK。
6. **默认/返回值与数值表示**：UUID/now/default、decimal string、date/Date、JSONB、RETURNING；写入后对象已拥有生成字段与 rowVersion 的现行响应需要 SQLx 显式取回。
7. **查询与过滤语义**：`$in/$ne/$or`、null 比较、limit/offset、稳定 order、关系 mapToPk、大小写匹配。不能把缺省过滤、NULL 三值逻辑和多列排序交给不同的默认行为。
8. **数据库约束与错误**：按原名保留 partial unique/expression/check/exclusion/FK；按既有错误协议映射特定 SQLSTATE/constraint，未知错误不可伪造业务成功。
9. **native/raw SQL 特例**：会话条件更新、编号 UPSERT、五处 nativeUpdate，以及 raw 聚合返回 number|string 的转换。它们不等同于被管理实体的 hook/version 路径。
10. **生命周期与审计**：snapshot/current/supersedes、操作者、审计 before/after、权限驱动投影；SQLx 成功写行不等于业务链闭合。runtime audit 显式 em 参数与默认 save 路径须各自覆盖。

上述“必须复制”是迁移验收输入，不是本轮对 MikroORM 实际 emitted SQL 的认证。R1 先在隔离 PostgreSQL 中固定 ORM 与 SQLx 对照的最小证据，再把这些约束带入各业务切片。

## 8. PostgreSQL、扩展、排序与时区

| 项目            | 已核实源码 / 现场事实                                                                                         | 未核实 / 放行前需要                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL 版本 | ADR-012 默认 16+；只读核实本机 Windows 17.4、TEST Linux 15.12；用户确认尚无生产部署                           | 以 TEST 15.12 作为当前兼容目标；R0E 准备对齐隔离库并验证 SQLx 支持组合；差异见 DB-D07                                                   |
| schema/历史表   | entity/DDL 硬编码 poms；配置 DB_SCHEMA 默认 poms，迁移表默认 poms_migrations                                  | 非 poms 配置不能自动获得支持；目标 schema/search_path/历史表实际位置和所有者未核实                                                      |
| pgcrypto        | `Migration20260322193000_init_project.ts:5` 创建；gen_random_uuid 用于主键默认；两库均安装 1.3                | 创建权限与隔离验收库初始化策略待验证                                                                                                    |
| btree_gist      | `Migration20260411120000_align_actual_cost_rate_version.ts:59` 创建，支持成本率 GiST 排斥约束；两库均安装 1.7 | 有效约束尚未核实；试用初始化 runbook 当前漏列                                                                                           |
| collation/ctype | 两库 UTF8 / libc；TEST en_US.UTF-8、collation version 2.34；本机 zh-CN、1541.2,1541.2                         | 版本和 OS locale 差异不能由名称或现有开发库测试代替；R0E 对齐隔离库，覆盖中英大小写/空白/重音样本；不能以 JS localeCompare 代替 DB 排序 |
| timezone        | 业务日 Asia/Hong_Kong、编号 UTC；本次会话 TEST Etc/GMT-8、本机 Asia/Shanghai                                  | 会话值不证明 DB/server 默认 TZ；迁移 backfill 年份归属待验证，初始化显式固定会话 TZ                                                     |
| 权限            | 创建 schema/table/index/extension、数据回填/DDL 与 runtime DML 是不同职责；本次两库连接 ssl=false             | 角色权限、连接池、migration 互斥与恢复未核实；本次连接无 TLS 不证明服务端不支持 TLS                                                     |

2026-10-26 的初盘仅读取源码；续查使用只读事务核实上述元数据，未执行业务查询、DDL、seed 或 migration。两库 `poms` schema 均计为 107 张表，此值没有证明与源码 106 张实体表逐项一致；完整结构与迁移历史仍待隔离验证。当前对齐 TEST，未来生产首次部署前另核目标；既有 PG17.4 开发实例与 `poms` 库不自动 reset/seed。

## 9. 既有差异与本轮处置

| ID     | 事实                                                                                                       | 归类                    | 处理边界                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| DB-D01 | 设计通用金额/比例精度建议与当前多个 numeric precision/scale、JS number 计算链不同                          | existing-baseline-drift | 冻结逐列结构与现有输出，不把泛化建议当作自动 schema/舍入变更授权；独立金额规则切片决定差异                              |
| DB-D02 | 设计命名统一建议 supersedes_id，而实际成本使用 supersedes_record_id，成本率使用 supersedes_rate_version_id | existing-baseline-drift | 保留现有物理列、契约和链；Rust 不顺手重命名                                                                             |
| DB-D03 | 设计列出 receivable_plan_version 等计划模型；当前就绪初始化只是写随机 UUID 标识/时间，未见同名实体/建表    | existing-baseline-drift | `contract-readiness.service.ts:359` 是现有兼容事实；R4 显式冻结“已实现/仅标识/计划能力”，不能在迁移中伪造已物化应收计划 |
| DB-D04 | DB_SCHEMA 可配置，但实体与全部历史 DDL 固定 poms                                                           | existing-baseline-drift | R1/G1 先冻结 poms；支持其他 schema 需单独设计和迁移，不静默插值改写历史                                                 |
| DB-D05 | 试用初始化 runbook 只列 pgcrypto，迁移还需 btree_gist                                                      | existing-baseline-drift | R6 补运维输入并在空库演练验证；本轮只记录事实                                                                           |
| DB-D06 | 合同快照/合同 active、移交 nativeUpdate/flush 等跨域意图与显式事务覆盖并不完全一致                         | existing-baseline-drift | 原子性待隔离库故障注入确认；不在 R0 修业务或直接声称 SQLx 已等价                                                        |
| DB-D07 | ADR-012 要求 PostgreSQL 16+，现有 TEST 实际为 15.12；本机开发实例为 17.4                                   | existing-baseline-drift | ADR-018 在 Rust 迁移范围内以 TEST 15.12 为兼容目标；保留旧 ADR 与既有实例，使用对齐隔离库验证，不自动升级/降级          |

本轮没有 `new-real-drift`（没有业务/schema 改动）。只读元数据核实不能把尚未验证的行为差异归为已接受的 `accepted-db-specific-difference`；最终 drift 处置由对应阶段 G1/G3 证据承接。

## 10. R1–R6 的可执行输入与阻断项

| 阶段 | 可直接消费的输入                                                                                                  | 必需验收/阻断项                                                                                                                                              |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1   | 全字段/约束 JSON；79 个 version 表；会话原生条件 UPDATE；业务日期转换；第 7 节 ORM 复制合同                       | 隔离 PostgreSQL 目标 major/扩展/TZ/collation/角色与 poms schema 未实证前，不能认证持久化底座；冻结 SQLx transaction 传递、错误映射与会话负面/并发场景        |
| R2   | 27 平台/8 外部集成表；seed 三类边界；编号 UPSERT、审计 em/default 路径、上传及组织同步多步状态                    | 老 ID/密文/账号/票据/会话兼容、双消耗、编号回滚、配置缺行默认、外部对象失败补偿与同步逐项失败必须有用例；审批框架不能伪造尚未迁移业务处理器成功              |
| R3   | 客户/线索/情报/讨论与项目签约前表；线索转项目多域事务；技术与报价精度矩阵                                         | 附件 link/评分/审计一起回滚，owner/版本冲突，8 位比例及字符串尾零、客户规范化与 SQL 大小写/排序对照；生成相同场景数据副本                                    |
| R4   | 合同/条款/财务/成本/移交与项目验收/完工/归档；五处 nativeUpdate；来源 current 索引/成本率 exclusion               | 冻结 DB-D03 能力边界；记录快照创建/合同 active、再基线中间失败现行行为；四位成本到两位经营输出、Date/string/TZ、历史引用与回滚/并发必须对照                  |
| R5   | 10 个提成表与 approval 同事务写链；version/current/supersedes、23505 精确约束名、JSON number 规则                 | 金额 golden、负向补偿、重算/残差、质保/离职特例、重复/并发与单一 current；decimal 差异未解释/未批准则不能放行该规则变化                                      |
| R6   | 92 个 migration 的原 SQL/分类/hash；17 个数据迁移、9 个 seed/bootstrap、空表前置 guard；三类 seed 和现有发布 gate | 目标库 migration 历史/结构/数据未核实是正式接管阻断；锁/checksum/失败恢复、空库与存量演练、备份恢复、旧写新读/新写旧读与回退证明齐备后才可登记 Rust baseline |

R0 的静态盘点可作为实施输入；不把“106 张表已经列出”表述为 R1–R6 完成或真实数据库兼容认证。后续新增实体、迁移、字段或命令均须重新生成 JSON 并复审差异。

## 11. 校验与不可变证据

- v2 SHA-256 文件 manifest：`e9637ec4ddbc61ba8f8ada4a5eeee51d66ced8d285f43074518db4ff183e5443`。清单见 JSON `fileHashes`，按第 1 节规则哈希规范化 UTF-8 文本及记录 `normalizedUtf8Bytes`。
- v2 JSON 规范化 UTF-8 SHA-256：`4796b8a0eca31f6d59e7d36d3de5a2653ab2ab4dc5d818346c0ebe3de965cbc3`；生成文件本身使用 LF，JSON 不把自身/本文纳入 manifest，避免循环哈希。
- R0E 将原始字节口径的 v1 证据改为跨 checkout 可复算的 v2 文本口径；原 v1 JSON hash 为 `6d8d91d8943bc94963ac4213716efbbcac8dbfbc539712bc3c1aeecde6a245e3`，不能把两种 hash 当作同一字节口径比较。实体/字段、事务、迁移方向和所有统计口径保持原样。
- 提取器自校验：未解析字段类型、无建表来源、重复表映射或 up/down 不可达 addSql 会报错；`--check` 重新规范化、解析并对照 JSON 文本。
- 本轮预期检查：离线重算及 `--check`、`git diff --check`、Markdown 表格格式检查。业务 build/lint/test、OpenAPI、migration-check、DB/E2E、性能/压力测试不属于本静态 docs-only 盘点；其中 migration-check 明确需要数据库，本轮未运行。
