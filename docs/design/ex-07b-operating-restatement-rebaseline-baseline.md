# EX-07B 重述记录与再基线选择链 实施基线包

- Gate Status: `Pass`
- Parent: `EX-07`
- Owner: `Codex`
- Slice Type: `command-query-persistence`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-14
- G4 Date: 2026-04-14
- Tracker Link / Row: `phase2-development-execution-tracker.md` EX-07B

---

## 1. 范围

- **本次目标**: 基于 EX-07A 已落地的经营基线包、项目经营快照与期末冻结快照模型，补齐经营基线选择写侧、项目 / 期末快照命令、重述记录主表、重述替代链以及最小查询接口。
- **本次覆盖对象**:
  - `operating_baseline_package`
  - `change_package_baseline`
  - `project_operating_snapshot`
  - `period_closing_snapshot`
  - `operating_restatement_record`
- **本次明确不做**:
  - 共享成本分摊、税务影响、阶段归属的完整计算引擎，继续留给 EX-07C / 后续专用切片收口。
  - `contract_handover_rebaseline_record` 主表与 `handover_rebaseline_record_id` 外键，本切片延迟，已由 EX-08A1 补齐。
  - `operating_signal_evaluation_result`、`data_maturity_evaluation_result`、`operating_signal_gate_binding`，继续留给 EX-13。
- **下游可依赖的交付边界**: 可创建当前有效经营基线包，可冻结项目经营快照与期末快照，可登记 append-only 经营重述记录并生成替代经营快照，可通过 API 查询当前基线包、快照与重述历史。
- **不允许下游依赖的留白**: 不把本切片输出解释为最终分摊 / 税务 / 经营信号评价结果；`handover_rebaseline_record_id` 已在 EX-08A1 补齐 FK。

---

## 2. 正式输入

| Input Type                | Document / Source                                  | Section / Anchor          | Status | Notes                                        |
| ------------------------- | -------------------------------------------------- | ------------------------- | ------ | -------------------------------------------- |
| Business design           | `phase2-actual-cost-accumulation-stage-view.md`    | 累计口径、阶段视图        | Review | 项目经营快照与期末快照的成本累计边界         |
| Business design           | `phase2-estimated-to-actual-cost-bridge.md`        | 基线版本规则              | Review | 原始基线、当前有效经营基线、再基线选择来源   |
| Data model / table freeze | `table-structure-freeze-design.md`                 | `L2` 经营快照相关表       | Active | 表分层、字段组与关系边界                     |
| Schema / DDL              | `schema-ddl-design.md`                             | `operating_*` 表 DDL 建议 | Active | 主键、外键、索引、条件唯一约束               |
| Prerequisite baseline     | `ex-07a-cost-accumulation-snapshot-baseline.md`    | 全文                      | Pass   | 经营基线、快照基础表已落地                   |
| Money semantics           | `ex-06d-payable-payment-tax-semantics-baseline.md` | 全文                      | Pass   | EX-07 以后统一基于未税 / 税额 / 含税明确口径 |

---

## 3. 本次 SSOT

| Concern                   | SSOT                                               | Implementation Rule                                                                                   |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Baseline selection        | `phase2-estimated-to-actual-cost-bridge.md`        | `baselineSelectionSource = original / handover_rebaseline`；后者必须携带 `handoverRebaselineRecordId` |
| Snapshot immutability     | `schema-ddl-design.md` + EX-07A entity             | 历史快照不重算；重述通过新快照 + `supersedesId` 表达替代链                                            |
| Period closing semantics  | `phase2-actual-cost-accumulation-stage-view.md`    | 同一项目同一 `periodKey` 只允许一条当前有效期末冻结快照                                               |
| Restatement semantics     | `schema-ddl-design.md`                             | `operating_restatement_record` append-only，活动重述对同一被重述快照条件唯一                          |
| Money / decimal semantics | `ex-06d-payable-payment-tax-semantics-baseline.md` | 金额字段保持 `decimal(18,2)` 字符串化输出；毛利率为可空比例值                                         |
| API / DTO semantics       | `libs/shared/contracts` + `libs/api/contracts`     | Zod schema、DTO、OpenAPI 与 generated client 同步                                                     |

---

## 4. 命令与接口边界

| Capability       | Route                                                        | Service Method                     | Result                                                                                             |
| ---------------- | ------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| 激活经营基线包   | `POST /api/project-cost/activate-operating-baseline-package` | `activateOperatingBaselinePackage` | 生成当前有效 `operating_baseline_package` 与 `change_package_baseline` 明细，并 supersede 旧当前包 |
| 创建项目经营快照 | `POST /api/project-cost/create-project-operating-snapshot`   | `createProjectOperatingSnapshot`   | 生成 `project_operating_snapshot`                                                                  |
| 创建期末冻结快照 | `POST /api/project-cost/create-period-closing-snapshot`      | `createPeriodClosingSnapshot`      | 生成 `period_closing_snapshot`，同项目同期间当前有效唯一                                           |
| 创建经营重述     | `POST /api/project-cost/create-operating-restatement`        | `createOperatingRestatement`       | 新建重述快照、supersede 被重述快照、登记 `operating_restatement_record`                            |

---

## 5. 读侧边界

| View / Query     | Route                                                             | Notes                          |
| ---------------- | ----------------------------------------------------------------- | ------------------------------ |
| 当前经营基线包   | `GET /api/projects/:projectId/operating-baseline-package/current` | 返回当前有效基线包与变更包明细 |
| 项目经营快照详情 | `GET /api/project-operating-snapshots/:id`                        | 返回经营快照固定口径           |
| 期末冻结快照详情 | `GET /api/period-closing-snapshots/:id`                           | 返回期末快照固定口径           |
| 项目经营重述列表 | `GET /api/projects/:projectId/operating-restatements`             | 按处理时间倒序返回重述历史     |
| 经营重述详情     | `GET /api/operating-restatements/:id`                             | 返回被重述 / 重述后快照引用    |

---

## 6. 持久化边界

| Table                          | Migration                                                                            | Entity / Repository                                                   | Check Result                    |
| ------------------------------ | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------- |
| `operating_baseline_package`   | EX-07A migration                                                                     | `OperatingBaselinePackageRepository`                                  | 已接入命令 / 查询链             |
| `change_package_baseline`      | EX-07A migration                                                                     | `ChangePackageBaselineRepository`                                     | 已接入命令 / 查询链             |
| `project_operating_snapshot`   | EX-07A migration                                                                     | `ProjectOperatingSnapshotRepository`                                  | 已接入命令 / 查询链与重述替代链 |
| `period_closing_snapshot`      | EX-07A migration                                                                     | `PeriodClosingSnapshotRepository`                                     | 已接入命令 / 查询链             |
| `operating_restatement_record` | `Migration20260414130000_ex07b_operating_restatement_record.ts` + comments migration | `OperatingRestatementRecord` / `OperatingRestatementRecordRepository` | 已落地 FK、索引与条件唯一约束   |

---

## 7. 一致性结论

- Document -> code: EX-07A 留出的经营基线包、快照与重述链已进入真实命令 / 查询实现。
- Migration -> entity: `operating_restatement_record` migration、entity、repository 已对齐。
- Entity -> contract / OpenAPI: shared contracts、API DTO、OpenAPI spec 与 generated client 已同步。
- Route -> command: controller routes 全部映射到 `ProjectCostService`，统一使用 `CommandResult` 返回写侧结果。
- Query / view: 当前基线包、项目快照、期末快照、重述 list/detail 已提供最小读侧。
- Guard / permission: 沿用 `ProjectCostController` 既有 `JwtAuthGuard` 与 `@CurrentUser` 身份来源；本切片未新增角色矩阵项。
- OpenAPI / generated client: `shared-api-client` 已重新生成，新增 EX-07B 相关 model 与 `project-cost.service.ts` 方法。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                      | Result                      | Gap / Reason                                         |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------- |
| Build                            | Yes      | `pnpm nx build poms-api`                                                                                | Pass                        |                                                      |
| Unit tests                       | Yes      | `pnpm nx test poms-api --runInBand`                                                                     | Pass, 24 suites / 278 tests |                                                      |
| API / integration tests          | Yes      | service spec covers baseline activation、period snapshot、project snapshot、restatement duplicate guard | Pass                        |                                                      |
| E2E                              | Yes      | `pnpm nx run poms-api-e2e:e2e --runInBand`                                                              | Pass, 9 suites / 52 tests   | 新增 actual-cost workflow 覆盖基线 -> 快照 -> 重述链 |
| OpenAPI generation / client diff | Yes      | `pnpm nx run poms-api:openapi`; `JAVA_HOME=Zulu 17 pnpm nx run shared-api-client:generate`              | Pass                        | Client generation 需要 Java 11+，本机使用 Zulu 17    |
| Migration / schema check         | Yes      | `pnpm nx run poms-api:migration-check`                                                                  | Pass, No changes required   |                                                      |

---

## 9. 例外与风险

| Exception ID | Level  | Scope                                | Approved By | Cleanup Owner | Cleanup Due | Notes                                                                                                  |
| ------------ | ------ | ------------------------------------ | ----------- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| EX-07B-E01   | Closed | `handover_rebaseline_record_id` 外键 | Codex       | Codex         | 2026-04-15  | 已由 EX-08A1 新增字段并补齐到 `contract_handover_rebaseline_record.id` 的 FK，且通过 `migration-check` |

---

## 10. G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-14
- Conditions: EX-07B-E01 已显式继承；代码、migration、OpenAPI / generated client、unit tests、E2E 与文档回写已完成。
