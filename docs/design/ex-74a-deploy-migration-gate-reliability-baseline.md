# EX-74A 部署迁移 Gate 可靠性收口实施基线包

- Gate Status: `Pass`
- Parent: 测试环境部署与运行治理
- Owner: Codex
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: Wang Zishi
- G1 Date: 2026-06-15
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-74A`

## 1. 范围

- 本次目标:
  - 显式 `POMS_ENV_FILE` 成为 API / MikroORM CLI 环境加载的权威输入，避免被本地 `.env`、Nx 或 CI 预注入变量污染。
  - 将测试环境发布前 migration gate 从 Nx target 改为 repo-owned 直接 MikroORM CLI gate。
  - 在 migration gate 中执行 `pending -> up -> pending -> check`，并在仍有 pending migration 时阻断 release 激活。
  - 让发布后验证可以复用同一 migration gate 的 pending-only 校验。
  - 更新部署文档，明确线上 / 测试迁移不再通过 Nx 包装命令执行。
- 本次明确不做:
  - 不新增、变更或删除 public API route surface。
  - 不新增 migration、entity、OpenAPI、generated client 或 Admin UI。
  - 不改变 PM2 服务器运行时 env 文件格式。
  - 不重构业务 seed 命令；若后续 seed 也需要脱离 Nx，另开切片。
- 下游可依赖的交付边界:
  - `deploy:push-test` 在 release 激活前使用目标 env 文件确认目标库 migration 已经补齐。
  - `deploy:verify-test` 可在发布后确认目标库无 pending migration。
  - 显式 `POMS_ENV_FILE` 加载不会被预先存在的 DB 变量覆盖。
- 不允许下游依赖的留白:
  - 生产环境发布配置尚未在本片新增。
  - 业务表逐项存在性 smoke 不作为本片固定门禁，pending migration 为空是本片数据库一致性的边界。

## 2. 正式输入

| Input Type                | Document / Source                                                   | Section / Anchor | Status    | Notes                                 |
| ------------------------- | ------------------------------------------------------------------- | ---------------- | --------- | ------------------------------------- |
| Business design           | 测试环境 500 事故调查                                               | 当前会话         | Accepted  | 根因是测试库缺少 EX70A / EX72B 迁移。 |
| Command design            | `deploy/scripts/push-release.ts`                                    | migration gate   | To update | 不再经 Nx target 执行迁移。           |
| DTO / OpenAPI design      | N/A                                                                 | N/A              | N/A       | 本片不触碰 HTTP API 契约。            |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                      | N/A              | N/A       | 不新增 / 修改 public route surface。  |
| Query boundary            | N/A                                                                 | N/A              | N/A       | 不改业务查询。                        |
| Data model / table freeze | N/A                                                                 | N/A              | N/A       | 不改 schema。                         |
| Schema / DDL              | MikroORM migrations 当前目录                                        | pending/up/check | Consumed  | 只改 gate 如何验证已存在迁移。        |
| ADR                       | `docs/adr/014-design-execution-state-model-and-governance-gates.md` | G gate model     | Consumed  | 使用 G1/G3 证据收口基础设施纠偏。     |

## 3. 本次 SSOT

| Concern                     | SSOT                    | Implementation Rule                                 |
| --------------------------- | ----------------------- | --------------------------------------------------- |
| Business semantics          | 本基线范围              | 发布前目标库 schema 必须与当前 migration 队列一致。 |
| Public route canonical path | N/A                     | 不触碰 route。                                      |
| Route / command naming      | N/A                     | 不触碰 controller / command。                       |
| DTO / contract naming       | N/A                     | 不触碰 DTO / contract。                             |
| Table / column naming       | N/A                     | 不改 DDL。                                          |
| Date / time semantics       | N/A                     | 不新增日期字段。                                    |
| Identifier semantics        | `POMS_ENV_FILE`         | 显式 env 文件路径是目标环境身份，缺失时不得回退。   |
| Money / decimal semantics   | N/A                     | 不触碰金额。                                        |
| Status machine              | Migration pending state | pending 非空即 gate 失败。                          |

## 4. 命令与接口边界

| Route / Controller | Command / Service             | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source        | Result    |
| ------------------ | ----------------------------- | ---------------------- | ----------------------- | ------------------ | -------------------- | --------- |
| N/A                | deploy migration gate command | N/A                    | CLI exit code / logs    | local env file     | 本基线、部署 runbook | To update |

### 4.1 公共路由补充信息（仅适用于触及 public route surface）

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: N/A
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View          | Consumer            | Fields          | Filter / Sort | Permission Boundary | Design Source | Result    |
| --------------------- | ------------------- | --------------- | ------------- | ------------------- | ------------- | --------- |
| migration pending CLI | deploy verification | migration names | N/A           | local env file      | 本基线        | To update |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | 不改 schema  |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | N/A    |

## 7. 一致性结论

- Document -> code: 部署 runbook / deploy README / scripts README 必须同步迁移命令。
- ADR-015 inventory -> route: N/A，不触碰 public route surface。
- Migration -> entity: N/A，不改 schema / entity。
- Entity -> contract: N/A，不改 contract。
- Route -> command: N/A。
- Query -> view: migration pending 仅作为部署 gate，不进入业务 UI。
- Guard / permission: 本地敏感 env 文件存在性是 gate 前置，不新增平台权限。
- OpenAPI / generated client: N/A。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                              | Result | Gap / Reason                                                              |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                                                                | Pass   | 无新 lint warning。                                                       |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                                                               | Pass   | API build 成功。                                                          |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --testFile=load-env.spec.ts`                                    | Pass   | 实际跑完 poms-api 全量 tests。                                            |
| API / integration tests          | No       | N/A                                                                                             | N/A    | 不改业务 service / controller。                                           |
| E2E                              | Decision | N/A                                                                                             | N/A    | 不改浏览器用户路径；deploy gate dry-run 与真实 schema gate 覆盖发布路径。 |
| OpenAPI generation / client diff | No       | N/A                                                                                             | N/A    | 不改 API 契约。                                                           |
| Migration / schema check         | Yes      | `deno task deploy:schema-gate-test`                                                             | Pass   | 测试库 pending 为空且 schema up-to-date。                                 |
| Deploy script checks             | Yes      | `deno task deploy:check`; `deno task deploy:lint`                                               | Pass   | Deno check / lint 均通过。                                                |
| Deploy verification              | Yes      | `deno task deploy:verify-test`                                                                  | Pass   | HTTP health / route / cache 与 pending-only gate 均通过。                 |
| Dry-run release gate             | Yes      | `deno task deploy:push-test --archive dist/releases/poms-test-20260615-181120.tar.gz --dry-run` | Pass   | 输出已切到直接 MikroORM CLI gate。                                        |
| Markdown / diff sanity           | Yes      | `pnpm run format:md:check`; `git diff --check`                                                  | Pass   | 文档表格与 whitespace 均通过。                                            |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes  |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无例外 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Wang Zishi
- Approved At: 2026-06-15
- Conditions:
  - 不经 Nx 执行测试环境发布迁移。
  - 显式 `POMS_ENV_FILE` 缺失时不得静默回退本地 `.env`。
  - `migration:pending` 非空必须阻断 release 激活。

## 11. G3 / G4 收口

- Gate Status: `Pass`
- Closed At: 2026-06-15
- Scope:
  - API env loader 在显式 `POMS_ENV_FILE` 场景下使用 `dotenv override`，并在显式文件缺失时失败，不再静默回退根 `.env`。
  - `deploy:push-test` 的 migration gate 改为直接 MikroORM CLI，执行 `pending -> up -> pending -> check`。
  - `deploy:verify-test` 默认追加 pending-only migration gate；只排查 HTTP 层时可用 `--skip-migration-gate`。
  - 新增 `deploy:schema-gate-test` 作为手工 schema gate 入口。
- Document -> code: `deploy/README.md`、`deploy/scripts/README.md`、测试环境部署 runbook 和业务试用初始化 runbook 已同步。
- ADR-015 inventory / route surface: N/A，本片不改 public route。
- Migration -> entity: N/A，本片不改 schema / entity。
- Entity -> contract / OpenAPI: N/A，本片不改 contract / OpenAPI / generated client。
- Query / view: CLI pending 查询仅作为部署 gate，无业务 UI。
- Guard / permission: local env file 是部署 gate 前置，不新增平台权限。
- Drift:
  - Classification: `new-real-drift` 已修复。
  - Existing baseline drift: N/A。
  - New drift introduced: none。
- Decision:
  - Can commit: yes。
  - Can mark tracker Done: yes。
