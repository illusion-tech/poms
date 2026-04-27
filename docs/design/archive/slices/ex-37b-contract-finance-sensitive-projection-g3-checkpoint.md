# EX-37B 合同 / 项目经营金额后端投影切换 G3 Checkpoint

- Task ID: `EX-37B`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client
- Baseline: `docs/design/archive/slices/ex-37b-contract-finance-sensitive-projection-baseline.md`

---

## 1. 本地交付

`EX-37B` 已按 G1 基线完成本地实现：

1. 合同列表、合同详情和合同条款快照读取已接入 `contract-finance` 敏感字段投影。
2. 项目详情 `currentContractSummary.signedAmount` 已接入后端投影。
3. 合同承接摘要、项目移交详情和单个移交详情中的有效合同总额 / 合同项签约金额已接入后端投影。
4. 相关 shared contract schema 新增 projection 字段，legacy 金额标量改为 nullable。
5. 无 `contract:finance:sensitive:read` 权限时，后端响应不再携带原始金额，legacy 字段返回 `null`，projection 返回 `masked`。
6. 有 `contract:finance:sensitive:read` 权限时，projection 返回 `full`，legacy 字段继续返回原始金额以保持过渡兼容。
7. 新增 request-context helper，把 controller request 中的 path / method / requestId / ip / userAgent 传给投影服务。
8. 命令服务内部读取项目移交详情时使用显式内部上下文，避免命令校验阶段产生无意义遮罩。
9. OpenAPI 与 generated client 已同步，前端因 nullable generated model 产生的合同详情类型漂移已做最小兼容修复。

---

## 2. 文件范围

| Area                 | Files                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared contracts     | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                                                                                                                                                                                                                                                                                                                             |
| Sensitive helper     | `apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.ts`、`apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection-request-context.ts`                                                                                                                                                                                                            |
| Contract API         | `apps/poms-api/src/app/features/contract/contract.controller.ts`、`apps/poms-api/src/app/features/contract/contract-term-snapshot.controller.ts`、`apps/poms-api/src/app/features/contract/contract.controller.spec.ts`                                                                                                                                                                                         |
| Project API          | `apps/poms-api/src/app/features/project/project.controller.ts`、`apps/poms-api/src/app/features/project/project-query.service.ts`、`apps/poms-api/src/app/features/project/project.controller.spec.ts`、`apps/poms-api/src/app/features/project/project-query.service.spec.ts`                                                                                                                                  |
| Handover API         | `apps/poms-api/src/app/features/project-handover/project-handover.controller.ts`、`apps/poms-api/src/app/features/project-handover/project-handover-query.service.ts`、`apps/poms-api/src/app/features/project-handover/project-handover-command.service.ts`、`apps/poms-api/src/app/features/project-handover/project-handover.controller.spec.ts`、`apps/poms-api/src/app/features/project-handover/*spec.ts` |
| Frontend compat      | `apps/poms-admin/src/app/features/contract/contract-detail.ts`                                                                                                                                                                                                                                                                                                                                                  |
| Generated outputs    | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                                                                                                                                                                                                                                                                                                                                           |
| Governance documents | EX-37A G4 close-out、EX-37B baseline、本 checkpoint、tracker、progress                                                                                                                                                                                                                                                                                                                                          |

---

## 3. 验证结果

| Check                                                                                                           | Result | Notes                                                                                             |
| --------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `corepack pnpm nx build shared-contracts`                                                                       | Pass   | shared response schema 与 projection 字段可编译。                                                 |
| `corepack pnpm nx lint poms-api`                                                                                | Pass   | 后端 controller / query / helper / spec 通过 lint。                                               |
| `corepack pnpm nx build poms-api`                                                                               | Pass   | 后端投影 helper 与业务 query 注入关系可构建。                                                     |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts` | Pass   | Jest 配置实际运行 `poms-api` 全量套件，`40` suites / `501` tests passed。                         |
| `corepack pnpm nx run poms-api:openapi`                                                                         | Pass   | OpenAPI 已反映 nullable legacy 字段与新增 projection 字段。                                       |
| `corepack pnpm nx run shared-api-client:generate`                                                               | Pass   | generated client 已同步新模型。                                                                   |
| `corepack pnpm nx run shared-api-client:check`                                                                  | Pass   | generated client 与 OpenAPI 一致。                                                                |
| `corepack pnpm nx lint poms-admin`                                                                              | Pass   | 前端最小兼容修复通过 lint。                                                                       |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts` | Pass   | 合同详情 focused component spec 通过，`1` suite / `3` tests passed。                              |
| `corepack pnpm nx build poms-admin`                                                                             | Pass   | generated nullable 字段导致合同详情类型漂移，已做最小兼容修复；完整 projection 消费仍归 `FE-43`。 |
| `corepack pnpm run format:md:check`                                                                             | Pass   | 文档表格格式化后通过。                                                                            |
| `git diff --check`                                                                                              | Pass   | 无空白与行尾漂移。                                                                                |
| Playwright E2E                                                                                                  | N/A    | 本片不完成前端 projection 消费；浏览器回归属于 `FE-43`。                                          |
| `migration-check`                                                                                               | N/A    | 本片不改 DDL、entity、repository 或 migration。                                                   |

---

## 4. Drift 判断

| Edge                         | Result                | Notes                                                                                            |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `EX-37B` baseline -> runtime | Pass                  | G1 冻结的合同、项目详情、合同承接和移交详情金额字段均已接入 `contract-finance` 投影。            |
| Public route surface         | No change             | 未新增、删除或改名 public route；不更新 canonical route inventory。                              |
| Shared contract surface      | Expected schema drift | 既有 legacy 金额字段改为 nullable，同时新增 projection 字段；OpenAPI / generated client 已同步。 |
| Unauthorized response        | Pass                  | focused specs 覆盖 viewer 无敏感读权限时 legacy 金额为 `null`、projection 为 `masked`。          |
| Command boundary             | Pass                  | 命令校验内部读取使用显式内部上下文，不把 command validation 当作外部 masked read 记录。          |
| Frontend consumption         | Accepted boundary     | 仅修复 generated type drift 造成的构建失败；不在本片迁移页面到 projection 字段。                 |
| Persistence                  | No change             | 未改 DDL、migration、entity、repository。                                                        |

---

## 5. 例外与风险

| ID                                       | Status            | Decision                                                                                                |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `EX37B-R1-LEGACY-SCALAR-COMPATIBILITY`   | Accepted boundary | legacy 标量字段继续保留，但无敏感读权限时返回 `null`；`FE-43` 之后前端应以 projection 作为显示事实源。  |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Accepted boundary | 本片只做后端响应脱敏和 generated type 最小兼容；完整前端展示、提示和 E2E 由 `FE-43` 承接。              |
| `EX37B-R3-SECURITY-EVENT-VOLUME`         | Accepted boundary | 列表 / 摘要读取可能按字段与目标记录产生多条 `masked` security event；如需批量降噪，应另开审计聚合增强。 |

---

## 6. G3 结论

`EX-37B` 满足本地 G3 的核心安全条件：无 `contract:finance:sensitive:read` 的调用方不再从第一批合同经营金额响应中拿到原始金额。

提交后可进入 `G4 close-out`，再开放 `FE-43` 前端消费后端 projection 字段。
