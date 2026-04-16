# EX-15E2C 分摊 / 阶段归属 / 税务处理 canonical identity 裁决基线包

- Gate Status: `Pass`
- G4 Closeout Date: `2026-04-17`
- Parent: `EX-15E2`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-17`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15E2C`

## 1. 范围

- 本次目标:
  - 冻结 `confirmSharedCostAllocationBasis`、`replaceSharedCostAllocationResult`、`confirmCostStageAttribution`、`reclassifyCostStageAttribution`、`confirmAccountingTaxTreatment` 的 canonical route 与 request identity。
  - 把当前被 `confirmAccountingTaxTreatment` 折叠承载的税务替代链恢复为独立正式能力 `replaceAccountingTaxTreatment`。
  - 为 `EX-15E2C` 后续 controller、shared contract、OpenAPI、generated client、HTTP E2E 的 direct cutover 提供单一实施输入。
- 本次明确不做:
  - G1 冻结阶段不在本片实现 runtime / contract / OpenAPI 切换；后续 direct cutover 已于 `2026-04-17` 在同一 slice 完成并回写。
  - 不修改 persistence schema、entity 字段或读侧 query boundary。
- 下游可依赖的交付边界:
  - create route 不再伪装成 item-action。
  - item-action route 的 path `{id}` 是 superseded item identity 的唯一 SSOT。
  - `confirmAccountingTaxTreatment` 只负责 create；replace 必须显式走 `replaceAccountingTaxTreatment`。
- 不允许下游依赖的留白:
  - 不得继续以 `/project-cost/confirm-*`、`/project-cost/replace-*` 作为正式目标 route。
  - 不得继续保留 body/path 双重携带同一 superseded identity。
  - 不得在无稳定资源锚点的 create request 中继续暴露 `expectedVersion`。

## 2. 正式输入

| Input Type           | Document / Source                              | Section / Anchor                                                                                        | Status    | Notes                                                                                          |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------- |
| Command design       | `interface-command-design.md`                  | `SharedCostAllocationBasis`、`CostStageAttributionSnapshot`、`AccountingTaxTreatmentSnapshot` 命令表    | Accepted  | 已承认 `confirmAccountingTaxTreatment` 与 `replaceAccountingTaxTreatment` 是两个独立能力       |
| DTO / OpenAPI design | `interface-openapi-dto-design.md`              | §5.5A `project-cost` round 2 补充命令 DTO 草案                                                          | Corrected | 本基线回写 create route、item identity 与 tax replace split                                    |
| Query boundary       | `query-view-boundary-design.md`                | `SharedCostAllocationDetailView`、`CostStageAttributionHistoryView`、`AccountingTaxTreatmentDetailView` | Accepted  | 读侧 item identity 已冻结                                                                      |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md`  | §4.1、§4.3                                                                                              | Accepted  | 创建资源优先使用 collection create / parent-subcollection create                               |
| Runtime fact         | `ProjectCostController` / `ProjectCostService` | allocation / stage / tax command handlers                                                               | Fact      | 当前 runtime 仍停留在 `/project-cost/*` slash-action，且 tax create / replace 被折叠在同一方法 |
| Route inventory      | `api-route-canonical-inventory.md`             | Batch 2 `project-cost` inventory                                                                        | Corrected | 本基线补录 EX-15E2C 六个 capability                                                            |

## 3. 本次 SSOT

| Concern               | SSOT                                                                                                                        | Implementation Rule                                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resource identity     | `SharedCostAllocationBasis`、`SharedCostAllocationResult`、`CostStageAttributionSnapshot`、`AccountingTaxTreatmentSnapshot` | route、controller、OpenAPI、shared contract 必须围绕正式资源 identity 建模                                                                                                                                                                                             |
| Create route grammar  | `ADR-015`                                                                                                                   | 创建新资源时使用 `POST /collection` 或 `POST /parents/{id}/children`；不得伪装成 `POST /resources/{id}:confirm`                                                                                                                                                        |
| Replacement identity  | path `{id}`                                                                                                                 | `replace*` / `reclassify*` 的 path `{id}` 是 superseded item identity SSOT；body 不得重复提交同一 id                                                                                                                                                                   |
| Parent ownership      | `ProjectActualCostRecord.id`、`Project.id`                                                                                  | 阶段归属 create 绑定在成本记录子集合下；税务处理 create 绑定在项目子集合下                                                                                                                                                                                             |
| Concurrency semantics | 仅对已存在且被校验的资源暴露 `expectedVersion`                                                                              | `replace*` / `reclassify*` 的 `expectedVersion` 绑定 superseded item；`confirmCostStageAttribution.expectedVersion` 绑定 parent `ProjectActualCostRecord.rowVersion`；`confirmSharedCostAllocationBasis` 与 `confirmAccountingTaxTreatment` 不再暴露 `expectedVersion` |
| Tax capability split  | `confirmAccountingTaxTreatment` + `replaceAccountingTaxTreatment`                                                           | create 与 replace 不能再复用一个 public command / route                                                                                                                                                                                                                |

## 4. 裁决结论

| Capability                          | Canonical Route                                             | Request Body                                                                                                                                                     | Key Decision                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `confirmSharedCostAllocationBasis`  | `POST /shared-cost-allocation-bases`                        | `basisType`、`sourceCostRecordIds`、`allocationMethod`、`projectShareItems[]`、`basisSummary?`、`comment?`                                                       | create `SharedCostAllocationBasis`，不存在可 confirm 的既有 item；移除无锚点 `expectedVersion`                      |
| `replaceSharedCostAllocationResult` | `POST /shared-cost-allocation-results/{id}:replace`         | `allocatedAmount`、`allocationRatio?`、`allocationSummary?`、`replacementReason`、`comment?`、`expectedVersion`                                                  | path `{id}` 是 superseded allocation result identity SSOT；移除 body `supersededAllocationResultId`                 |
| `confirmCostStageAttribution`       | `POST /project-actual-cost-records/{id}/stage-attributions` | `stageAttributionMode`、`attributedStage`、`lockedBySnapshotId?`、`attributionSummary?`、`comment?`、`expectedVersion`                                           | create `CostStageAttributionSnapshot`，path `{id}` 是 parent `ProjectActualCostRecord.id`；移除 body `costRecordId` |
| `reclassifyCostStageAttribution`    | `POST /cost-stage-attributions/{id}:reclassify`             | `newAttributedStage`、`lockedBySnapshotId?`、`reclassifyReason`、`comment?`、`expectedVersion`                                                                   | path `{id}` 是 superseded attribution identity SSOT；移除 body `supersededAttributionId`                            |
| `confirmAccountingTaxTreatment`     | `POST /projects/{projectId}/accounting-tax-treatments`      | `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmount`、`taxImpactSummary`、`taxPendingFlag`、`taxImpactPendingAmount`、`basisSummary?`                    | create 项目下当前税务处理快照；移除 body `projectId` 与 `supersedesTaxTreatmentSnapshotId`                          |
| `replaceAccountingTaxTreatment`     | `POST /accounting-tax-treatments/{id}:replace`              | `taxTreatmentType`、`deductibilityStatus`、`taxImpactAmount`、`taxImpactSummary`、`taxPendingFlag`、`taxImpactPendingAmount`、`basisSummary?`、`expectedVersion` | 从当前折叠式 confirm 中拆出独立 item-action；path `{id}` 是 superseded tax treatment snapshot identity              |

补充裁定:

1. `confirmCostStageAttribution.expectedVersion` 当前由 service 校验 parent `ProjectActualCostRecord.rowVersion`，因此保留，但语义必须显式绑定到 path parent。
2. 当前 persistence 不承载独立 `replacementReason` 字段；本片不扩大到 schema 变更，因此 `replaceAccountingTaxTreatment` 先只冻结 identity 与税务结论字段。
3. 现有 query route `GET /shared-cost-allocation-bases/{id}`、`GET /project-actual-cost-records/{costRecordId}/stage-attributions`、`GET /projects/{projectId}/accounting-tax-treatments` 不在本片改动范围内。

## 5. 明确拒绝的方案

1. 保留 `/project-cost/confirm-*`、`/project-cost/replace-*`
   - 原因: 历史 slash-action 实现残留，脱离正式资源 identity。
2. 保留 `POST /shared-cost-allocation-bases/{id}:confirm`、`POST /cost-stage-attributions/{id}:confirm`、`POST /accounting-tax-treatments/{id}:confirm`
   - 原因: create 语义被错误伪装成 item-action，且 tax route 还同时混合了 create / replace。
3. 以“过渡兼容”为理由继续允许 body 重复 superseded identity
   - 原因: 会在 controller、contract、OpenAPI、e2e helper 同时保留双 SSOT，延长清理周期并制造歧义。

## 6. 一致性结论

- Document -> code: `EX-15E2C` 已完成 direct cutover，runtime public route 与 authoritative design 已对齐。
- Migration -> entity: 本片不涉及 persistence 变更，无新增 drift。
- Entity -> contract: 现有 entity 已具备 `supersedesId` / `status` / parent foreign key，足以承载本轮 identity 裁决。
- Route -> command: create / replace / reclassify 的 route grammar 已按 `ADR-015` 回正；tax create / replace 边界已拆清。
- Query -> view: 现有 query boundary 与本轮 route 裁决一致，无需改写 read identity。
- OpenAPI / generated client: 已按 canonical route 与 request identity 回写，`shared-api-client:generate` 与 `shared-api-client:check` 均通过。

## 7. 测试与校验

| Check                            | Required | Command / Evidence                                                                                     | Result | Gap / Reason                                                                 |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                      | Pass   | `poms-api` build 已通过；consumer 侧 `poms-admin` build 亦已通过             |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                           | Pass   | 334 tests passed                                                             |
| API / integration tests          | Yes      | `corepack pnpm nx run poms-api:openapi`                                                                | Pass   | OpenAPI 已按 canonical route 回写                                            |
| E2E                              | Yes      | `corepack pnpm nx run poms-api-e2e:e2e --runInBand --testPathPattern=actual-cost-workflow.e2e-spec.ts` | Pass   | executor 实际跑了全量 suites，59 tests passed                                |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate` / `corepack pnpm nx run shared-api-client:check`     | Pass   | generated client 已回写且与 OpenAPI 同步                                     |
| Migration / schema check         | No       | `N/A`                                                                                                  | N/A    | 本片不含 persistence 变更；`api-contracts` 仅有 lint target，无 build target |
| Diff hygiene                     | Yes      | `git diff --check`                                                                                     | Pass   | 已通过                                                                       |

## 8. 风险与后续条件

| Risk / Condition                             | Notes                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| controller 需要拆出 tax replace public entry | 当前 runtime 只有 `confirmAccountingTaxTreatment` 一个 public handler；实施时必须显式新增 `replaceAccountingTaxTreatment` |
| shared contract 需要删除重复 identity 字段   | allocation / stage / tax 相关 request 需按本基线移除重复 identity 字段                                                    |
| create command optimistic locking 语义需收紧 | `confirmSharedCostAllocationBasis` 与 `confirmAccountingTaxTreatment` 当前暴露的 `expectedVersion` 必须一起清理           |
| e2e helper / generated client 需要同步回写   | route 与 request identity 切换后，support helper、OpenAPI 与 shared generated client 都必须同步更新                       |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-17`
- Conditions:
  - `EX-15E2C` 进入编码时，必须按本基线同步回写 controller、shared contract、OpenAPI、generated client、HTTP E2E、inventory 与 tracker。
  - 不接受为仓库内可控调用方保留 `/project-cost/*` legacy alias 或 body/path 双 identity 兼容层。

## 10. G4 Closeout

- Closeout Status: `Pass`
- Closed At: `2026-04-17`
- Delivered Boundary:
  - `confirmSharedCostAllocationBasis`、`replaceSharedCostAllocationResult`、`confirmCostStageAttribution`、`reclassifyCostStageAttribution`、`confirmAccountingTaxTreatment` 已切到 canonical public route。
  - `replaceAccountingTaxTreatment` 已作为独立 public capability 落地，不再折叠进 `confirmAccountingTaxTreatment`。
  - shared contract、Nest DTO、controller/service、OpenAPI、shared generated client、unit test、HTTP E2E、inventory、tracker 与 progress 已同步回写。
- Validation Notes:
  - `shared-api-client:check` 通过，确认 generated client 与 OpenAPI 无漂移。
  - `nx show project api-contracts` 已核实 `libs/api/contracts` 当前为 lint-only library，无 `build` target，因此不把 `api-contracts:build` 记为失败项。
