# EX-37B 合同 / 项目经营金额后端投影切换实施基线包

- Task ID: `EX-37B`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-37B`
- Upstream: `EX-37A`

---

## 1. 背景

`EX-37A` 已关闭为 `Done / G4`，提供了 strict sensitive projection primitive、字段包权限映射和后端 `SensitiveFieldProjectionService`。

当前合同、项目详情和合同承接摘要仍直接返回合同经营金额标量。前端 `FE-42` 已做本地遮罩，但这不等价于后端字段级脱敏；API 响应仍可能把完整金额交给无敏感读权限的调用方。

`EX-37B` 的目标是把第一批 `contract-finance` 字段包接入后端投影，使无 `contract:finance:sensitive:read` 的用户响应不再携带原始经营金额，并记录 `masked` 安全事件。

---

## 2. G1 范围

### In Scope

1. 合同列表 / 详情：
   - `GET /contracts`
   - `GET /contracts/:id`
   - `GET /contracts/no/:contractNo`
   - `GET /contract-term-snapshots/:id`
   - 字段：`ContractSummary.signedAmount`
   - 详情字段：`ContractTermSnapshotSummary.amountTaxInclusive`、`amountTaxExclusive`
2. 项目详情：
   - `GET /projects/:id`
   - 字段：`ProjectDetailContractSummary.signedAmount`
3. 合同承接摘要 / 项目移交详情：
   - `GET /projects/:projectId/contract-handover`
   - `GET /projects/:projectId/project-handover`
   - `GET /project-handovers/:handoverId`
   - 字段：`ContractHandoverEffectiveContractSetSummary.totalSignedAmount`
   - 字段：`ContractHandoverContractItemSummary.signedAmount`
4. 为上述字段新增 projection 字段，类型使用 `SensitiveStringFieldProjectionSchema`。
5. legacy 标量字段只作为过渡兼容字段：
   - 有 `contract:finance:sensitive:read` 时返回原始值。
   - 无 `contract:finance:sensitive:read` 时返回 `null`。
   - 不允许返回遮罩文本冒充金额。
6. 对无权限读取的 `masked` 投影记录 `sensitive_field.masked` security event。
7. 更新 API contracts、OpenAPI、generated client 和 focused backend tests。

### Out Of Scope

1. 不改写合同、项目、移交的命令语义。
2. 不新增 public API route。
3. 不改 `api-route-canonical-inventory.md`。
4. 不改 DDL、migration、entity 或 repository。
5. 不切 `operating-finance`、`commission-compensation`、`labor-cost-rate`、`exception-approval-opinion` 字段包；这些属于 `EX-37C` 或后续增强。
6. 不做前端消费重构；前端改用 projection 字段属于 `FE-43`。
7. 不实现 `summary` 投影、导出申请、短时揭示或审批摘要裁剪。

---

## 3. 正式输入

| 输入                   | 文件 / 证据                                                                         | EX-37B 使用方式                                                    |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Sensitive primitive    | `ex-37a-sensitive-projection-primitive-g4-closeout.md`                              | 确认 `SensitiveFieldProjectionService` 可作为 query helper。       |
| Shared contracts       | `libs/shared/contracts/src/lib/shared-contracts.ts`                                 | 修改响应 schema，新增 projection 字段并调整 legacy 标量 nullable。 |
| Contract controller    | `apps/poms-api/src/app/features/contract/contract.controller.ts`                    | 在合同 list / detail mapper 接入后端投影。                         |
| Project query service  | `apps/poms-api/src/app/features/project/project-query.service.ts`                   | 在 `currentContractSummary` 接入投影。                             |
| Handover query service | `apps/poms-api/src/app/features/project-handover/project-handover-query.service.ts` | 在 effective contract set summary 接入投影。                       |
| Runtime audit request  | `apps/poms-api/src/app/core/runtime-audit/runtime-audit-request.utils.ts`           | 从 request 中取得 path / method / requestId / ip / userAgent。     |
| Frontend boundary      | `FE-43` tracker row                                                                 | 本片只保证后端响应不泄露原始值，前端消费另切。                     |

---

## 4. Contract 冻结

本片新增的正式读取字段如下：

```ts
signedAmountProjection: SensitiveStringFieldProjection;
amountTaxInclusiveProjection: SensitiveStringFieldProjection;
amountTaxExclusiveProjection: SensitiveStringFieldProjection;
totalSignedAmountProjection: SensitiveStringFieldProjection;
```

字段包统一为：

```ts
fieldPackageKey: 'contract-finance'
```

过渡兼容字段规则：

| DTO / View                                    | Legacy Field         | New Projection Field           | Unauthorized Legacy Value |
| --------------------------------------------- | -------------------- | ------------------------------ | ------------------------- |
| `ContractSummary`                             | `signedAmount`       | `signedAmountProjection`       | `null`                    |
| `ContractTermSnapshotSummary`                 | `amountTaxInclusive` | `amountTaxInclusiveProjection` | `null`                    |
| `ContractTermSnapshotSummary`                 | `amountTaxExclusive` | `amountTaxExclusiveProjection` | `null`                    |
| `ProjectDetailContractSummary`                | `signedAmount`       | `signedAmountProjection`       | `null`                    |
| `ContractHandoverContractItemSummary`         | `signedAmount`       | `signedAmountProjection`       | `null`                    |
| `ContractHandoverEffectiveContractSetSummary` | `totalSignedAmount`  | `totalSignedAmountProjection`  | `null`                    |

`currencyCode` / `currencyCodes`、合同编号、状态、日期和数量不是本片敏感金额字段，保持原样。

---

## 5. Query / Audit 边界

### Authorized

当用户权限包含 `contract:finance:sensitive:read`：

1. projection `mode = 'full'`。
2. projection `value = 原始金额字符串`。
3. legacy 字段返回原始金额字符串。
4. 不记录 security event。

### Unauthorized

当用户权限不包含 `contract:finance:sensitive:read`：

1. projection `mode = 'masked'`。
2. projection `value = null`。
3. projection `displayText = 敏感字段已隐藏` 或同等后端统一遮罩文案。
4. legacy 字段返回 `null`。
5. 记录 `sensitive_field.masked` security event。

`targetType` / `targetId` 规则：

| View / Field                | targetType         | targetId    |
| --------------------------- | ------------------ | ----------- |
| 合同 `signedAmount`         | `Contract`         | contract id |
| 合同 snapshot amount fields | `ContractSnapshot` | snapshot id |
| 项目详情当前合同金额        | `Project`          | project id  |
| 合同承接总有效合同额        | `Project`          | project id  |
| 合同承接单个合同金额        | `Contract`         | contract id |

---

## 6. Public Interface 与 Route 判断

| 项目                 | G1 判断                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| Public route surface | 不新增、不删除、不改 path / method。                                                             |
| Route inventory      | 不更新 `api-route-canonical-inventory.md`。                                                      |
| Shared contract      | 会修改既有 response DTO schema，并新增 projection 字段。                                         |
| Generated client     | 必须运行 `poms-api:openapi` 与 `shared-api-client:check`，并提交 generated client diff。         |
| Frontend build       | 本片不要求前端完成消费切换；若 generated client 导致 admin build 失败，应记录并由 `FE-43` 承接。 |
| Runtime persistence  | 不改 DDL / entity / repository。                                                                 |

---

## 7. 预期文件范围

Expected runtime / contract files:

1. `libs/shared/contracts/src/lib/shared-contracts.ts`
2. `apps/poms-api/src/app/features/contract/contract.controller.ts`
3. `apps/poms-api/src/app/features/contract/contract.controller.spec.ts`
4. `apps/poms-api/src/app/features/project/project.controller.ts`
5. `apps/poms-api/src/app/features/project/project-query.service.ts`
6. `apps/poms-api/src/app/features/project/project-query.service.spec.ts`
7. `apps/poms-api/src/app/features/project-handover/project-handover.controller.ts`
8. `apps/poms-api/src/app/features/project-handover/project-handover-query.service.ts`
9. `apps/poms-api/src/app/features/project-handover/project-handover-query.service.spec.ts`

Expected generated / check outputs:

1. `libs/shared/api-spec/openapi.json`
2. `libs/shared/api-client/**`

Expected docs:

1. This baseline.
2. `EX-37B` G3 checkpoint。
3. `phase2-development-execution-tracker.md`
4. `poms-design-progress.md`

---

## 8. 测试计划

Required at G3:

1. `git diff --check`
2. `corepack pnpm run format:md:check`
3. `corepack pnpm nx build shared-contracts`
4. Focused backend tests:
   - contract controller list / detail authorized vs unauthorized projection。
   - project detail current contract amount authorized vs unauthorized projection。
   - contract handover summary authorized vs unauthorized projection。
5. `corepack pnpm nx lint poms-api`
6. `corepack pnpm nx build poms-api`
7. `corepack pnpm nx test poms-api --testFile=<focused specs>`
8. `corepack pnpm nx run poms-api:openapi`
9. `corepack pnpm nx run shared-api-client:check`

Not required:

1. `migration-check`，因为不改 DDL。
2. Playwright E2E，前端消费切换属于 `FE-43`。
3. `poms-admin` build，除非本片直接修改前端代码；若 generated type drift 影响前端，由 `FE-43` G1/G3 记录并修复。

---

## 9. 例外与风险

| ID                                       | Level  | Scope                  | Owner | Cleanup Due  | Decision                                                                         |
| ---------------------------------------- | ------ | ---------------------- | ----- | ------------ | -------------------------------------------------------------------------------- |
| `EX37B-R1-LEGACY-SCALAR-COMPATIBILITY`   | Medium | API response migration | Codex | `FE-43`      | 本片保留 legacy 标量字段但无权限时返回 `null`；`FE-43` 必须改为消费 projection。 |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Medium | Frontend               | Codex | `FE-43`      | 本片不更新前端展示逻辑，避免混合 backend query 和 frontend UI 重构边界。         |
| `EX37B-R3-SECURITY-EVENT-VOLUME`         | Low    | Audit noise            | Codex | 后续审计增强 | 列表查询可能按字段 / 目标记录 masked 事件，后续如需降噪另开批量审计增强。        |

---

## 10. G1 结论

`EX-37B` 可以进入 implementation。

冻结条件：

1. 后端响应不得再向无 `contract:finance:sensitive:read` 的用户返回原始合同经营金额。
2. 正式消费入口是新增 projection 字段，legacy 标量只作为过渡兼容。
3. 不改 public route path / method，不改 DDL，不改命令语义。
4. 前端消费切换必须由 `FE-43` 承接，不能在本片悄悄完成一半。
