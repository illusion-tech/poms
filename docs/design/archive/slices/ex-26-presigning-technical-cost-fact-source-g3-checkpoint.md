# EX-26 签约前技术与成本事实源 G3 Checkpoint

日期：2026-04-24

## Slice

* Slice：`EX-26`
* 类型：`api / command + query + persistence`
* 当前结论：`G3 Pass`，但未进入 `G4`；按当前会话约定，代码将与后续前端工作一起提交。
* 下游：`FE-10` 技术确认与前期成本估算工作区。

## Formal Inputs

* `docs/design/archive/slices/ex-26-presigning-technical-cost-fact-source-baseline.md`
* `docs/design/api-route-canonical-inventory.md`
* `docs/design/phase2-development-execution-tracker.md`
* `docs/design/poms-design-progress.md`

## Delivered Boundary

* 新增签约前技术与成本版本包事实源：
  * `ProjectTechnicalCostPackage`
  * `ProjectTechnicalScopeItem`
  * `ProjectTechnicalRiskItem`
  * `ProjectTechnicalCostItem`
* 新增 public routes：
  * `POST /projects/{projectId}/technical-cost-packages`
  * `GET /projects/{projectId}/technical-cost-packages`
  * `GET /projects/{projectId}/technical-cost-workspace`
* 新增 shared contracts、Nest DTO、OpenAPI、generated client。
* 新增 query projection，缺包时返回 actionable empty state，已有当前包时返回 scope / risk / cost 明细、阻断原因、下一步和权限动作。
* 新增 migration `Migration20260424170000_ex26_project_technical_cost_package`。

## Out Of Scope

* 多币种 / 汇率换算：见 `EX26-E1-SINGLE-CURRENCY-FIRST-SLICE`。
* 正式 rollback request / reopen record：见 `EX26-E2-ROLLBACK-REQUEST-OUT-OF-SCOPE`。
* `FE-10` 页面实现：等待本后端事实源进入可提交状态后继续。

## Drift Review

* `new-real-drift`：首次 `migration-check` 在本地 migration-up 后仍发现 drift，原因是手写迁移遗漏三个 child table 的 `id` / `package_id` column comments。
* Remediation：已补齐 migration 文件中的 column comments，并用 `schema:update --run --safe` 对齐本地数据库；随后 `migration-check` 通过。
* OpenAPI / generated client：无残留 drift，`shared-api-client:check` 通过。

## Validation

* `git diff --check`：通过。
* `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project.service.spec.ts`：通过。
* `corepack pnpm nx test poms-api --runInBand --testPathPatterns=project-query.service.spec.ts`：通过。
* `corepack pnpm nx lint poms-api`：通过。
* `corepack pnpm nx build poms-api`：通过。
* `corepack pnpm nx run shared-api-client:generate`：通过。
* `corepack pnpm nx run shared-api-client:check`：通过。
* `corepack pnpm nx build poms-admin`：通过。
* `corepack pnpm nx run poms-api:migration-up`：通过，应用 `Migration20260424170000_ex26_project_technical_cost_package`。
* `corepack pnpm nx run poms-api:migration-check`：通过。

## G4 Gate

`EX-26` 尚未 G4。进入 G4 需要：

* 本批后端与 generated client 改动被纳入同一次提交。
* tracker 从 `Review` 更新为 `Done / G4`。
* 明确 `FE-10` 可以从 `Blocked` 进入实现。
