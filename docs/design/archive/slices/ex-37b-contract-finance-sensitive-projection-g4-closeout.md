# EX-37B 合同 / 项目经营金额后端投影切换 G4 Close-out

- Task ID: `EX-37B`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client
- Baseline: `docs/design/archive/slices/ex-37b-contract-finance-sensitive-projection-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37b-contract-finance-sensitive-projection-g3-checkpoint.md`
- Implementation Commit: `6f62665 feat(platform): 完成 EX-37B 合同财务敏感字段投影闭环`

---

## 1. G4 结论

`EX-37B` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 合同列表 / 详情 / 条款快照读取已接入 `contract-finance` 后端 sensitive projection。
2. 项目详情当前合同摘要已接入 `contract-finance` 后端 sensitive projection。
3. 合同承接摘要、项目移交详情和单个移交详情中的有效合同总额 / 合同项签约金额已接入后端 sensitive projection。
4. shared contracts、OpenAPI 与 generated client 已同步新增 projection 字段，并将过渡 legacy 金额标量改为 nullable。
5. 无 `contract:finance:sensitive:read` 权限时，第一批合同经营金额响应不再携带原始金额。
6. 有 `contract:finance:sensitive:read` 权限时，projection 返回 `full`，legacy 字段继续返回原始金额以维持过渡兼容。
7. 前端仅做 generated nullable 类型的最小构建兼容，没有提前完成 projection 消费重构。

---

## 2. 提交证据

| Evidence              | Result                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementation commit | `6f62665 feat(platform): 完成 EX-37B 合同财务敏感字段投影闭环`                                                                               |
| Shared contracts      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                                                          |
| API runtime           | `apps/poms-api/src/app/features/contract/*`、`apps/poms-api/src/app/features/project/*`、`apps/poms-api/src/app/features/project-handover/*` |
| Sensitive helper      | `apps/poms-api/src/app/core/sensitive-field-projection/*`                                                                                    |
| Frontend compat       | `apps/poms-admin/src/app/features/contract/contract-detail.ts`                                                                               |
| Generated files       | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                                                                        |
| Governance files      | EX-37A G4 close-out、EX-37B baseline、EX-37B G3 checkpoint、tracker、progress                                                                |

---

## 3. G3 验证回放

| Check                                                                                                           | Result |
| --------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx build shared-contracts`                                                                       | Pass   |
| `corepack pnpm nx lint poms-api`                                                                                | Pass   |
| `corepack pnpm nx build poms-api`                                                                               | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/contract/contract.controller.spec.ts` | Pass   |
| `corepack pnpm nx run poms-api:openapi`                                                                         | Pass   |
| `corepack pnpm nx run shared-api-client:generate`                                                               | Pass   |
| `corepack pnpm nx run shared-api-client:check`                                                                  | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                              | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts` | Pass   |
| `corepack pnpm nx build poms-admin`                                                                             | Pass   |
| `corepack pnpm run format:md:check`                                                                             | Pass   |
| `git diff --check`                                                                                              | Pass   |

`poms-api` focused command 实际运行全量 API Jest，结果为 `40` suites / `501` tests passed。合同详情前端 focused spec 结果为 `1` suite / `3` tests passed。

---

## 4. Drift 与例外

| Item                                     | Status            | Decision                                                                                    |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `EX37B-R1-LEGACY-SCALAR-COMPATIBILITY`   | Accepted boundary | legacy 金额标量保留到 `FE-43` 消费切换；无敏感读权限时返回 `null`，不返回遮罩文本或原始值。 |
| `EX37B-R2-FRONTEND-CONSUMPTION-DEFERRED` | Open downstream   | 前端完整 projection 消费由 `FE-43` 承接；本片只做 generated nullable 类型兼容。             |
| `EX37B-R3-SECURITY-EVENT-VOLUME`         | Accepted boundary | 列表 / 摘要读取可能产生多条 masked security event；如需批量审计降噪，另开审计增强。         |
| Public route surface                     | No change         | 本片未新增、删除或改名 public route，不需要更新 authoritative API inventory。               |
| Persistence                              | No change         | 本片未改 DDL、entity、repository 或 migration。                                             |

---

## 5. 下游承接

`EX-37B` 关闭后，下游顺序为：

1. `FE-43`：前端合同 / 项目敏感金额展示改为消费 generated sensitive projection，不再用 `contract:finance:manage` 自行推断完整值。
2. `EX-37C`：将 `operating-finance` 与 `commission-compensation` 字段包扩展到 `L4` / `L5` 查询响应。

`FE-43` 进入 implementation 前必须先冻结 G1，明确前端显示、空态、tooltip / masked 文案、component tests 与浏览器权限回归边界。
