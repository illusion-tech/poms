# EX-37A 敏感字段投影 primitive、字段包权限与安全事件 helper G4 Close-out

- Task ID: `EX-37A`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend foundation / shared contract / runtime audit helper
- Baseline: `docs/design/archive/slices/ex-37a-sensitive-projection-primitive-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37a-sensitive-projection-primitive-g3-checkpoint.md`
- Implementation Commit: `31338ba feat(platform): 完成 EX-37A 敏感字段投影治理闭环`

---

## 1. G4 结论

`EX-37A` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. shared contracts 已提供 strict sensitive projection primitive、字段包 key、投影模式、原因码和字段包权限映射。
2. 已新增专用敏感读权限，不再把 `contract:finance:manage` 作为完整敏感值读取条件。
3. API contracts 已提供 `SensitiveStringFieldProjectionDto` wrapper，供后续业务 DTO 引用。
4. API 后端已提供全局 `SensitiveFieldProjectionService` / policy，支持 query service 生成 `full` / `masked` / `denied` 字符串投影。
5. `masked` / `denied` 读取会记录 `sensitive_field.masked` / `sensitive_field.denied` security event。
6. OpenAPI 与 generated client 已同步新增权限枚举。

本片没有切换合同、项目、`L4` 或 `L5` 业务查询 DTO；下游不能把本片误读为字段级脱敏已在业务响应中全面生效。

---

## 2. 提交证据

| Evidence              | Result                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Implementation commit | `31338ba feat(platform): 完成 EX-37A 敏感字段投影治理闭环`                                                     |
| Runtime files         | `apps/poms-api/src/app/core/sensitive-field-projection/*`、`apps/poms-api/src/app/app.module.ts`               |
| Contract files        | `libs/shared/contracts/src/lib/shared-contracts.ts`、`libs/api/contracts/src/lib/sensitive-field-projection/*` |
| Generated files       | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                                          |
| Governance files      | EX-37A baseline、EX-37A G3 checkpoint、tracker、progress                                                       |

---

## 3. G3 验证回放

| Check                                                                                                                                        | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx build shared-contracts`                                                                                                    | Pass   |
| `corepack pnpm nx lint poms-api`                                                                                                             | Pass   |
| `corepack pnpm nx build poms-api`                                                                                                            | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/core/sensitive-field-projection/sensitive-field-projection.service.spec.ts` | Pass   |
| `corepack pnpm nx run poms-api:openapi`                                                                                                      | Pass   |
| `corepack pnpm nx run shared-api-client:check`                                                                                               | Pass   |
| `corepack pnpm run format:md:check`                                                                                                          | Pass   |
| `git diff --check`                                                                                                                           | Pass   |

`poms-api` Jest 命令实际运行全量 API 单测，结果为 `40` suites / `499` tests passed。

---

## 4. Drift 与例外

| Item                                   | Status            | Decision                                                                                   |
| -------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| `EX37-R1-MANAGE-AS-READ-SENSITIVE`     | Closed            | 已由专用敏感读权限和字段包映射关闭；`contract:finance:manage` 不再授予完整敏感值读取能力。 |
| `EX37A-R1-SCHEMA-NOT-ROUTE-REFERENCED` | Accepted boundary | primitive DTO 尚未进入业务 route response；这是 `EX-37B / EX-37C` 的工作，不阻塞本片关闭。 |
| Public route surface                   | No change         | 本片未新增、修改或删除 route，不需要更新 authoritative API inventory。                     |
| Business query projection              | Open downstream   | 合同 / 项目经营金额、`L4` / `L5` 经营与提成金额投影仍需下游切片实际接入。                  |
| Export / reveal / approval clipping    | Out of scope      | 导出申请、短时揭示、审批摘要裁剪仍保留为后续增强项。                                       |

---

## 5. 下游承接

`EX-37A` 关闭后，下游顺序为：

1. `EX-37B`：先切合同 / 项目经营金额后端投影，使 viewer 响应不再携带完整经营金额。
2. `FE-43`：前端消费后端 sensitive projection，移除本地完整值推断。
3. `EX-37C`：扩展 `operating-finance` 与 `commission-compensation` 字段包到 `L4` / `L5` 查询响应。

`EX-37B` 进入 implementation 前必须先冻结 G1，明确合同列表 / 详情、项目详情、合同承接摘要的具体 DTO 字段替换边界。
