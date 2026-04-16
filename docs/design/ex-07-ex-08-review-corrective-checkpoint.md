# EX-07 / EX-08 审阅后纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `EX-07`, `EX-08`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G3 Reviewer: `Solo worktree checkpoint`
- Checkpoint Date: `2026-04-16`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `EX-07`, `EX-08`, `EX-07D1 ~ EX-07D3`, `EX-08D1`

---

## 1. 触发背景与范围

- 触发原因: `EX-07` 与 `EX-08` 已完成后，基于事实的实现审阅发现跨切片真实 drift，当前不能继续把两者视为“无条件可供下游依赖”的稳定输入。
- 本次目标: 记录审阅发现，按 corrective slice 修复最高优先级的一致性问题，并把剩余阻断拆为可执行子任务。
- 本次明确不做: 不扩展 `EX-09` 提成冻结链；不在本批改变 `EX-07` / `EX-08` 原始业务边界。
- 本次纠偏后可恢复的可信边界: `EX-07` 的经营快照 / 分摊 / 税务 / 阶段归属写侧具备项目级再基线引用校验、数据库级 active 唯一性与原子性保证；`EX-08` 的项目级再基线 current-effective 语义已由数据库唯一约束、命令写侧与 query 解释链共同保证。
- 仍不允许下游依赖的留白: 无；`EX-09` 现可在本次纠偏后的语义上继续推进。

---

## 2. 正式输入

| Input Type                | Document / Source                                                 | Section / Anchor     | Status   | Notes                                                        |
| ------------------------- | ----------------------------------------------------------------- | -------------------- | -------- | ------------------------------------------------------------ |
| Business design           | `phase2-actual-cost-accumulation-stage-view.md`                   | `EX-07`              | Accepted | 固定经营快照、分摊、税务、阶段归属口径                       |
| Business design           | `phase2-project-handover-gate-workspace.md`                       | `EX-08`              | Accepted | 固定移交 gate、再基线化与冻结来源口径                        |
| Command design            | `interface-command-design.md`                                     | `EX-07`, `EX-08`     | Accepted | 固定快照、分摊、税务、移交确认与再基线化命令边界             |
| DTO / OpenAPI design      | `interface-openapi-dto-design.md`                                 | `EX-07`, `EX-08`     | Accepted | 固定请求 / 响应字段与禁止输入边界                            |
| Query boundary            | `query-view-boundary-design.md`                                   | `EX-07`, `EX-08`     | Accepted | 固定 view 输出与下游消费边界                                 |
| Data model / table freeze | `table-structure-freeze-design.md`                                | `7.7`, `7.8`, `7.10` | Accepted | 固定快照、再基线、冻结来源与替代链字段                       |
| Schema / DDL              | `schema-ddl-design.md`                                            | `8.7`, `8.8`, `8.10` | Accepted | 以 migration / entity / DDL 对齐为准                         |
| Baseline / delivery doc   | `ex-07c-allocation-tax-stage-query-baseline.md`                   | 全文                 | Accepted | 固定 `EX-07C` 的查询、DDL、测试与 guard 边界                 |
| Baseline / delivery doc   | `ex-08-contract-handover-gate-baseline.md`                        | 全文                 | Accepted | 固定 `EX-08` 的交付边界、例外与子任务顺序                    |
| ADR                       | `../adr/014-design-execution-state-model-and-governance-gates.md` | gates                | Accepted | 本次按 `G3 corrective checkpoint` 记录，不改写历史 `G4` 留痕 |

---

## 3. Drift 清单与本次 SSOT

| Concern                   | Drift / SSOT                                                                                        | Corrective Rule                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Business semantics        | `EX-07` 快照在 `handover_rebaseline` 场景下只验证 FK 存在，不验证项目归属与 effective 状态          | `handover_rebaseline` 必须引用同项目、`status = effective` 的再基线记录                |
| Route / command naming    | 无新增 drift                                                                                        | 维持既有 route / command 名称，不借纠偏切片重命名 public API                           |
| DTO / contract naming     | `EX-07` 请求契约允许 `handoverRebaselineRecordId` 在 `handover_rebaseline` 场景继续为空             | 在共享契约和 service guard 两层同步收紧；`original` 场景不得伪带再基线记录             |
| Table / column naming     | `EX-08` 项目级再基线链仅有索引，无 `project_id + status = effective` 条件唯一约束                   | 新增 project 级 active-effective 条件唯一索引                                          |
| Date / time semantics     | 无新增 drift                                                                                        | 维持现有 `date` / `datetime` 语义                                                      |
| Identifier semantics      | `handover_rebaseline_record_id` 的 FK 已补齐，但尚未成为完整业务 guard                              | FK 仅负责存在性；业务一致性仍由 service 校验                                           |
| Money / decimal semantics | `EX-07` 多处先落 basis / supersede，再做金额解析或子记录保存，异常时可能留下半成品 current / active | 先完成语义解析，再在单事务内提交聚合写入                                               |
| Status machine            | `EX-07` 税务快照当前没有 active 唯一性；`EX-08` 项目级再基线 current-effective 仅由应用层维护       | 为 `EX-07` 税务快照和 `EX-08` 项目级再基线链补齐数据库级 current / active 约束与 guard |

---

## 4. 当前阻断结论

- Current Gate: `G3 = Pass`
- Blocking Findings:
  1. `EX-07` 经营快照 / 期末冻结快照在 `handover_rebaseline` 场景下缺少对再基线记录项目归属与 effective 状态的业务校验。
  2. `EX-07` 多个命令采用分步 flush，失败时可留下 current / active 半成品状态。
  3. `EX-07` 税务处理快照没有 active 唯一性约束，允许同一 project + tax treatment type 出现多条 active。
  4. `EX-08` 项目级再基线链没有 `project_id where status = effective` 条件唯一约束，query 只按 handledAt 取最近记录，无法从数据库层保证 single-effective 语义。
- Why parent task can be re-closed:
  1. `EX-07` / `EX-08` 当前 current / active 链已由共享契约、service guard、数据库条件唯一约束与单事务提交共同保证。
  2. 本次 drift 已完成 corrective 收口，并通过 unit / build / migration-check / e2e 验证，不再属于阻断下游依赖的活动偏差。

---

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. `EX-07D1`: 收紧 `handover_rebaseline` 引用校验与共享契约。
  2. `EX-07D2`: 把 `EX-07` 高风险多实体写入改为单事务提交。
  3. `EX-07D3`: 补齐税务快照 active 唯一性与 duplicate guard。
  4. `EX-08D1`: 补齐项目级 effective 再基线唯一约束，并同步 command / query 解释链。
- 本批未修复范围:
  1. 不扩展 `EX-08` 到 `EX-09` 的提成冻结链。
  2. 不新增前端页面或额外管理操作入口。

| Concern                       | Before                                             | After                                                                                     | Result |
| ----------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| 审后 drift 记录               | `EX-07` / `EX-08` 只有历史 `G4 = Pass` 留痕        | 新增 corrective checkpoint，完成 `EX-07D1 ~ EX-07D3`、`EX-08D1` 并保留历史与本轮收口证据  | Done   |
| 再基线引用校验                | `handover_rebaseline` 仅依赖 FK 存在性             | 共享契约要求 `handoverRebaselineRecordId` 必填，service 校验同项目且 `status = effective` | Done   |
| 高风险 supersede 写入         | 多个命令存在分步 flush / insert-before-update 风险 | 统一改为单事务提交，并在需要处先降级旧 active/current 再插入 replacement/current          | Done   |
| 税务 active 唯一性            | 同项目同税务类型允许多条 active                    | 新增 `uq_atts_project_type_active` 条件唯一约束，命令显式 duplicate guard                 | Done   |
| 项目级再基线 single-effective | 仅应用层约定，没有 DB 强约束                       | 新增 `uq_chrr_project_effective` 条件唯一约束，并收紧再基线 supersede 写入顺序            | Done   |

---

## 6. 测试与校验

| Check                            | Required    | Command / Evidence                                                         | Result | Gap / Reason                                      |
| -------------------------------- | ----------- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| Build                            | Yes         | `corepack pnpm nx build poms-api`                                          | Pass   | 2026-04-16 已执行                                 |
| Unit tests                       | Yes         | `corepack pnpm nx test poms-api --runInBand`                               | Pass   | 2026-04-16 已执行，29 suites / 323 tests 通过     |
| API / integration tests          | Yes         | `project-cost.service.spec.ts`, `project-handover-command.service.spec.ts` | Pass   | 已补充纠偏断言并通过                              |
| E2E                              | Yes         | `corepack pnpm nx run poms-api-e2e:e2e --runInBand`                        | Pass   | 2026-04-16 已执行，10 suites / 58 tests 通过      |
| OpenAPI generation / client diff | Conditional | 仅在契约变更时执行                                                         | Waived | 本次共享契约收紧未改变 OpenAPI 已冻结公开接口形状 |
| Migration / schema check         | Yes         | `corepack pnpm nx run poms-api:migration-check`                            | Pass   | 2026-04-16 已执行，schema is up-to-date           |
| Diff / whitespace check          | Yes         | `git diff --check`                                                         | Pass   | 2026-04-16 已执行                                 |

---

## 7. 残余阻断与后续切片

- 已解除的阻断:
  1. `EX-07D1` 已关闭：经营快照 / 期末冻结快照在 `handover_rebaseline` 场景下已强制校验 project ownership 与 effective 状态。
  2. `EX-07D2` 已关闭：经营基线包、分摊结果替代、阶段归属重分类、税务快照替代等高风险写侧已收口到事务性聚合提交。
  3. `EX-07D3` 已关闭：税务快照已具备项目 + tax treatment type 的 active 唯一约束与 duplicate guard。
  4. `EX-08D1` 已关闭：项目级再基线链已具备 `project_id where status = 'effective'` 条件唯一约束与顺序正确的 supersede 写入。
- 仍存在的阻断:
  1. 无。
- 后续子切片:
  1. `EX-09A` 可基于本次收口后的 single-effective 与 current / active 语义继续推进。

---

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes                                     |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----------------------------------------- |
| 无           | -     | -     | -           | -             | -           | 当前不接受“保留 drift 继续下游推进”的例外 |

---

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-16`
- Conditions:
  1. `EX-07` / `EX-08` 的历史 `G4 = Pass` 保留为历史事实，不删除。
  2. 当前 corrective close-out 已完成；`EX-07` / `EX-08` 恢复为可供下游依赖的 `Done` 状态，后续切片以本次收口后的实现与验证结果为准。
