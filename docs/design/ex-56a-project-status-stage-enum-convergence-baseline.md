# EX-56A Project Status / Stage Enum Convergence 实施基线包

- Gate Status: `Pass`
- Parent: `EX-56`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-01`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-56A`

## 1. 范围

- 本次目标:
  - 将项目主状态 `ProjectStatus` 与项目主阶段 `ProjectStage` 收敛为 `shared-contracts` 单一事实源。
  - 为 `ProjectStatus` / `ProjectStage` 增加 schema 与 value object，替代项目域运行时代码中的关键裸字符串判断。
  - 将项目主对象相关 view schema 的 `status` / `currentStage` 从 `z.string()` 改为显式枚举 schema，使 OpenAPI 与 generated client 生成 enum。
  - 为 `poms.project.status` / `poms.project.current_stage` 补齐 DB check constraint，并让 entity 类型与 DB check 对齐。
  - 在迁移内将旧项目阶段 `lead/opportunity/proposal/negotiation` 和旧项目关闭状态命名归一化到新状态机，再添加 check constraint。
  - 更新项目状态 / 阶段展示的类型边界，移除不属于当前项目主状态机的历史展示码。 
- 本次明确不做:
  - 不新增、删除或改名 public API route。
  - 不治理客户、线索、附件、销售跟进、审批、待办、财务、提成或成本域的非项目主状态枚举。
  - 不引入 PostgreSQL enum type，继续使用 `varchar + check constraint`。
  - 不改变项目生命周期业务流转规则或新增状态迁移命令。
  - 不处理 demo / template UI-only 字符串。
- 下游可依赖的交付边界:
  - 后端项目主对象的 `status` / `currentStage` 有 typed contract、typed entity 与 DB check。
  - 项目主状态 / 阶段在 generated client 中不再是宽泛 `string`。
  - Admin 项目主状态 / 阶段展示仅接受当前项目主状态机定义内的值，未知值仍通过 fallback 函数兜底。
- 不允许下游依赖的留白:
  - 不代表所有 `status` / `stage` 字段已治理完毕；后续由 `EX-56B`、`EX-56C`、`EX-56D`、`FE-52`、`EX-57` 分片处理。
  - 不代表报价、合同、验收、归档、提成、成本等子域状态可以复用 `ProjectStatus`。

## 2. 正式输入

| Input Type                | Document / Source                                                      | Section / Anchor              | Status | Notes                                                                                  |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Business design           | `docs/design/ex-56-domain-enum-literal-governance-baseline.md`         | Downstream slicing / EX-56A   | Active | 冻结项目状态 / 阶段是最高优先级枚举治理域。                                            |
| Command design            | `apps/poms-api/src/app/features/project/project.service.ts`            | project lifecycle operations  | Active | 本片仅替换状态 / 阶段值表达，不新增命令。                                              |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`                    | Project section               | Active | 当前已有 `PROJECT_STAGES` / `PROJECT_STATUSES`，但多处 view schema 仍为 `z.string()`。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                         | existing project routes       | N/A    | 不新增、删除或改名 route surface；仅响应 schema enum 收紧。                            |
| Query boundary            | `apps/poms-api/src/app/features/project/project-query.service.ts`      | list/detail/workspace views   | Active | 查询返回项目主状态 / 阶段字段需要与 shared contract 类型对齐。                         |
| Data model / table freeze | `apps/poms-api/src/app/features/project/project.entity.ts`             | `Project.status/currentStage` | Active | 需要 `$type<ProjectStatus>` / `$type<ProjectStage>` 与 check constraint 对齐。         |
| Schema / DDL              | `apps/poms-api/src/migrations/Migration20260322193000_init_project.ts` | `poms.project`                | Active | 初始表未带 check constraint，本片新增前滚迁移补齐。                                    |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                          | route grammar                 | Active | route surface 不变。                                                                   |

## 3. 本次 SSOT

| Concern                     | SSOT                                         | Implementation Rule                                                |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| Business semantics          | `PROJECT_STATUSES` / `PROJECT_STAGES`        | 业务状态和阶段值只能从 shared constants / value object 取值。      |
| Public route canonical path | `api-route-canonical-inventory.md`           | 本片不改 route。                                                   |
| Route / command naming      | Existing project controller / service        | 不新增命令，现有命名保持。                                         |
| DTO / contract naming       | `ProjectStatusSchema` / `ProjectStageSchema` | Project main view schema 使用枚举 schema，不使用裸 `z.string()`。  |
| Table / column naming       | Existing `poms.project.status/current_stage` | 不改列名，仅补 check。                                             |
| Date / time semantics       | Existing project schemas                     | 本片不改变时间字段。                                               |
| Identifier semantics        | Existing project UUID / projectNo semantics  | 本片不改变标识符。                                                 |
| Money / decimal semantics   | N/A                                          | 不触及金额字段。                                                   |
| Status machine              | `ProjectStatusValue` / `ProjectStageValue`   | 运行时代码使用 value object 和 typed readonly array 表达判断集合。 |

## 4. 命令与接口边界

| Route / Controller                            | Command / Service                                 | Request DTO / Contract       | Response DTO / Contract                                                                                                           | Guard / Permission | Design Source  | Result                    |
| --------------------------------------------- | ------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------- | ------------------------- |
| `GET /projects`                               | `ProjectQueryService.listProjects`                | `ProjectListQuerySchema`     | `ProjectListViewSchema`                                                                                                           | `project:read`     | existing route | route unchanged, enum DTO |
| `GET /projects/:id`                           | `ProjectQueryService.getProjectDetail`            | N/A                          | `ProjectDetailViewSchema` / `ProjectDetailStageSummarySchema`                                                                     | `project:read`     | existing route | route unchanged, enum DTO |
| `GET /projects/:projectId/workspace-guidance` | `ProjectQueryService.getProjectWorkspaceGuidance` | N/A                          | `ProjectWorkspaceGuidanceViewSchema`                                                                                              | `project:read`     | existing route | route unchanged, enum DTO |
| `GET /projects/:projectId/timeline`           | `ProjectQueryService.getProjectTimeline`          | N/A                          | `ProjectTimelineEventSchema.stage`                                                                                                | `project:read`     | existing route | route unchanged, enum DTO |
| `POST /projects`                              | `ProjectService.createAndSave`                    | `CreateProjectRequestSchema` | `ProjectSummarySchema`                                                                                                            | `project:write`    | existing route | route unchanged, enum DTO |
| existing presigning workspace routes          | `ProjectQueryService.get*Workspace`               | N/A                          | `ProjectTechnicalCostWorkspaceViewSchema` / `ProjectBidCommercialWorkspaceViewSchema` / `ProjectPricingMarginWorkspaceViewSchema` | `project:read`     | existing route | route unchanged, enum DTO |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing project routes only.
- Current implemented route(s): existing project routes only.
- Inventory status: `aligned`
- Route governance source: `ADR-015`
- Blocker / exception: N/A; no route surface change.

## 5. 读侧边界

| Query / View                                      | Consumer                       | Fields                                   | Filter / Sort                          | Permission Boundary | Design Source    | Result                  |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------- | -------------------------------------- | ------------------- | ---------------- | ----------------------- |
| `ProjectQueryService.listProjects`                | Admin project list             | `status`, `currentStage`                 | `ProjectListQuery.status/currentStage` | `project:read`      | shared contracts | typed enum query/result |
| `ProjectQueryService.getProjectDetail`            | Admin detail / workspace shell | `status`, `currentStage`, `stageSummary` | N/A                                    | `project:read`      | shared contracts | typed enum result       |
| `ProjectQueryService.getProjectWorkspaceGuidance` | Admin workspace                | `status`, `currentStage`                 | N/A                                    | `project:read`      | shared contracts | typed enum result       |
| presigning workspace queries                      | Admin workspace                | `status`, `currentStage`                 | N/A                                    | `project:read`      | shared contracts | typed enum result       |
| `ProjectTimelineView`                             | Admin lifecycle timeline       | `stage`                                  | N/A                                    | `project:read`      | shared contracts | typed enum stage        |

## 6. 持久化边界

| Table          | Migration                                                       | Entity / Repository                       | DDL / Freeze Source       | Check Result                                           |
| -------------- | --------------------------------------------------------------- | ----------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `poms.project` | new `Migration20260501110000_ex56a_project_status_stage_checks` | `Project.status` / `Project.currentStage` | `PROJECT_STATUSES/STAGES` | add `chk_project_status` / `chk_project_current_stage` |

| Field           | Design Type / Meaning | Migration / DDL                                                                                                                                               | Entity                   | Shared Contract / OpenAPI | Result |
| --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------- | ------ |
| `status`        | `ProjectStatus`       | `varchar(32)` + check in `active,pending-approval,blocked,on-hold,completed,closed`                                                                           | `$type<ProjectStatus>()` | `ProjectStatusSchema`     | align  |
| `current_stage` | `ProjectStage`        | `varchar(64)` + check in `assessment,scope-confirmation,commercial-closure,contracting,handover,execution,acceptance,completed,closed-lost,closed-terminated` | `$type<ProjectStage>()`  | `ProjectStageSchema`      | align  |

## 7. 一致性结论

- Document -> code: `EX-56` 要求项目状态 / 阶段先治理；本片范围与 tracker 一致。
- ADR-015 inventory -> route: 不变更 route，未发现 route governance blocker。
- Migration -> entity: 需要新增 check migration 并同步 entity `checks`。
- Entity -> contract: 需要 entity `$type` 与 shared schema 对齐。
- Route -> command: 命令不变，仅参数 / 返回 DTO 的 enum 表达收紧。
- Query -> view: list/detail/workspace/timeline 的项目主状态 / 阶段必须使用 shared enum schema。
- Guard / permission: 不改变权限。
- OpenAPI / generated client: 需要运行 `poms-api:openapi` 与 `shared-api-client:check`，确认 generated client 中项目主状态 / 阶段不再是宽泛 `string`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                                                    | Result | Gap / Reason                                                                                                                |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`                                                       | Pass   |                                                                                                                             |
| Build                            | Yes      | `corepack pnpm nx build shared-contracts`; `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`                                                     | Pass   | Admin build emitted existing-style warning: initial bundle `1.01 MB` exceeds warning budget by `12.58 kB`; build succeeded. |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`                                                                          | Pass   | API: 46 suites / 561 tests. Admin: 28 suites / 161 tests.                                                                   |
| Focused tests                    | Yes      | `corepack pnpm nx test poms-api --runInBand --runTestsByPath src/app/features/project/project.service.spec.ts src/app/features/project/project-query.service.spec.ts` | Pass   | API focused: 2 suites / 60 tests.                                                                                           |
| API / integration tests          | Optional | No route surface change; full API unit/service suite covered project query/service behavior                                                                           | N/A    |                                                                                                                             |
| E2E                              | No       | Not required; no route or browser workflow change                                                                                                                     | N/A    |                                                                                                                             |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                                                                     | Pass   | OpenAPI generator still reports existing `propertyNames` validation warnings; classified as tool noise.                     |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`                                                                         | Pass   | Dev DB had one legacy `current_stage = 'lead'`; migration normalized it to `assessment` before adding check constraints.    |
| Markdown                         | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                                                                                                    | Pass   | docs touched                                                                                                                |
| Whitespace                       | Yes      | `git diff --check`                                                                                                                                                    | Pass   |                                                                                                                             |

## 9. 例外与风险

| Exception ID                | Level | Scope                                               | Approved By | Cleanup Owner                   | Cleanup Due  | Notes                                                                                                       |
| --------------------------- | ----- | --------------------------------------------------- | ----------- | ------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `EX56A-E1-SUBDOMAIN-STATUS` | Low   | Project-adjacent subdomain statuses remain separate | Codex       | `EX-56D` / later project slices | Future slice | Bid, technical-cost, pricing, acceptance, archive, finance and commission statuses are not `ProjectStatus`. |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-01`
- Conditions:
  - Implementation must not introduce new route surface.
  - Runtime comparisons for project main status / stage should use `ProjectStatusValue` / `ProjectStageValue`.
  - Generated client changes must be produced by OpenAPI generation, not hand-edited.

## 11. G3 本地检查结论

- Gate Status: `Pass`
- Checked By: `Codex`
- Checked At: `2026-05-01`
- Drift classification:
  - `new-real-drift`: local dev DB contained one historical project `current_stage = 'lead'`; fixed in the EX-56A migration by deterministic normalization to `assessment`, then `migration-check` passed.
  - `tool-noise`: an intermediate `shared-api-client:check` failed after Prettier touched generated files; regenerated the client and the check passed.
  - `tool-noise`: OpenAPI generator continues to warn about `CreateCommissionRuleVersionRequest.propertyNames` and `AuditSnapshot.propertyNames`; no EX-56A semantic drift.
- G4 / Done decision:
  - Code is locally validated and can be committed.
  - Tracker must remain `Doing / G3` until the user creates the commit.
