# EX-68A 业务试用环境初始化与 seed 分层治理实施基线包

- Gate Status: `Pass`
- Parent: 测试环境部署与业务试用准备
- Owner: Codex
- Slice Type: `persistence / process`
- G1 Reviewer: User
- G1 Date: 2026-05-27
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-68A`

## 1. 范围

- 本次目标: 将共享测试环境初始化从开发 / E2E `DatabaseSeeder` 中拆出，新增平台 bootstrap seed、业务试用 seed、账号 CSV 约定和运行手册。
- 本次明确不做: 不新增 public API route，不改 OpenAPI / generated client，不新增用户管理 UI，不在仓库提交真实账号密码或测试环境 env。
- 下游可依赖的交付边界: 测试环境可在重置库后运行 migration、`seed-platform-bootstrap`、`seed-business-trial`，再交付实名试用账号和演示数据。
- 不允许下游依赖的留白: 当前权限粒度仍沿用现有角色 key，业务试用 seed 不替代正式用户生命周期管理。

## 2. 正式输入

| Input Type                | Document / Source                                       | Section / Anchor         | Status | Notes                     |
| ------------------------- | ------------------------------------------------------- | ------------------------ | ------ | ------------------------- |
| Business design           | `docs/reference/manual-test-account-matrix.md`          | 账号矩阵与职责拆分       | Review | 作为试用账号角色口径输入  |
| Command design            | N/A                                                     | N/A                      | N/A    | 不新增命令接口            |
| DTO / OpenAPI design      | N/A                                                     | N/A                      | N/A    | 不触发 OpenAPI            |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`          | N/A                      | N/A    | 不改变 public route       |
| Query boundary            | N/A                                                     | N/A                      | N/A    | 不新增读侧 API            |
| Data model / table freeze | 既有 platform / customer / lead / project / contract 表 | 现有 migration 与 entity | Active | 只写入 seed 数据          |
| Schema / DDL              | `apps/poms-api/src/migrations/`                         | 既有迁移                 | Active | 不新增 DDL                |
| ADR                       | `ADR-014`、`ADR-015`                                    | gate 与 route governance | Active | 本片无 route surface 变更 |

## 3. 本次 SSOT

| Concern                     | SSOT                                      | Implementation Rule                         |
| --------------------------- | ----------------------------------------- | ------------------------------------------- |
| Business semantics          | 人工测试账号矩阵 + 本 baseline            | 业务试用账号不复用开发弱密码账号            |
| Public route canonical path | N/A                                       | 不新增、不修改、不删除 public route         |
| Route / command naming      | N/A                                       | N/A                                         |
| DTO / contract naming       | N/A                                       | N/A                                         |
| Table / column naming       | 既有 entity / migration                   | seed SQL 只使用既有列名                     |
| Date / time semantics       | 既有表结构                                | 业务日期写 `date`，事件时间写 `timestamptz` |
| Identifier semantics        | 既有 UUID 主键 + 业务编号唯一键           | seed 使用稳定 UUID 和 `TRIAL-*` 业务编号    |
| Money / decimal semantics   | 既有 `numeric` 字段                       | 演示金额写固定字符串 decimal                |
| Status machine              | 既有 check constraints / shared constants | 只使用现有合法状态值                        |

## 4. 命令与接口边界

N/A. 本片不新增 controller、DTO、route 或 public API。

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: N/A
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

N/A. 本片不新增 query / view。

## 6. 持久化边界

| Table                                                               | Migration | Entity / Repository | DDL / Freeze Source | Check Result                 |
| ------------------------------------------------------------------- | --------- | ------------------- | ------------------- | ---------------------------- |
| `org_unit` / `role` / `role_permission_assignment`                  | Existing  | Existing            | Existing migrations | Bootstrap seed upserts only  |
| `platform_user` / `local_credential` / membership / role assignment | Existing  | Existing            | Existing migrations | Trial CSV users upsert only  |
| `customer` / `customer_alias` / `lead` / `project` / `contract`     | Existing  | Existing            | Existing migrations | Trial demo data upserts only |

| Field / Group       | Design Type / Meaning         | Migration / DDL | Entity   | Shared Contract / OpenAPI | Result                             |
| ------------------- | ----------------------------- | --------------- | -------- | ------------------------- | ---------------------------------- |
| Trial usernames     | 实名业务试用账号              | `varchar(64)`   | string   | N/A                       | CSV 驱动，不使用开发用户名         |
| Trial passwords     | 首次登录密码                  | bcrypt hash     | string   | N/A                       | 仅写 `local_credential` hash       |
| Trial business data | 演示客户 / 线索 / 项目 / 合同 | Existing        | Existing | N/A                       | 使用 `TRIAL-*` 编号并可重复 upsert |

## 7. 一致性结论

- Document -> code: 业务试用账号和演示数据由独立 seeder 承接。
- ADR-015 inventory -> route: N/A。
- Migration -> entity: 不新增 DDL，仍需运行 `migration-check`。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: 复用现有 role permission assignment。
- OpenAPI / generated client: N/A。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                              | Result     | Gap / Reason               |
| -------------------------------- | -------- | ----------------------------------------------- | ---------- | -------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                | Pending G3 | 新增 seed TS               |
| Build                            | Yes      | `corepack pnpm nx build poms-api`               | Pending G3 | 新增 seed TS               |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api`                | Pending G3 | 覆盖既有后端回归           |
| API / integration tests          | Yes      | seed targets + `poms-api:seeder-run`            | Pending G3 | 确认新旧 seed 均可用       |
| E2E                              | No       | N/A                                             | N/A        | 不改用户路径代码           |
| OpenAPI generation / client diff | No       | N/A                                             | N/A        | 不改 public API            |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-check` | Pending G3 | 不新增 DDL，但确认无 drift |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes      |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ---------- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无开放例外 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: User
- Approved At: 2026-05-27
- Conditions: 实施不得重用开发弱密码账号，不得在仓库提交真实试用账号密码或测试环境 env。
