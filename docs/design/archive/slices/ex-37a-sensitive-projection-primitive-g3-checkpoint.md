# EX-37A 敏感字段投影 primitive、字段包权限与安全事件 helper G3 Checkpoint

- Task ID: `EX-37A`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend foundation / shared contract / runtime audit helper
- Baseline: `docs/design/archive/slices/ex-37a-sensitive-projection-primitive-baseline.md`

---

## 1. 本地交付

`EX-37A` 已按 G1 范围完成 foundation implementation：

1. 在 shared contracts 中新增严格字面量字段包、投影模式、原因码和 `SensitiveStringFieldProjection` schema。
2. 新增专用敏感读权限 key：
   - `contract:finance:sensitive:read`
   - `operating:finance:sensitive:read`
   - `commission:amount:sensitive:read`
   - `labor-cost-rate:sensitive:read`
   - `exception-approval-opinion:sensitive:read`
3. 固定字段包到敏感读权限的唯一映射，`contract:finance:manage` 不再作为完整敏感值读取条件。
4. 新增 API contracts DTO wrapper，供后续业务查询 DTO 引用。
5. 新增全局后端 `SensitiveFieldProjectionService` / policy，支持 query service 生成 `full` / `masked` / `denied` 字符串投影。
6. 对 `masked` / `denied` 投影记录 `sensitive_field.masked` / `sensitive_field.denied` security event。
7. 更新开发环境角色 fixture，使 viewer 不获得新增敏感读权限，财务相关角色获得对应敏感读权限。
8. 同步 OpenAPI 与 generated client 中的权限枚举。

本片未切换合同、项目、`L4` 或 `L5` 业务查询 DTO；这些仍由 `EX-37B / EX-37C / FE-43` 承接。

---

## 2. 文件范围

| Area              | Files                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared contracts  | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                                                                                         |
| API contracts     | `libs/api/contracts/src/lib/sensitive-field-projection/sensitive-field-projection.dto.ts`、`libs/api/contracts/src/index.ts`                                                |
| Runtime helper    | `apps/poms-api/src/app/core/sensitive-field-projection/*`、`apps/poms-api/src/app/app.module.ts`                                                                            |
| Role fixtures     | `apps/poms-api/src/app/core/platform/dev-platform.fixtures.ts`                                                                                                              |
| Tests             | `apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts`                                                                          |
| Generated outputs | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*permission*.ts`、`libs/shared/api-client/model/navigation-item.ts`、`libs/shared/api-client/model/*.ts` |
| Governance docs   | EX-37A baseline、EX-37A G3 checkpoint、tracker、progress                                                                                                                    |

---

## 3. 验证结果

| Check                                                                                                                                        | Result | Reason                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `corepack pnpm nx build shared-contracts`                                                                                                    | Pass   | shared sensitive projection schema 与 permission 字面量可编译。              |
| `corepack pnpm nx lint poms-api`                                                                                                             | Pass   | 新增后端 helper、module、fixture 与 spec 通过 lint。                         |
| `corepack pnpm nx build poms-api`                                                                                                            | Pass   | `SensitiveFieldProjectionModule` 与 contracts import 可在 API build 中闭环。 |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts` | Pass   | Jest 配置实际运行 `poms-api` 全量套件，`40` suites / `499` tests passed。    |
| `corepack pnpm nx run poms-api:openapi`                                                                                                      | Pass   | OpenAPI 已生成；新增 permission keys 进入现有权限枚举 schema。               |
| `corepack pnpm nx run shared-api-client:check`                                                                                               | Pass   | generated client 与 OpenAPI 完全同步。                                       |
| `corepack pnpm run format:md:check`                                                                                                          | Pass   | G3 文档补齐并格式化后通过。                                                  |
| `git diff --check`                                                                                                                           | Pass   | 无空白与行尾漂移。                                                           |
| frontend lint / build / E2E                                                                                                                  | N/A    | 本片不改前端 runtime。                                                       |
| `migration-check`                                                                                                                            | N/A    | 本片不改 DDL、entity、repository 或 migration。                              |

---

## 4. Drift 判断

| Edge                         | Result                | Notes                                                                                                                                                |
| ---------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EX-37` baseline -> runtime  | Pass                  | 字段包、投影模式、原因码、专用敏感读权限和 security event helper 均按 G1 范围落地。                                                                  |
| Permission semantics         | Pass                  | `EX37-R1-MANAGE-AS-READ-SENSITIVE` 已关闭；helper 只认字段包对应的 `*:sensitive:read` 权限，focused spec 明确验证 `contract:finance:manage` 不通过。 |
| Public route surface         | No change             | 未新增、修改或删除 public API route；不更新 canonical route inventory。                                                                              |
| Business query DTO           | No change             | 新 primitive 尚未进入合同 / 项目 / L4 / L5 响应，后续由 `EX-37B / EX-37C` 切换。                                                                     |
| OpenAPI / generated client   | Expected schema drift | 新 permission keys 扩展了既有权限枚举；已运行 openapi generation 与 `shared-api-client:check` 并提交生成结果。                                       |
| Primitive DTO route exposure | Accepted boundary     | `SensitiveStringFieldProjectionDto` 当前是后续业务 DTO 的 wrapper 输入，未单独形成 route response；不阻塞本片 G3。                                   |
| Persistence                  | No change             | 未改 DDL、migration、entity、repository。                                                                                                            |

---

## 5. 例外与风险

| ID                                     | Status                 | Decision                                                                                                                      |
| -------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`     | Closed                 | 已新增专用敏感读权限，并通过 policy / spec 确认 `manage` 不再授予完整敏感值读取能力。                                         |
| `EX37A-R1-SCHEMA-NOT-ROUTE-REFERENCED` | Accepted boundary      | primitive DTO 尚未被业务 route 引用，但权限枚举变更已真实进入 OpenAPI / generated client；业务 DTO 切换等 `EX-37B / EX-37C`。 |
| `EX37-R2-EXPORT-REVEAL-OUT-OF-SCOPE`   | Accepted upstream risk | 导出申请、短时揭示和审批摘要裁剪仍不进入本片；需要后续独立增强切片。                                                          |

---

## 6. G3 结论

`EX-37A` 满足本地 G3。

提交后可进入 `G4 close-out`，然后开放 `EX-37B`：合同 / 项目经营金额后端投影切换。
