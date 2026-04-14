# EX-08 合同承接摘要、移交确认摘要与移交 Gate 实施基线包

- Gate Status: `Pass`
- Parent: `EX-08`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-14
- Tracker Link / Row: `phase2-development-execution-tracker.md` EX-08 / EX-08A0

---

## 1. 范围

- **本次目标**: 冻结 `EX-08` 的工程输入与交付边界，为 `L3` 第一切片落地合同承接摘要、移交确认摘要与项目移交强 gate 提供可执行基线。
- **本次覆盖对象**:
  - `project_handover`
  - `contract_handover_rebaseline_record`
  - `handover_baseline_impact_item`
  - `approval_summary_package_definition`
  - `approval_summary_snapshot`
  - `approval_summary_field_projection`
  - `confirmation_record`
  - `confirmation_participant`
  - `project_effective_contract_link` / `project_receipt_judgment_freeze` 的最小引用边界，若实现发现已存在等价能力则按现状对齐
- **本次覆盖能力**:
  - 合同承接摘要查询 `ContractHandoverSummaryView`
  - 移交详情查询 `ProjectHandoverDetailView`
  - 移交确认命令 `confirmProjectHandover`
  - 合同变更再基线化主链 `rebaselineContractHandover`
  - 移交前再基线化影响范围查询
  - 移交确认所需的最小摘要快照与多方确认链
- **本次明确不做**:
  - 不落地 `EX-09` 的提成冻结版本、再基线化冻结版本、替代冻结版本链。
  - 不落地 `EX-10` 之后的提成规则、计算、发放、调整和争议仲裁完整链。
  - 不落地完整通用工作流引擎、完整通知系统、完整短时揭示授权链。
  - 不落地分期移交；当前仍按本轮统一开发范围内的整体移交口径处理。
  - 不重新定义 `EX-05` 的合同承接包与商业放行基线事实源。
  - 不重新定义 `EX-07` 的经营基线、快照、分摊、税务和重述链。
- **下游可依赖的交付边界**: `EX-09` 可以稳定引用 `sourceHandoverId`、`contractSummarySnapshotId`、`handoverSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId` 与可空 `sourceHandoverRebaselineRecordId`；`L4 / L5` 后续切片可以追溯移交完成事实、当前有效合同集合摘要、移交前有效基线与摘要快照。
- **不允许下游依赖的留白**: 不把 `EX-08` 的输出解释为提成冻结已完成、经营 gate 已完成、最终结算已完成或可替代冻结版本链已完成。

---

## 2. 正式输入

| Input Type              | Document / Source                                                 | Section / Anchor                                                                          | Status   | Notes                                                            |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| Tracker                 | `phase2-development-execution-tracker.md`                         | EX-08 / EX-08A0 ~ EX-08C3                                                                 | Active   | 固定父任务、子任务、依赖与完成定义                               |
| Business design         | `phase2-contract-to-handover-workspace.md`                        | §3 ~ §13                                                                                  | Review   | 固定合同生效后到正式移交前的承接工作区、摘要输入与再基线化要求   |
| Business design         | `phase2-project-handover-gate-workspace.md`                       | §2 ~ §13                                                                                  | Review   | 固定项目移交强节点、多方确认、交接事实清单、阻断项与完成条件     |
| Command design          | `interface-command-design.md`                                     | `confirmProjectHandover`、`rebaselineContractHandover`、第三批命令约束                    | Active   | 固定命令型动作、前提校验、摘要链和联合追溯链                     |
| DTO / OpenAPI design    | `interface-openapi-dto-design.md`                                 | `confirmProjectHandover`、`rebaselineContractHandover`、`reviewApprovalSummaryProjection` | Active   | 固定路由、请求字段、响应字段与禁止输入字段                       |
| Query boundary          | `query-view-boundary-design.md`                                   | `ProjectHandoverDetailView`、`ContractHandoverSummaryView`、第三批查询补点                | Active   | 固定查询视图、最小字段组、投影与摘要快照共享规则                 |
| Data model prerequisite | `data-model-prerequisites.md`                                     | §7.1、§7.8                                                                                | Active   | 固定 `ProjectHandover`、再基线化、摘要包、确认链与冻结链引用关系 |
| Table freeze            | `table-structure-freeze-design.md`                                | §4.1、§7.1、§7.8                                                                          | Active   | 固定逻辑表、字段组、关键关系与表角色                             |
| Schema / DDL            | `schema-ddl-design.md`                                            | §8.1、§8.10、§8.11                                                                        | Active   | 固定主外键、索引、唯一约束和强约束建议                           |
| Upstream implementation | `ex-07c-allocation-tax-stage-query-baseline.md`                   | EX-07C-E01                                                                                | Pass     | `handover_rebaseline_record_id` FK 延迟例外已由 EX-08A1 清理     |
| ADR                     | `../adr/006-project-as-primary-domain-object.md`                  | 全文                                                                                      | Accepted | `Project` 是主生命周期对象                                       |
| ADR                     | `../adr/012-data-persistence-technology-selection.md`             | 全文                                                                                      | Accepted | PostgreSQL + SQL-first migration + MikroORM                      |
| ADR                     | `../adr/014-design-execution-state-model-and-governance-gates.md` | 全文                                                                                      | Accepted | 设计到实施 gate 状态模型                                         |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                                                                     | Implementation Rule                                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Business semantics        | `phase2-contract-to-handover-workspace.md` + `phase2-project-handover-gate-workspace.md` | 合同已生效不等于完成移交；完成移交必须依赖摘要输入、交接事实、多方确认、执行负责人和阻断清空                                                  |
| Route / command naming    | `interface-openapi-dto-design.md`                                                        | `confirmProjectHandover` 使用 `POST /project-handovers/{id}:confirm`；`rebaselineContractHandover` 使用 `POST /contract-handover-rebaselines` |
| DTO / contract naming     | `interface-openapi-dto-design.md` + `libs/shared/contracts`                              | DTO 字段使用 camelCase；响应必须回传稳定引用链，不只返回状态码                                                                                |
| Table / column naming     | `schema-ddl-design.md`                                                                   | SQL 使用 snake_case，schema = `poms`；应用层 entity 使用 camelCase 显式映射                                                                   |
| Date / time semantics     | `schema-ddl-design.md` + 既有项目惯例                                                    | 业务日期使用 `date`；确认、生成、处理、冻结等时间点使用 `timestamptz`                                                                         |
| Identifier semantics      | `schema-ddl-design.md` + 既有项目惯例                                                    | 内部主键与强引用使用 `uuid`；多态公共对象引用使用 `target_type + target_id` 业务约束                                                          |
| Money / decimal semantics | `EX-06D` / `EX-07` 已冻结金额语义                                                        | `EX-08` 不新增金额计算口径；有效合同集合、回款节点、成本估算基线只做摘要引用和快照追溯                                                        |
| Status machine            | `phase2-project-handover-gate-workspace.md` + `schema-ddl-design.md`                     | 移交状态至少覆盖待发起 / 准备中 / 待确认 / 已完成；再基线化状态至少覆盖处理中 / 待生效 / 已生效 / superseded                                  |
| Summary chain             | `query-view-boundary-design.md` + `interface-openapi-dto-design.md`                      | 合同承接页、移交确认页、通知、打印材料、审计摘要必须共享同一 `summarySnapshotId / projectionLevel / exportPolicy`                             |

---

## 4. 子任务边界

| Subtask ID | Scope                    | Completion Boundary                                                                                                             | Notes                                 |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `EX-08A0`  | 基线冻结                 | 本文件完成并回写 tracker                                                                                                        | `G1 = Pass` 后才能进入 DDL            |
| `EX-08A1`  | 核心 DDL                 | `project_handover`、`contract_handover_rebaseline_record`、`handover_baseline_impact_item` migration / entity / repository 完成 | 同步补回 EX-07 延迟 FK                |
| `EX-08A2`  | 摘要快照最小承接         | 摘要包定义、摘要快照、字段投影最小模型或受控替代实现完成                                                                        | 若不做完整横切能力，必须记录例外      |
| `EX-08A3`  | 多方确认最小承接         | `ConfirmationRecord` / participant 最小模型、进度与返回链完成                                                                   | 必须能返回 `confirmationRecordId`     |
| `EX-08B1`  | 合同承接摘要 query       | `ContractHandoverSummaryView` 可用                                                                                              | 不允许前端临时拼装摘要                |
| `EX-08B2`  | 移交详情 query           | `ProjectHandoverDetailView` 可用                                                                                                | 输出 `allowedActions`、阻断项与摘要链 |
| `EX-08B3`  | 移交确认 command / guard | `confirmProjectHandover` 成功路径与关键阻断路径完成                                                                             | 完成移交后才允许进入执行态            |
| `EX-08C1`  | OpenAPI / shared client  | OpenAPI、shared contracts、generated client 同步                                                                                | 必须清理 generated client whitespace  |
| `EX-08C2`  | 自动化测试               | 单测、migration-check、API E2E 覆盖主路径和关键失败路径                                                                         | 默认需要 E2E                          |
| `EX-08C3`  | 文档回写                 | 设计文档、执行板、进度板、G3/G4 证据回写                                                                                        | 全部完成后父任务 `EX-08` 才可关闭     |

---

## 5. 命令与接口边界

| Route / Controller                                     | Command / Service                 | Request DTO / Contract                                                                                                | Response DTO / Contract                                                                                                                                                               | Guard / Permission                                                               | Design Source                           | Result                         |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| `POST /api/project-handovers/:id:confirm`              | `confirmProjectHandover`          | `comment`、`participantConfirmations`、`contractSummarySnapshotId`、`expectedVersion`                                 | `targetId`、`businessStatusAfter`、`confirmationRecordId`、`contractSummarySnapshotId`、`effectiveHandoverBaselineSnapshotId`、`summarySnapshotId`、`projectionLevel`、`exportPolicy` | 合同已生效、摘要快照存在、参与人齐备、执行负责人明确、无未收口再基线化、版本匹配 | `interface-openapi-dto-design.md` §5.1  | 待 EX-08B3 实现                |
| `POST /api/contract-handover-rebaselines`              | `rebaselineContractHandover`      | `contractAmendmentId`、`rebaselineReason`、`affectedHandoverItemIds[]`、`effectiveBaselineAfterId`、`expectedVersion` | `targetId`、`rebaselineRecordId`、`effectiveBaselineAfterId`、`resultStatus`                                                                                                          | 已存在生效合同变更、移交前承接事实已形成、影响范围明确、当前状态允许再基线化     | `interface-openapi-dto-design.md` §5.5B | 待 EX-08B3 或专门命令段实现    |
| `POST /api/approval-summary-packages/:targetId:review` | `reviewApprovalSummaryProjection` | `approvalScenarioKey`、`summaryPackageKey`、`projectionLevel`、`exportPolicy`、`comment`、`expectedVersion`           | `targetId`、`approvalScenarioKey`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`resultStatus`                                                        | 场景和字段包定义存在，调用人具备复核 / 生成权限                                  | `interface-openapi-dto-design.md` §5.5B | 最小实现归入 EX-08A2 / EX-08C1 |

---

## 6. 读侧边界

| Query / View                            | Consumer                             | Fields                                                                                                                                                                                                                                                      | Filter / Sort                                            | Permission Boundary                                       | Design Source                         | Result               |
| --------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- | -------------------- |
| `ContractHandoverSummaryView`           | 合同承接页、移交确认页、项目总览摘要 | `effectiveContractSetSummary`、`contractBaselineValidationSummary`、`currentHandoverBaselineSummary`、`latestHandoverRebaselineSummary`、`receivablePlanInitSummary`、`contractSummarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions`      | by `projectId`; 最新当前有效摘要                         | 按合同 / 项目可见性与摘要投影输出，不默认暴露完整合同详情 | `query-view-boundary-design.md` §5.2  | 待 EX-08B1 实现      |
| `ProjectHandoverDetailView`             | 移交确认页、移交追溯页、后续冻结页   | `effectiveContractSetSummary`、`contractSummarySnapshotId`、`currentHandoverBaselineSummary`、`participantConfirmationSummary`、`receiptJudgmentModeSummary`、`summaryPackageKey`、`summarySnapshotId`、`projectionLevel`、`exportPolicy`、`allowedActions` | by `handoverId` / `projectId`; 时间倒序                  | 参与角色确认区、通知、打印材料与审计摘要共享同一摘要快照  | `query-view-boundary-design.md` §5.1  | 待 EX-08B2 实现      |
| `ContractHandoverRebaselineHistoryView` | 合同承接页、移交 gate、冻结链        | `contractAmendmentSummary`、`rebaselineReason`、`affectedHandoverItemSummary`、`effectiveBaselineAfterSummary`、`handledAt`                                                                                                                                 | by `projectId` / `contractAmendmentId`; `handledAt desc` | 不把再基线化影响压平成单一当前基线                        | `query-view-boundary-design.md` §5.3C | 待 EX-08B1 / B2 实现 |
| `HandoverBaselineImpactView`            | 移交阻断解释、再基线化影响说明       | `originalBaselineSummary`、`changeImpactSummary`、`currentEffectiveBaselineSummary`、`riskFlags`                                                                                                                                                            | by `rebaselineRecordId`                                  | 仅输出摘要和风险标记，敏感字段走摘要投影                  | `query-view-boundary-design.md` §5.3C | 待 EX-08B1 / B2 实现 |

---

## 7. 持久化边界

| Table                                 | Migration                                                 | Entity / Repository                                                               | DDL / Freeze Source                                                         | Check Result                                               |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `project_handover`                    | `Migration20260415090000_ex08a1_project_handover_core.ts` | `ProjectHandover` / `ProjectHandoverRepository`                                   | `table-structure-freeze-design.md` §4.1; `schema-ddl-design.md` §8.1        | 已由 EX-08A1 实现；摘要快照 FK 待 EX-08A2                  |
| `contract_handover_rebaseline_record` | `Migration20260415090000_ex08a1_project_handover_core.ts` | `ContractHandoverRebaselineRecord` / `ContractHandoverRebaselineRecordRepository` | `table-structure-freeze-design.md` §7.8; `schema-ddl-design.md` §8.10.1     | 已由 EX-08A1 实现；合同变更 / 条款快照表 FK 待上游实体落地 |
| `handover_baseline_impact_item`       | `Migration20260415090000_ex08a1_project_handover_core.ts` | `HandoverBaselineImpactItem` / `HandoverBaselineImpactItemRepository`             | `table-structure-freeze-design.md` §7.8; `schema-ddl-design.md` §8.10.1     | 已由 EX-08A1 实现                                          |
| `approval_summary_package_definition` | 待 EX-08A2                                                | 待 EX-08A2                                                                        | `table-structure-freeze-design.md` §7.8; `schema-ddl-design.md` §8.10.2     | 待实现或记录受控替代                                       |
| `approval_summary_snapshot`           | 待 EX-08A2                                                | 待 EX-08A2                                                                        | `table-structure-freeze-design.md` §7.8; `schema-ddl-design.md` §8.10.2     | 待实现或记录受控替代                                       |
| `approval_summary_field_projection`   | 待 EX-08A2                                                | 待 EX-08A2                                                                        | `table-structure-freeze-design.md` §7.8; `schema-ddl-design.md` §8.10.2     | 待实现或记录受控替代                                       |
| `confirmation_record`                 | 待 EX-08A3                                                | 待 EX-08A3                                                                        | `table-structure-freeze-design.md` §4.4; `schema-ddl-design.md` §4.2 / §4.3 | 待实现                                                     |
| `confirmation_participant`            | 待 EX-08A3                                                | 待 EX-08A3                                                                        | `table-structure-freeze-design.md` §4.4; `schema-ddl-design.md` §4.2 / §4.3 | 待实现                                                     |

| Field                                                      | Design Type / Meaning                             | Migration / DDL                                             | Entity                                | Shared Contract / OpenAPI             | Result                                   |
| ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- | ------------------------------------- | ---------------------------------------- |
| `project_handover.contract_summary_snapshot_id`            | 合同承接摘要快照，内部 UUID                       | `uuid not null`, FK to `approval_summary_snapshot.id`       | `contractSummarySnapshotId`           | `contractSummarySnapshotId`           | EX-08A1 已落列；FK 待 EX-08A2            |
| `project_handover.effective_handover_baseline_snapshot_id` | 当前移交前有效基线快照，内部 UUID                 | `uuid not null`, FK to `contract_term_snapshot.id`          | `effectiveHandoverBaselineSnapshotId` | `effectiveHandoverBaselineSnapshotId` | EX-08A1 已落列；FK 受 EX-08-E05 控制     |
| `project_handover.summary_snapshot_id`                     | 移交确认摘要快照，内部 UUID                       | `uuid not null`, FK to `approval_summary_snapshot.id`       | `summarySnapshotId`                   | `summarySnapshotId`                   | EX-08A1 已落列；FK 待 EX-08A2            |
| `project_handover.handover_rebaseline_record_id`           | 最近一次已生效移交前再基线化记录，内部 UUID，可空 | `uuid null`, FK to `contract_handover_rebaseline_record.id` | `handoverRebaselineRecordId`          | `handoverRebaselineRecordId`          | EX-08A1 已实现；EX-07 延迟 FK 已同步清理 |
| `approval_summary_snapshot.projection_level`               | 场景摘要投影级别                                  | `varchar(32) not null`                                      | `projectionLevel`                     | `projectionLevel`                     | 待 EX-08A2                               |
| `approval_summary_snapshot.export_policy`                  | 通知 / 打印 / 导出策略                            | `varchar(32) not null`                                      | `exportPolicy`                        | `exportPolicy`                        | 待 EX-08A2                               |
| `confirmation_record.target_type + target_id`              | 多态确认目标引用                                  | 弱引用，应用层校验                                          | `targetType` / `targetId`             | `confirmationRecordId` 间接返回       | 待 EX-08A3                               |
| `contract_handover_rebaseline_record.status`               | 再基线化状态                                      | `varchar(32) not null`                                      | `status`                              | `resultStatus` / summary              | EX-08A1 已实现                           |

---

## 8. 一致性结论

- Document -> code: 本基线冻结正式输入；后续实现不得绕过四条核心引用链直接拼装移交依据。
- Migration -> entity: EX-08A1 已通过 `migration-check`；EX-08A2 / A3 仍需在对应切片继续验证。
- Entity -> contract: 待 EX-08C1 同步 shared contracts、API DTO、OpenAPI 与 generated client。
- Route -> command: `confirmProjectHandover`、`rebaselineContractHandover` 与摘要复核入口必须是命令型接口，不得退化为普通 PATCH。
- Query -> view: `ContractHandoverSummaryView` 与 `ProjectHandoverDetailView` 是稳定读模型，不允许前端从多个详情接口临时拼装。
- Guard / permission: EX-08B3 必须在写侧 guard 中覆盖合同状态、摘要快照、多方确认、执行负责人、再基线化状态与并发版本。
- OpenAPI / generated client: EX-08C1 必须生成并检查；当前仓库已有 generated client whitespace 问题，进入 G3 前必须清理。

---

## 9. 测试与校验

| Check                            | Required | Command / Evidence                                                       | Result                  | Gap / Reason                                                                                     |
| -------------------------------- | -------- | ------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------ |
| Build                            | Yes      | `pnpm nx build poms-api`                                                 | EX-08A1 Pass 2026-04-15 | 后端 cross-layer 切片必跑                                                                        |
| Unit tests                       | Yes      | `pnpm nx test poms-api --runInBand`                                      | EX-08A1 Pass 2026-04-15 | 覆盖命令成功、阻断和查询聚合                                                                     |
| API / integration tests          | Yes      | service / controller specs                                               | 待 EX-08C2              | 覆盖 persistence、guard、transaction、summary chain                                              |
| E2E                              | Yes      | `pnpm nx run poms-api-e2e:e2e --runInBand`                               | EX-08A1 Pass 2026-04-15 | 既有 E2E 已覆盖 migration-up、seeder 与现有接口不被 FK 变更破坏；EX-08 命令场景仍待 EX-08C2 补充 |
| OpenAPI generation / client diff | Yes      | `pnpm nx run poms-api:openapi`; `pnpm nx run shared-api-client:generate` | 待 EX-08C1              | generated client whitespace 必须清理                                                             |
| Migration / schema check         | Yes      | `pnpm nx run poms-api:migration-check`                                   | EX-08A1 Pass 2026-04-15 | 涉及新增表与补 FK，必须确认无新增 drift                                                          |
| Whitespace                       | Yes      | `git diff --check`                                                       | 待 EX-08C1 / C2         | 当前全仓已有 generated client whitespace 阻断，需在 EX-08C1 清理                                 |

---

## 10. 例外与风险

| Exception ID | Level  | Scope                                                         | Approved By | Cleanup Owner | Cleanup Due    | Notes                                                                                                                                               |
| ------------ | ------ | ------------------------------------------------------------- | ----------- | ------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-08-E01    | Closed | `EX-07` 已存在 `handover_rebaseline_record_id` 字段但 FK 延迟 | Codex       | Codex         | 2026-04-15     | 已由 EX-08A1 关闭：`contract_handover_rebaseline_record` 已落地，三张 EX-07 表已补齐 FK 并通过 `migration-check`                                    |
| EX-08-E02    | E2     | 摘要快照横切能力只做最小承接                                  | Codex       | EX-08A2 owner | EX-08A2 完成前 | 若不实现完整 `approval_summary_*` 模型，必须记录受控替代、可追溯字段和后续清理 owner                                                                |
| EX-08-E03    | E2     | 多方确认横切能力只做移交所需最小承接                          | Codex       | EX-08A3 owner | EX-08A3 完成前 | 若复用既有 approval / todo 能力，必须证明 `confirmationRecordId`、参与人进度、关闭语义和审计留痕可稳定输出                                          |
| EX-08-E04    | E1     | generated client whitespace 已存在                            | Codex       | EX-08C1 owner | EX-08C1 完成前 | 当前 `git diff --check origin/main...HEAD` 已因 generated client 尾随空白失败，EX-08C1 必须清理后再提交 G3                                          |
| EX-08-E05    | E2     | `contract_term_snapshot` 物理表当前未落地                     | Codex       | EX-08B3 owner | EX-08B3 完成前 | EX-08A1 先保留 `effective_handover_baseline_snapshot_id` / `effective_baseline_after_id` 为稳定 UUID；命令 guard 消费前必须补正式 FK 或登记替代来源 |

---

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-14
- Conditions:
  - `EX-08A0` 仅完成实施基线冻结，不代表 `EX-08` 可关闭。
  - 后续必须按 `EX-08A2 -> EX-08A3 -> EX-08B1 -> EX-08B2 -> EX-08B3 -> EX-08C1 -> EX-08C2 -> EX-08C3` 顺序推进。
  - `EX-08A1` 已清理 `EX-07` 延迟 FK 例外；`EX-08B3` 消费移交前有效基线前必须处理 `EX-08-E05`。
  - `EX-08C1` 必须清理 generated client whitespace，避免 `git diff --check` 阻断 `G3`。
  - 父任务 `EX-08` 只有在所有子任务完成、验证通过并完成文档回写后才允许进入 `Done`。
