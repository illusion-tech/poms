# EX-15H 在途 / 紧邻切片 public route surface 清点与回灌

- Gate Status: `Pass`
- Parent: `EX-15`
- Owner: `Codex`
- Slice Type: `process-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-18`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15H`

## 1. 范围

- 本次目标:
  - 依据新治理规则，对当前在途与紧邻后续切片的 public route surface 做一次事实清点。
  - 判断哪些切片已经具备可恢复 / 可开工的 authoritative route 输入，哪些切片仍缺失 route governance 前置条件。
  - 把清点结果回写到 tracker，避免再次出现“先写 controller / DTO / OpenAPI，后补 inventory”的执行顺序漂移。
- 本次覆盖:
  - `EX-13A`、`EX-13B`、`EX-13C`
  - `EX-14A`、`EX-14B`、`EX-14C`
- 本次明确不做:
  - 不为 `EX-14` 猜测 canonical route 名称。
  - 不在 authoritative inventory 中写入尚未冻结的 `EX-14` route。
  - 不恢复 `EX-13B` 业务实现，只完成治理清点与 tracker 回灌。

## 2. 正式输入

| Input Type              | Document / Source                                                                                                        | Section / Anchor | Status   | Notes                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------- | -------- | --------------------------------------------------------------------------- |
| Governance gate         | `docs/design/implementation-governance-gates.md`                                                                         | `G0` ~ `G3`      | Active   | 公共 route surface 必须先进入 authoritative inventory                       |
| Governance checks       | `docs/reference/implementation-governance-checks.md`                                                                     | §2, §6           | Active   | `api / command` 变更缺 inventory 行时默认阻断                               |
| Authoritative inventory | `docs/design/api-route-canonical-inventory.md`                                                                           | §6.8             | Active   | `EX-13` 八条 planned route 已冻结                                           |
| EX-13 baseline          | `docs/design/ex-13b-operating-signal-command-query-baseline.md`                                                          | 全文             | Accepted | `EX-13B` 已明确恢复前必须消费 route SSOT                                    |
| Query boundary          | `docs/design/query-view-boundary-design.md`                                                                              | §5.3, §5.4       | Accepted | `CommissionFinalSettlementView`、`CommissionRuleExplanationView` 已定义视图 |
| EX-14 design            | `docs/design/phase2-project-variance-risk-explanation.md`、`docs/design/phase2-commission-retention-final-settlement.md` | 全文             | Review   | `EX-14` 已冻结业务目标，但尚未冻结 public route                             |
| Runtime fact            | `apps/poms-api/src/app/features/**`                                                                                      | 2026-04-18       | Fact     | 当前无 `EX-13` / `EX-14` 对应新 route 的 controller runtime 落地            |

## 3. 清点分类

本次清点使用以下工作分类，不替代 inventory 自身的 `Status` 字段：

- `not-applicable`: 当前子切片不直接新增 / 变更 / 删除 public route surface
- `planned-ready`: authoritative inventory 已冻结，runtime 尚未实现，可直接按既有 SSOT 恢复
- `governance-gap`: 设计已要求对外能力，但 authoritative inventory / canonical route 尚未冻结

## 4. 清点结果

| Slice    | Public Route Surface Facts                                                                                                                                                       | Sweep Class      | Decision                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| `EX-13A` | 仅完成 `project_operating_snapshot` 相关表链与 entity / repository 注册；未新增 controller route                                                                                 | `not-applicable` | 保持 `Done`                                                           |
| `EX-13B` | `api-route-canonical-inventory.md` §6.8 已冻结 8 条 `planned` route；当前 runtime 仍为 `Not implemented`，未发现残留未分类 route drift                                           | `planned-ready`  | 关闭 route-governance 阻断；恢复实现时直接沿既有 canonical route 开工 |
| `EX-13C` | 仅承担测试与文档回写；不直接新增 public route                                                                                                                                    | `not-applicable` | 继续依赖 `EX-13B`                                                     |
| `EX-14A` | 模型 / 持久化子切片；当前设计未要求它直接落 public route                                                                                                                         | `not-applicable` | 可与 route governance 解耦                                            |
| `EX-14B` | `query-view-boundary-design.md` 已定义 `CommissionFinalSettlementView`、`CommissionRuleExplanationView`；inventory 中无对应 authoritative route，代码中也无对应 controller route | `governance-gap` | 在 `G1 / G2` 前必须先冻结 `EX-14` public route baseline 与 inventory  |
| `EX-14C` | 仅承担测试与文档回写；不直接新增 public route                                                                                                                                    | `not-applicable` | 继续依赖 `EX-14B`                                                     |

## 5. 额外发现

- `query-view-boundary-design.md` 同时存在 `CommissionStageGateView`，但当前 tracker 尚未把它分配到明确 executable slice，inventory 与 runtime 中也没有对应 public route。
- 该能力本次只记录为“未进入执行切片的 future surface”，不在本轮擅自补录 canonical route；后续必须先挂到明确子任务，再进入 route governance。

## 6. 回灌结论

- `EX-13B` 的 route-governance 前置条件已经满足，不需要再追加新的 route-governance 子切片；后续若恢复实现，应直接消费 `EX-15G` 已冻结的 planned surface。
- `EX-14B` 当前不具备直接进入 `G1 / G2` 的条件；应先新增前置治理子切片，冻结 `EX-14` public route surface 的 canonical route 与 authoritative inventory。
- 对于未进入 executable slice 的 future surface，不得因为 query boundary 已写视图名就直接开始 controller / DTO 设计。

## 7. 测试与校验

| Check              | Required | Command / Evidence   | Result | Gap / Reason                              |
| ------------------ | -------- | -------------------- | ------ | ----------------------------------------- |
| `git diff --check` | Yes      | docs-only 回写后执行 | Passed | 仅校验本片新增 / 修改的治理文档与 tracker |
| Runtime build/test | No       | `N/A`                | `N/A`  | 本片不改业务代码                          |
| OpenAPI / client   | No       | `N/A`                | `N/A`  | 本片不新增或修改 public contract route    |

## 8. G1 / G4 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-18`
- Close-Out Scope:
  - `EX-13` public route surface 已被确认处于 `planned-ready` 状态。
  - `EX-14` public route governance 缺口已被转成显式 tracker 前置子任务。
  - 未分配 executable slice 的 future surface 已记录，不再隐性漂移。
