# EX-68A 业务试用环境初始化与 seed 分层治理 G3 / G4 收口

- Gate Status: `Pass`
- Parent: 测试环境部署与业务试用准备
- Tracker Row: `EX-68A`
- Owner: `Codex`
- Slice Type: `persistence / process`
- Closeout Date: 2026-05-27
- Baseline: `docs/design/ex-68a-business-trial-seed-baseline.md`

## 1. 交付范围

- 保留 `DatabaseSeeder` 作为本地开发 / E2E 固件入口，并修复项目移交 / 提成 E2E 固件依赖的 `operating_signal_summary_package_definition` FK 顺序。
- 新增 `PlatformBootstrapSeeder`，幂等写入平台组织、角色和角色权限映射，不写业务演示数据。
- 新增 `BusinessTrialSeeder`，通过未提交 CSV 写入实名试用账号、组织归属、角色授权、`local_credential` 密码哈希和 `TRIAL-*` 演示业务数据。
- 新增 `deploy/env/poms-test-trial-users.csv.example`，并通过 `.gitignore` 忽略 `/deploy/private/`。
- 新增业务试用初始化 runbook，明确共享测试环境不执行 `poms-api:seeder-run`，而是执行 migration、platform bootstrap 和 business trial seed。

## 2. 一致性结论

| Edge                       | Result | Evidence                                                                                   |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Document -> code           | Pass   | 手册和 seed target 均指向 `seed-platform-bootstrap` / `seed-business-trial`。              |
| Route inventory -> runtime | N/A    | 本片不新增、不修改、不删除 public API route。                                              |
| Migration -> entity -> DDL | Pass   | 不新增 DDL；`migration-check` 确认 schema 无 drift。                                       |
| Seeder -> existing tables  | Pass   | 新 seed 只写既有 platform / customer / lead / project / contract 表。                      |
| Account secret handling    | Pass   | 真实 CSV 与 env 进入 `/deploy/private/`，仓库仅提交 example；密码只写 bcrypt hash。        |
| Business demo data scope   | Pass   | 业务试用数据使用 `TRIAL-*` / `trial-demo`，开发 / E2E 固件仍由 `DatabaseSeeder` 独立负责。 |

## 3. 验证结果

| Check                                                   | Result | Notes                                                   |
| ------------------------------------------------------- | ------ | ------------------------------------------------------- |
| `corepack pnpm nx run poms-api:seed-platform-bootstrap` | Pass   | 平台组织、角色和权限映射可幂等写入。                    |
| `corepack pnpm nx run poms-api:seed-business-trial`     | Pass   | 使用临时 CSV 写入 5 个试用账号和 `TRIAL-*` 演示数据。   |
| `corepack pnpm nx run poms-api:seeder-run`              | Pass   | 旧开发 / E2E seed 仍可执行，FK 顺序问题已修复。         |
| `corepack pnpm nx run poms-api:migration-check`         | Pass   | Schema 已是最新状态。                                   |
| `corepack pnpm nx test poms-api`                        | Pass   | 67 个测试套件 / 711 个测试通过。                        |
| `corepack pnpm nx lint poms-api`                        | Pass   | API lint 通过。                                         |
| `corepack pnpm nx build poms-api`                       | Pass   | API 生产构建通过。                                      |
| `corepack pnpm run check:enum-like-strings`             | Pass   | 1286 个发现均由 35 条 allowlist 分类。                  |
| `corepack pnpm run format:md:check`                     | Pass   | Markdown 表格格式检查通过。                             |
| `git diff --check`                                      | Pass   | 仅提示 `seeders/README.md` 未来会做 CRLF 到 LF 规范化。 |

## 4. 漂移 / 例外

| Item               | Classification  | Resolution                                                                   |
| ------------------ | --------------- | ---------------------------------------------------------------------------- |
| Public API route   | N/A             | 本片无 route surface 变更，不触发 OpenAPI / generated client。               |
| 测试环境真实初始化 | Operational     | 本地代码与手册已就绪；远程 `poms_test` 重置、真实 CSV 和密码轮换需运维执行。 |
| Smoke CSV orgCode  | Tooling finding | 一次本地临时 CSV 使用不存在的 `HQ` 编码失败；手册已补充合法 `orgCode` 列表。 |

## 5. G4 结论

- `EX-68A`: `Done / G4`
- 共享测试环境初始化流程已从开发 / E2E seed 中拆出。
- 业务试用前仍需按 runbook 在远程测试库执行重置、迁移、真实账号 CSV seed、凭据轮换和登录 smoke。
