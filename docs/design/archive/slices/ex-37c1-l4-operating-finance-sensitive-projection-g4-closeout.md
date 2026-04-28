# EX-37C1 L4 经营金额后端投影切换 G4 Close-out

- Task ID: `EX-37C1`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: backend query / shared contract / generated client / frontend consumption
- Baseline: `docs/design/archive/slices/ex-37c1-l4-operating-finance-sensitive-projection-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/ex-37c1-l4-operating-finance-sensitive-projection-g3-checkpoint.md`
- Implementation Commit: `1a402c7 feat(project-cost): 完成 EX-37C1 经营财务敏感字段投影闭环`

---

## 1. G4 结论

`EX-37C1` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. `business-outcome-overview`、`unified-accounting`、`variance-risk-explanation`、`business-accounting-feedback` 四个 L4 读取视图已接入 `operating-finance` 后端 sensitive projection。
2. 本片冻结的 L4 经营金额 / 税务 / 毛利 / 下游影响字段已改为 projection-only，response 不再保留对应 legacy scalar。
3. 无 `operating:finance:sensitive:read` 权限时，projection 返回 `masked`，并通过 `SensitiveFieldProjectionService` 记录 masked security event。
4. 有 `operating:finance:sensitive:read` 权限时，projection 返回 `full`，原始字符串只出现在 projection `value` / `displayText` 中。
5. L4 经营总览、偏差风险和提成 gate 解释页已同步消费 generated projection 字段，不再等待单独 L4 前端兼容片。
6. shared contracts、OpenAPI、generated client、后端 focused tests、前端 focused store test 和治理文档已同步。

---

## 2. 提交证据

| Evidence              | Result                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Implementation commit | `1a402c7 feat(project-cost): 完成 EX-37C1 经营财务敏感字段投影闭环`                                 |
| Shared contracts      | `libs/shared/contracts/src/lib/shared-contracts.ts`                                                 |
| API runtime           | `apps/poms-api/src/app/features/project-cost/project-cost.controller.ts`、`project-cost.service.ts` |
| API tests             | `apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts`                          |
| Frontend consumers    | `project-operating-overview.ts`、`project-variance-risk.ts`、`project-commission-gate-overview.ts`  |
| Frontend tests        | `apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts`                          |
| Generated files       | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model/*`                               |
| Governance files      | EX-37C1 baseline、EX-37C1 G3 checkpoint、tracker、progress                                          |

---

## 3. G3 验证回放

| Check                                                                                                                              | Result |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx build shared-contracts`                                                                                          | Pass   |
| `corepack pnpm nx test poms-api --testFile=apps/poms-api/src/app/features/project-cost/project-cost.service.spec.ts --runInBand`   | Pass   |
| `corepack pnpm nx lint poms-api`                                                                                                   | Pass   |
| `corepack pnpm nx build poms-api`                                                                                                  | Pass   |
| `corepack pnpm nx run poms-api:openapi`                                                                                            | Pass   |
| `corepack pnpm nx run shared-api-client:generate`                                                                                  | Pass   |
| `corepack pnpm nx run shared-api-client:check`                                                                                     | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                                 | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-workspace.store.spec.ts --runInBand` | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                | Pass   |
| `corepack pnpm run format:md:check`                                                                                                | Pass   |
| `git diff --check`                                                                                                                 | Pass   |

`poms-api` focused command 实际运行全量 API Jest，结果为 `40` suites / `503` tests passed。前端 focused store test 结果为 `1` suite / `26` tests passed。

---

## 4. Drift 与例外

| Item                                            | Status            | Decision                                                                                |
| ----------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| 过渡兼容口径改为 projection-only direct cutover | Closed at G3      | 当前仍处开发期、未上线；不保留 legacy scalar 兼容层。                                   |
| L4 前端消费提前并入 `EX-37C1`                   | Closed at G3      | 避免 generated DTO 与页面消费短暂不一致；`FE-44` 缩小为 L5 与浏览器矩阵收口。           |
| `EX37C1-R3-SUMMARY-STRING-GRANULARITY`          | Open downstream   | 部分 L4 字段是混合摘要字符串，本片按 `operating-finance` 字段包整体遮罩，不做摘要裁剪。 |
| OpenAPI generator `propertyNames` warnings      | Existing baseline | `shared-api-client:check` 通过，warning 非本片新增，不阻塞 G4。                         |
| Public route surface                            | No change         | 本片未新增、删除或改名 public route，不需要更新 authoritative API inventory。           |
| Persistence                                     | No change         | 本片未改 DDL、entity、repository 或 migration。                                         |
| Browser E2E                                     | Deferred boundary | 本片不新增导航入口；跨 L4 / L5 的浏览器权限矩阵由 `FE-44` 在 L5 projection 稳定后收口。 |

---

## 5. 下游承接

`EX-37C1` 关闭后，下游顺序为：

1. `EX-37C2`：将 `commission-compensation` 字段包扩展到 L5 提成 calculation / payout / adjustment / settlement / rule explanation 读取响应。
2. `FE-44`：消费 L5 projection 字段，补残余敏感字段展示和跨 L4 / L5 浏览器权限矩阵。
3. 另开 cleanup slice：把已提交 `EX-37B` 中保留的 contract-finance legacy scalar 兼容口径收口为 projection-only，贯彻开发期不兼容原则。

`EX-37C` 父任务保持 `Doing`，直到 `EX-37C2` 与 `FE-44` 都完成 G4。
