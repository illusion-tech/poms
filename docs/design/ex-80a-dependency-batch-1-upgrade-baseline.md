# EX-80A 第一批次业务依赖维护升级实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（依赖维护，无产品代码变更意图）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#42`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-80A`

## 1. 范围

- 本次目标:
  - 在既有 semver 范围内升级 `pnpm outdated`（2026-09-11）中的同主版本依赖。原计划 24 项（33 个包名）；实施中 3 项因升级伴生行为变化被精确 pin 回退并移交独立 issue 治理（见第 9 节例外），实际交付 21 项 + NestJS 11 线内对齐：
    - 运行时: `axios` 1.15.0→1.20.0、`chartjs-chart-matrix` 3.0.0→3.0.8、`@nestjs/{common,core,platform-express}` 11.1.19→11.2.3（peer 重解析导致家族错位后的显式对齐，见第 7 节）。
    - 工具链: `jest{,-environment-jsdom,-environment-node,-util}` 30.3.0→30.5.1、`ts-jest` 29.4.12、`eslint` 10.10.0、`@typescript-eslint/utils` 8.70.0、`jsonc-eslint-parser` 3.3.0、`eslint-plugin-prettier` 5.5.6、`prettier` 3.8.5（^3.8 范围内取尽）、`@biomejs/biome` 2.5.12、`@playwright/test` 1.63.0、`@openapitools/openapi-generator-cli` 2.41.0、`@swc/core` 1.15.47（^1.15 范围内取尽）、`@swc/helpers` 0.5.23、`@types/node` 25.9.6、`tailwindcss`+`@tailwindcss/postcss` 4.3.3、`postcss` 8.5.28、`autoprefixer` 10.5.5、`webpack-cli` 7.2.3、`@angular-devkit/build-angular` 21.2.23。
  - 精确 pin 回退项（保护性 pin，防误升）: `zod` `4.3.6`、`nestjs-zod` `5.3.0`（GOV-13 / issue #43）、`@mikro-orm/{core,migrations,postgresql,seeder,cli}` `7.0.11`、`@mikro-orm/nestjs` `7.0.1`（GOV-14 / issue #44）。
  - 验证行为等价：lint / build / test 双应用矩阵、`migration-check`、OpenAPI 重新生成 + `shared-api-client:check`。
- 本次明确不做:
  - 不升级 Angular 22 / NestJS 12 / PrimeNG 22 / @primeuix/themes 3 / nx 23 / TypeScript 7 / jest-preset-angular 17 / angular-eslint 22 / eslint-plugin-boundaries 7 等任何跨大版本项。
  - 不解除 `zod` / `nestjs-zod` / `@mikro-orm/*` 的保护性 pin（归 GOV-13 / GOV-14）。
  - 不修改产品代码逻辑、API 契约语义、migration SQL、权限或 UI 行为。
  - 不部署测试环境。
- 本次明确不做:
  - 不升级 Angular 22 / NestJS 12 / PrimeNG 22 / @primeuix/themes 3 / nx 23 / TypeScript 7 / jest-preset-angular 17 / angular-eslint 22 / eslint-plugin-boundaries 7 等任何跨大版本项。
  - 不修改产品代码逻辑、API 契约语义、migration SQL、权限或 UI 行为。
  - 不部署测试环境。
- 下游可依赖的交付边界:
  - 交付的 21 项依赖在 `pnpm outdated` 中清零（prettier/@swc 系为范围内取尽）；`zod`/`nestjs-zod`/`@mikro-orm/*` 以精确 pin 冻结在原版本，防止在 GOV-13/GOV-14 决策前被误升。
  - `poms-api` / `poms-admin` lint、build、test 在新依赖版本下通过。
- 不允许下游依赖的留白:
  - 不承诺大版本升级的前置兼容性结论。
  - 不承诺 E2E 全量回归（本片无产品行为变更意图，按测试分层评估执行）。

## 2. 正式输入

| Input Type                     | Document / Source                      | Section / Anchor         | Status | Notes                                                                    |
| ------------------------------ | -------------------------------------- | ------------------------ | ------ | ------------------------------------------------------------------------ |
| Business design                | GitHub issue `#42`                     | G0 边界 / 验收清单       | Pass   | 第一批次范围与验收冻结。                                                 |
| 依赖现状                       | `corepack pnpm outdated`（2026-09-11） | 全量 71 项清单           | Pass   | 第一批次 = 同主版本 24 项；其余归后续切片。                              |
| 前置工具链                     | `EX-79A`（issue `#40`、PR `#41`）      | pnpm 12.3.4 + nx 22.7.12 | Pass   | 本片在其上执行。                                                         |
| 各包 CHANGELOG / release notes | npm registry                           | 版本间变更               | Pass   | 同主版本内变更；mikro-orm 7.2 与 openapi-generator 2.4x 为重点关注对象。 |
| Command design                 | N/A                                    | N/A                      | N/A    | 不新增写命令。                                                           |
| DTO / OpenAPI                  | 既有 OpenAPI 产物                      | —                        | Pass   | 契约语义不变；仅允许生成器输出格式差异。                                 |
| Route inventory                | N/A                                    | N/A                      | N/A    | 不触及 public route surface。                                            |

## 3. 本次 SSOT

| Concern                     | SSOT                            | Implementation Rule                                    |
| --------------------------- | ------------------------------- | ------------------------------------------------------ |
| Business semantics          | 既有产品行为                    | 依赖升级不得改变任何业务行为。                         |
| Public route canonical path | N/A                             | 不触及 public route。                                  |
| 依赖版本意图                | package.json 既有 semver 范围   | 只在范围内取最新，不改 specifier。                     |
| OpenAPI 契约语义            | 既有 OpenAPI / generated client | 重新生成后 diff 必须无语义变化；纯格式差异须显式归类。 |
| Schema 一致性               | `migration-check` 目标          | mikro-orm 升级不得引入新增 drift。                     |

## 4. 命令与接口边界

N/A——不触及任何 route、command、DTO、guard。

## 5. 读侧边界

N/A——不触及任何 query / view。

## 6. 持久化边界

N/A——不新增 migration、entity、DDL；mikro-orm 仅作为库版本升级，须过 `migration-check`。

## 7. 一致性结论

- Document -> code: N/A，无产品代码变更。
- ADR-015 inventory -> route: N/A。
- Migration -> entity: 以 `migration-check` 结果为准；失败项必须分类为既有基线 drift 或新增 drift。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: N/A。
- OpenAPI / generated client: 重新生成后与既有产物 diff；语义差异 = 阻断，格式差异 = 记录后放行。实际结果：generator 2.41.0 输出零 diff。
- NestJS 家族对齐: pnpm 重解析 peer 时出现 `@nestjs/core@11.2.1` 与 `@nestjs/common@11.1.x` 错位（core 11.2 require common 11.2 的 `sse-signal.decorator`），显式将 `@nestjs/{common,core,platform-express}` 对齐到 11.2.3 解决；同主版本 11 线内对齐，swagger 11.3.0 peer 兼容。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                       | Result                     | Gap / Reason                                                                                                                                  |
| -------------------------------- | -------- | ---------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint                             | 是       | `corepack pnpm nx lint poms-api` / `poms-admin`                                          | 通过                       | —                                                                                                                                             |
| Build                            | 是       | `corepack pnpm nx build poms-api` / `poms-admin`                                         | 通过                       | —                                                                                                                                             |
| Unit tests                       | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                                          | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言 `project-detail.spec.ts:955`（EX-79A 已记录）；API 侧 jest 30.5 有非致命 worker teardown 警告，不影响结果。 |
| OpenAPI generation / client diff | 是       | `corepack pnpm nx run poms-api:openapi` + `corepack pnpm nx run shared-api-client:check` | 通过，生成产物零 diff      | generator 2.31.1→2.41.0 输出与既有产物完全一致。                                                                                              |
| Migration / schema check         | 是       | `corepack pnpm nx run poms-api:migration-check`                                          | 通过                       | 在 `@mikro-orm/*` pin 回 7.0.x 后通过；7.2 的 `new-real-drift` 见第 9 节 EX80A-E2 / GOV-14。                                                  |
| E2E                              | 否       | —                                                                                        | not required               | 无产品行为变更；单测矩阵全绿 + 生成产物零 diff；@playwright/test 仅升包未改用例。                                                             |
| Markdown format                  | 是       | `corepack pnpm run format:md:check`                                                      | 通过                       | 本片 docs 变更。                                                                                                                              |

## 9. 例外与风险

| Exception ID | Level  | Scope                                                                                                       | Approved By          | Cleanup Owner       | Cleanup Due | Notes                                                                                                                                                                    |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------- | -------------------- | ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EX80A-E1     | medium | `zod` 精确 pin `4.3.6`、`nestjs-zod` 精确 pin `5.3.0`                                                       | 用户（会话指令授权） | GOV-13（issue #43） | 待排期      | zod 4.6 的 JSON Schema 转换变化 + nestjs-zod 5.4+ `cleanupOpenApiDoc` 校验阻断 `poms-api:openapi`（AuditLogList 重复注册 / Query 非 object）；解除 pin 前须先修 GOV-13。 |
| EX80A-E2     | medium | `@mikro-orm/{core,migrations,postgresql,seeder,cli}` pin `7.0.11`、`@mikro-orm/nestjs` pin `7.0.1`          | 用户（会话指令授权） | GOV-14（issue #44） | 待排期      | 7.2 生成器新增列 comment 与排他约束重述，migration-check 失败（对照 2026-07-21 EX-77B 通过，判定 `new-real-drift`）；是否以一次性对齐 migration 接受归 GOV-14 决策。     |
| 备注         | —      | pnpm 12 `update` 刷新了 caret 范围下限（如 `^7.2.0`→回退后 `^7.0.11` 由 pin 覆盖；`^11.2.3`、`^1.20.0` 等） | —                    | —                   | —           | 范围语义（caret、同主版本）未变，非例外；如实记录。                                                                                                                      |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-11
- Conditions: 若 OpenAPI 重新生成出现语义差异或 migration-check 出现新增 drift，立即停止并升级为 corrective checkpoint，不得强行提交。
