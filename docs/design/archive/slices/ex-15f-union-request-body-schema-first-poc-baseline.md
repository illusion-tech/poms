# EX-15F Union Request Body Schema-First PoC 实施基线包

- Gate Status: `Pass`
- Parent: `EX-15`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-16`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-15F`

## 1. 范围

- 本次目标:
  - 起草 `ADR-016`，正式定义 union request body 的 schema-first 建模方向与接受门槛。
  - 以 `EX-15E2B` 的 `CreateProjectActualCostRecordRequest` 为真实切口，验证当前工具链能否承载真实 union contract。
  - 基于实测结果决定 `ADR-016` 是否进入 `Accepted`，并回写相关设计文档。
- 本次明确不做:
  - 不改变 `ADR-015` 的 route grammar 结论。
  - 不改 `EX-15E2B` 的 route / identity / persistence 设计。
  - 不在本轮处理 `EX-15E2C` 与其他未进入 union body 验证的 slice。
- 下游可依赖的交付边界:
  - 若 PoC 通过，后续 union request body 可按 schema-first + `oneOf + discriminator` 继续实施。
  - 若 PoC 不通过，必须明确记录失败点与阻断工具链，不得继续口头假设“未来可行”。
- 不允许下游依赖的留白:
  - 不得把 `EX-15E2B` 当前 workaround 直接上升为长期仓库标准。
  - 不得只以 Nest runtime 通过就判定方案可接受；必须同时看 OpenAPI / generated client。

## 2. 正式输入

| Input Type           | Document / Source                                                        | Section / Anchor                              | Status    | Notes                                                                                                    |
| -------------------- | ------------------------------------------------------------------------ | --------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| DTO / OpenAPI design | `docs/design/interface-openapi-dto-design.md`                            | `ProjectActualCostRecord` 相关条目            | Corrected | 当前已记录 workaround 事实，本轮需要裁决是否升级为正式 schema-first 规则                                 |
| Baseline package     | `docs/design/ex-15e2b-project-actual-cost-register-route-baseline.md`    | §4.2, §5                                      | Accepted  | `CreateProjectActualCostRecordRequest` 的正式业务 contract已冻结为 `costType` 驱动的 discriminated union |
| ADR                  | `docs/adr/015-api-route-canonical-grammar.md`                            | §4.1, §4.3                                    | Accepted  | route grammar 不在本片变更                                                                               |
| ADR                  | `docs/adr/016-union-request-body-schema-first-modeling.md`               | 全文                                          | Accepted  | 本片已基于真实 PoC 关闭接受门槛                                                                          |
| Runtime fact         | `libs/shared/contracts/src/lib/shared-contracts.ts`                      | `CreateProjectActualCostRecordRequestSchema`  | Fact      | 当前为大对象 + `superRefine` workaround                                                                  |
| Runtime fact         | `apps/poms-api/src/app/features/project-cost/project-cost.controller.ts` | `createProjectActualCostRecord`               | Fact      | 当前 body 仍使用 `createZodDto` 产物                                                                     |
| Runtime fact         | `apps/poms-api/src/app/features/project-cost/project-cost.service.ts`    | `createProjectActualCostRecord`               | Fact      | 当前 service 仍按 `costType` 二次 parse                                                                  |
| Tooling fact         | `openapi-generator-cli config-help -g typescript-angular`                | `taggedUnions`, `legacyDiscriminatorBehavior` | Fact      | 当前 generator 已暴露 discriminator / tagged union 相关能力                                              |

## 3. 本次 SSOT

| Concern                   | SSOT                                  | Implementation Rule                                                                                |
| ------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Business semantics        | `EX-15E2B` baseline                   | `CreateProjectActualCostRecordRequest` 正式语义仍是 `costType` 判别的 union，不因 PoC 发生业务变化 |
| Route / command naming    | `ADR-015` + `EX-15E2B`                | route 保持不变，只验证 body contract realization                                                   |
| DTO / contract naming     | `ADR-016` + shared contract           | union body 的 canonical contract 直接由 union schema 表达                                          |
| Runtime validation        | controller-bound union schema         | 使用显式 schema pipe，而不是依赖“大对象 DTO class + service 二次 parse”                            |
| OpenAPI expression        | OpenAPI `oneOf + discriminator`       | 只接受真实 union 表达；不接受继续输出字段大并集 object                                             |
| Generated client contract | `typescript-angular` generated output | 生成结果必须能表达 variant 边界，至少不能退回当前大对象 contract                                   |
| Persistence boundary      | `EX-15E2B` 当前实现                   | 本片不触及 migration / entity / repository                                                         |

## 4. 命令与接口边界

| Route / Controller                               | Command / Service                                  | Request DTO / Contract                       | Response DTO / Contract | Guard / Permission        | Design Source          | Result   |
| ------------------------------------------------ | -------------------------------------------------- | -------------------------------------------- | ----------------------- | ------------------------- | ---------------------- | -------- |
| `POST /projects/{projectId}/actual-cost-records` | `ProjectCostService.createProjectActualCostRecord` | `CreateProjectActualCostRecordRequest` union | `CommandResult`         | `contract:finance:manage` | `EX-15E2B` + `ADR-016` | 本轮验证 |
| `POST /project-actual-cost-records/{id}:replace` | `ProjectCostService.replaceLaborCostRecord`        | `ReplaceLaborCostRecordRequest`              | `CommandResult`         | `contract:finance:manage` | `EX-15E2B`             | 不改     |

## 5. 读侧边界

| Query / View | Consumer | Fields | Filter / Sort | Permission Boundary | Design Source | Result   |
| ------------ | -------- | ------ | ------------- | ------------------- | ------------- | -------- |
| `N/A`        | `N/A`    | `N/A`  | `N/A`         | `N/A`               | `N/A`         | 本片不改 |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| `N/A` | `N/A`     | `N/A`               | `N/A`               | 本片不改     |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result   |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------- |
| `N/A` | `N/A`                 | `N/A`           | `N/A`  | `N/A`                     | 本片不改 |

## 7. 一致性结论

- Document -> code: `EX-15F` 已关闭“正式 union contract，代码与 OpenAPI 仍为大对象 workaround”的一致性缺口。
- Migration -> entity: `N/A`
- Entity -> contract: `N/A`
- Route -> command: route 已稳定，不在本片变更。
- Query -> view: `N/A`
- Guard / permission: 不改权限语义。
- OpenAPI / generated client: 已验证为正式 `oneOf + discriminator` 与 generated union type。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                                         | Result | Gap / Reason                       |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ---------------------------------- |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                                                                          | Pass   | `poms-api` build 通过              |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`                                                                                               | Pass   | 32 suites / 333 tests              |
| API / integration tests          | No       | `N/A`                                                                                                                                      | N/A    | 已由单测 / e2e 覆盖                |
| E2E                              | Yes      | `corepack pnpm nx e2e poms-api-e2e --runInBand`                                                                                            | Pass   | 10 suites / 59 tests               |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run poms-api:openapi`、`corepack pnpm nx run shared-api-client:generate`、`corepack pnpm nx run shared-api-client:check` | Pass   | OpenAPI 与 generated client 已对齐 |
| Migration / schema check         | No       | `N/A`                                                                                                                                      | N/A    | 本片不改 persistence               |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| `N/A`        | `N/A` | `N/A` | `N/A`       | `N/A`         | `N/A`       | 当前无例外 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-16`
- Conditions:
  - 必须以 `EX-15E2B` 真实链路作为 PoC，而不是只做玩具级 dummy object。
  - 若 generated client 仍退化为大对象 contract，则 `ADR-016` 不得进入 `Accepted`。
