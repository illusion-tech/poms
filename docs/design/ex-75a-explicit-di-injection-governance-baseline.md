# EX-75A 统一后端显式 DI 注入策略实施基线包

- Gate Status: `Pass`
- Parent: GitHub issue `#26`
- Owner: `Codex`
- Slice Type: `refactor-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-07-01`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-75A`

## 1. 范围

- 本次目标:
  - 统一 `apps/poms-api/src` 中 Nest 管理对象的构造器依赖注入表达。
  - 对运行时依赖 DI token 的 class provider 依赖显式使用 `@Inject(Token)`。
  - 保持现有 provider token、模块注册、测试替身和业务行为不变。
- 本次明确不做:
  - 不改变 public route、DTO、OpenAPI、generated client、数据库结构、权限 key 或业务语义。
  - 不引入新的 DI 容器抽象、自动扫描工具或模块拆分。
  - 不把非 Nest 管理的普通类构造函数、错误类、DTO / value object 构造函数纳入本片。
- 下游可依赖的交付边界:
  - 后端 controller / service / repository / adapter / registry / guard 等 Nest 管理对象在构造器注入普通 class provider 时具备显式 token。
  - 后续 review 可把“缺少显式 `@Inject(...)`”视为后端 DI 风格漂移。
- 不允许下游依赖的留白:
  - 本片不提供 lint 自动化门禁；如后续需要，可另开治理切片。
  - 本片不保证第三方 Nest 扩展内部 provider 的实现策略，只保证 POMS 代码侧 token 表达明确。

## 2. 正式输入

| Input Type                | Document / Source                                            | Section / Anchor       | Status | Notes                                         |
| ------------------------- | ------------------------------------------------------------ | ---------------------- | ------ | --------------------------------------------- |
| Business design           | GitHub issue `#26`                                           | 背景 / 目标 / 验收标准 | Active | 用户确认希望全后端统一显式注入。              |
| Command design            | N/A                                                          | N/A                    | N/A    | 本片不新增 command。                          |
| DTO / OpenAPI design      | N/A                                                          | N/A                    | N/A    | 本片不改 public API 契约。                    |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`               | N/A                    | N/A    | 本片不新增、修改或删除 public route surface。 |
| Query boundary            | N/A                                                          | N/A                    | N/A    | 本片不改读模型。                              |
| Data model / table freeze | N/A                                                          | N/A                    | N/A    | 本片不改 persistence。                        |
| Schema / DDL              | N/A                                                          | N/A                    | N/A    | 本片不新增 migration。                        |
| ADR                       | `docs/reference/implementation-baseline-package-template.md` | 实施基线包规则         | Active | 使用标准 G1 baseline 结构。                   |

## 3. 本次 SSOT

| Concern                     | SSOT               | Implementation Rule                                                         |
| --------------------------- | ------------------ | --------------------------------------------------------------------------- |
| Business semantics          | Existing runtime   | 不改变任何业务分支、错误语义、权限语义或数据写入。                          |
| Public route canonical path | N/A                | 不触及 public route surface。                                               |
| Route / command naming      | N/A                | 不新增或重命名 route / command。                                            |
| DTO / contract naming       | N/A                | 不改 shared contracts / OpenAPI / generated client。                        |
| Table / column naming       | N/A                | 不改 migration / entity field。                                             |
| Date / time semantics       | N/A                | 不改时间字段语义。                                                          |
| Identifier semantics        | N/A                | 不改 ID 类型或来源。                                                        |
| Money / decimal semantics   | N/A                | 不改金额字段。                                                              |
| Status machine              | N/A                | 不改状态机。                                                                |
| DI token semantics          | GitHub issue `#26` | Nest 管理对象的构造器 class provider 依赖必须显式 `@Inject(RuntimeToken)`。 |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result                     |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | -------------------------- |
| Existing only      | Existing only     | Unchanged              | Unchanged               | Unchanged          | GitHub `#26`  | 本片只调整构造器注入表达。 |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: N/A
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View  | Consumer           | Fields    | Filter / Sort | Permission Boundary | Design Source | Result                |
| ------------- | ------------------ | --------- | ------------- | ------------------- | ------------- | --------------------- |
| Existing only | Existing consumers | Unchanged | Unchanged     | Unchanged           | GitHub `#26`  | 本片不改 query 行为。 |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result      |
| ----- | --------- | ------------------- | ------------------- | ----------------- |
| N/A   | N/A       | Existing only       | N/A                 | 本片不改 schema。 |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result         |
| ----- | --------------------- | --------------- | ------ | ------------------------- | -------------- |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | 本片不改字段。 |

## 7. 一致性结论

- Document -> code: `#26` 要求显式 DI token；本片按该规则扫描并改造后端 Nest 管理对象。
- ADR-015 inventory -> route: N/A，本片不触及 route surface。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: 仅保持现有 guard 注入行为不变。
- OpenAPI / generated client: N/A，预期无语义变化。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                             | Result  | Gap / Reason                              |
| -------------------------------- | -------- | ---------------------------------------------- | ------- | ----------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`               | Pending | 后端 refactor-only 必跑。                 |
| Build                            | Yes      | `corepack pnpm nx build poms-api`              | Pending | 验证 Nest DI metadata / TS 编译。         |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api`               | Pending | 覆盖 existing focused / full API tests。  |
| API / integration tests          | No       | N/A                                            | N/A     | 本片不改 public API 行为。                |
| E2E                              | No       | N/A                                            | N/A     | 无用户路径变化。                          |
| OpenAPI generation / client diff | No       | N/A                                            | N/A     | 本片不改 DTO / controller route surface。 |
| Migration / schema check         | No       | N/A                                            | N/A     | 本片不改 persistence。                    |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check`; `git diff --check` | Pending | 本片新增治理文档。                        |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes        |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 当前无例外。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-07-01`
- Conditions:
  - 仅改造 Nest 管理对象构造器注入表达。
  - 不触及 public API、OpenAPI、generated client、migration 或业务行为。
  - G3 必须给出扫描口径、验证命令和无行为变更结论。
