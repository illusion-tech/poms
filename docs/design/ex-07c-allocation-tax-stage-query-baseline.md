# EX-07C 分摊、税务与阶段视图收口 实施基线包

- Gate Status: `Pass`
- Parent: `EX-07`
- Owner: `Codex`
- Slice Type: `command-query-contract`
- G1 Reviewer: `Codex`
- G1 Date: 2026-04-14
- G4 Date: 2026-04-14
- Tracker Link / Row: `phase2-development-execution-tracker.md` EX-07C

---

## 1. 范围

- **本次目标**: 在 EX-07A 的表结构与 EX-07B 的经营基线 / 快照 / 重述链之上，补齐共享成本分摊、成本阶段归属与项目税务处理的最小命令、读侧查询、权限守卫、OpenAPI / generated client 与 E2E 覆盖。
- **本次覆盖对象**:
  - `shared_cost_allocation_basis`
  - `shared_cost_allocation_result`
  - `cost_stage_attribution_snapshot`
  - `accounting_tax_treatment_snapshot`
- **本次明确不做**:
  - 不落地自动分摊计算引擎；本切片接收已确认的人工 / 外部计算结果并固化为可追溯快照。
  - 不落地经营信号评价、数据成熟度评价与 L4 -> L5 gate 绑定；继续留给 EX-13。
  - 不补 `handover_rebaseline_record_id` 外键；继续沿用 EX-07A / EX-07B 例外，已由 EX-08A1 主表落地时补齐。
- **下游可依赖的交付边界**: 可确认共享成本分摊依据与项目分摊结果，可替代当前有效分摊结果；可确认 / 重分类成本阶段归属并同步统一成本记录阶段字段；可确认项目税务处理快照并保留替代链；可通过 list/detail 查询分摊、阶段归属与税务历史。
- **不允许下游依赖的留白**: 不把本切片输出解释为最终经营信号、提成冻结或移交 gate 结论；EX-08 仍需自行收口移交摘要与 handover rebaseline 主链。

---

## 2. 正式输入

| Input Type                | Document / Source                                     | Section / Anchor             | Status | Notes                                    |
| ------------------------- | ----------------------------------------------------- | ---------------------------- | ------ | ---------------------------------------- |
| Business design           | `phase2-actual-cost-accumulation-stage-view.md`       | 分摊、阶段视图、成本累计口径 | Review | 固定共享成本分摊与阶段归属的业务边界     |
| Business design           | `phase2-estimated-to-actual-cost-bridge.md`           | 估算到实际成本承接           | Review | 阶段归属与实际成本记录之间的承接口径     |
| Interface design          | `interface-openapi-dto-design.md`                     | EX-07 command / query DTO    | Active | 固定 command 名称、query view 与契约边界 |
| Data model / table freeze | `table-structure-freeze-design.md`                    | `L2` 分摊 / 税务 / 阶段表    | Active | 表分层、字段组与关系边界                 |
| Schema / DDL              | `schema-ddl-design.md`                                | EX-07A 表 DDL                | Active | 主键、外键、索引、条件唯一约束           |
| Prerequisite baseline     | `ex-07a-cost-accumulation-snapshot-baseline.md`       | 全文                         | Pass   | EX-07C 使用的基础表已落地                |
| Prerequisite baseline     | `ex-07b-operating-restatement-rebaseline-baseline.md` | 全文                         | Pass   | 不回退经营基线包、经营快照与重述替代链   |

---

## 3. 本次 SSOT

| Concern                         | SSOT                                           | Implementation Rule                                                                         |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Shared allocation basis         | `shared_cost_allocation_basis`                 | 同一 source cost scope 只允许一个当前有效 basis；source cost record id 去重后生成 scope key |
| Shared allocation result        | `shared_cost_allocation_result`                | 同一 basis + project 只允许一个 active result；替代时先 supersede 旧记录再创建新 active     |
| Cost stage attribution snapshot | `cost_stage_attribution_snapshot`              | 同一 cost record 只允许一个 active 阶段归属；重分类通过 replacement + supersedesId 追溯     |
| Actual cost stage mirror        | `project_actual_cost_record`                   | 阶段确认 / 重分类同步 `executionStageCode`、`stageDerivedFrom*` 与锁定时间字段              |
| Accounting tax treatment        | `accounting_tax_treatment_snapshot`            | 项目税务处理按快照追加；可显式 supersede 当前 active 快照并保留历史                         |
| API / DTO semantics             | `libs/shared/contracts` + `libs/api/contracts` | Zod schema、DTO、OpenAPI 与 generated client 同步                                           |

---

## 4. 命令与接口边界

| Capability           | Route                                                          | Service Method                      | Result                                               |
| -------------------- | -------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| 确认共享成本分摊依据 | `POST /api/project-cost/confirm-shared-cost-allocation-basis`  | `confirmSharedCostAllocationBasis`  | 生成 active basis 与项目分摊结果                     |
| 替代共享成本分摊结果 | `POST /api/project-cost/replace-shared-cost-allocation-result` | `replaceSharedCostAllocationResult` | supersede 旧 result 并生成新 active result           |
| 确认成本阶段归属     | `POST /api/project-cost/confirm-cost-stage-attribution`        | `confirmCostStageAttribution`       | 生成 active attribution snapshot 并同步成本记录阶段  |
| 重分类成本阶段归属   | `POST /api/project-cost/reclassify-cost-stage-attribution`     | `reclassifyCostStageAttribution`    | supersede 旧 attribution 并生成新 active attribution |
| 确认项目税务处理     | `POST /api/project-cost/confirm-accounting-tax-treatment`      | `confirmAccountingTaxTreatment`     | 生成 active tax treatment snapshot，可替代旧快照     |

---

## 5. 读侧边界

| View / Query         | Route                                                                   | Notes                                  |
| -------------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| 共享成本分摊依据详情 | `GET /api/shared-cost-allocation-bases/:id`                             | 返回 basis 与 active / superseded 汇总 |
| 共享成本分摊结果列表 | `GET /api/shared-cost-allocation-bases/:id/results`                     | 返回 basis 下所有项目分摊结果          |
| 成本阶段归属历史     | `GET /api/project-actual-cost-records/:costRecordId/stage-attributions` | 返回 cost record 的阶段归属替代链      |
| 成本阶段归属详情     | `GET /api/cost-stage-attributions/:id`                                  | 返回单条阶段归属快照                   |
| 项目税务处理快照列表 | `GET /api/projects/:projectId/accounting-tax-treatments`                | 返回项目税务处理快照历史               |
| 项目税务处理快照详情 | `GET /api/accounting-tax-treatments/:id`                                | 返回单条税务处理快照                   |

---

## 6. 持久化边界

| Table                               | Migration        | Entity / Repository                        | Check Result                               |
| ----------------------------------- | ---------------- | ------------------------------------------ | ------------------------------------------ |
| `shared_cost_allocation_basis`      | EX-07A migration | `SharedCostAllocationBasisRepository`      | 已接入 confirm / detail 查询               |
| `shared_cost_allocation_result`     | EX-07A migration | `SharedCostAllocationResultRepository`     | 已接入 confirm / replace / list 查询       |
| `cost_stage_attribution_snapshot`   | EX-07A migration | `CostStageAttributionSnapshotRepository`   | 已接入 confirm / reclassify / history 查询 |
| `accounting_tax_treatment_snapshot` | EX-07A migration | `AccountingTaxTreatmentSnapshotRepository` | 已接入 confirm / list / detail 查询        |
| `project_actual_cost_record`        | EX-06 migration  | `ProjectActualCostRecordRepository`        | 已接入阶段归属镜像字段更新                 |

---

## 7. 一致性结论

- Document -> code: EX-07C 对 interface design 中列出的共享成本分摊、成本阶段归属与税务处理命令 / 查询完成落地。
- Migration -> entity: 本切片复用 EX-07A 已建表结构，`migration-check` 返回 `No changes required`。
- Entity -> contract / OpenAPI: shared contracts、API DTO、OpenAPI spec 与 generated client 已同步。
- Route -> command: controller routes 全部映射到 `ProjectCostService`，写侧统一使用 `CommandResult` 返回。
- Query / view: 分摊 basis / result、阶段归属 history / detail、税务处理 list / detail 已提供最小读侧。
- Guard / permission: 新增 EX-07C routes 均沿用 `JwtAuthGuard` 与 `@HasPermissions('contract:finance:manage')`。

---

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                         | Result                      | Gap / Reason                                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------ | --------------------------- | ------------------------------------------------- |
| Build                            | Yes      | `pnpm nx build poms-api` / E2E dependency build                                            | Pass                        |                                                   |
| Unit tests                       | Yes      | `pnpm nx test poms-api --runInBand`                                                        | Pass, 24 suites / 284 tests |                                                   |
| API / integration tests          | Yes      | service spec covers allocation confirm / replace、stage confirm / reclassify、tax replace  | Pass                        |                                                   |
| E2E                              | Yes      | `pnpm nx run poms-api-e2e:e2e --runInBand`                                                 | Pass, 9 suites / 53 tests   | 新增 actual-cost workflow 覆盖 EX-07C 主链        |
| OpenAPI generation / client diff | Yes      | `pnpm nx run poms-api:openapi`; `JAVA_HOME=Zulu 17 pnpm nx run shared-api-client:generate` | Pass                        | Client generation 需要 Java 11+，本机使用 Zulu 17 |
| Migration / schema check         | Yes      | `pnpm nx run poms-api:migration-check`                                                     | Pass, No changes required   |                                                   |

---

## 9. 例外与风险

| Exception ID | Level  | Scope                                | Approved By | Cleanup Owner       | Cleanup Due      | Notes                                                                                                           |
| ------------ | ------ | ------------------------------------ | ----------- | ------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------- |
| EX-07C-E01   | Closed | `handover_rebaseline_record_id` 外键 | Codex       | Codex               | 2026-04-15       | 已由 EX-08A1 关闭；`contract_handover_rebaseline_record` 已落地，EX-07 三张表 FK 已补齐并通过 `migration-check` |
| EX-07C-E02   | E3     | 自动分摊计算引擎                     | Codex       | EX-13 / later owner | 后续经营分析切片 | 本切片只固化已确认结果，不新增自动计算规则，避免抢跑经营评价 / 信号链                                           |

---

## 10. G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: 2026-04-14
- Conditions: EX-07C-E01 / EX-07C-E02 已显式记录；代码、OpenAPI / generated client、unit tests、E2E、migration-check 与文档回写已完成。`EX-07A`、`EX-07B`、`EX-07C` 均已完成，`EX-07` 可关闭并允许 `EX-08` 基于当前冻结口径推进。
