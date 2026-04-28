# FE-43 前端消费后端敏感字段投影 G4 Close-out

- Task ID: `FE-43`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Baseline: `docs/design/archive/slices/fe-43-frontend-sensitive-projection-consumption-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-43-frontend-sensitive-projection-consumption-g3-checkpoint.md`
- Implementation Commit: `7b1ff1d feat(admin): 完成 FE-43 敏感字段投影消费前端闭环`

---

## 1. G4 结论

`FE-43` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 合同列表、合同详情、项目详情和合同承接页的第一批合同经营金额展示已改为消费后端 `SensitiveStringFieldProjection`。
2. 前端金额展示不再用 `contract:finance:manage` 推断完整值。
3. 新建合同、编辑合同、提交 / 生效等命令入口仍沿用既有操作权限判断。
4. 前端 focused component tests 和浏览器权限矩阵已覆盖 full / masked projection 输入。
5. 本片没有修改后端 API、generated client、DDL 或 `L4 / L5` 字段包。

---

## 2. 提交证据

| Evidence              | Result                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Implementation commit | `7b1ff1d feat(admin): 完成 FE-43 敏感字段投影消费前端闭环`                                   |
| Shared UI helper      | `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`                                  |
| Contract UI           | `apps/poms-admin/src/app/features/contract/contract-list.ts`、`contract-detail.ts`           |
| Project UI            | `apps/poms-admin/src/app/features/project/project-detail.ts`、`project-contract-handover.ts` |
| Tests                 | Contract / project focused specs、`frontend-permission-visibility.matrix.spec.ts`            |
| Governance files      | FE-43 baseline、FE-43 G3 checkpoint、tracker、progress                                       |

---

## 3. G3 验证回放

| Check                                                                                                                                                        | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `corepack pnpm nx lint poms-admin`                                                                                                                           | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                                | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`                                              | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-detail.spec.ts`                                                | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts`                                     | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                                          | Pass   |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts` | Pass   |
| `corepack pnpm run format:md:check`                                                                                                                          | Pass   |
| `git diff --check`                                                                                                                                           | Pass   |

浏览器矩阵结果为 `5` tests passed。WebServer 输出的 NX daemon / inspector port 信息归类为本机工具环境噪声，不影响 G4 判定。

---

## 4. Drift 与例外

| Item                                    | Status            | Decision                                                                                    |
| --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `FE43-R1-LEGACY-SCALAR-STILL-PRESENT`   | Closed            | 前端金额展示已不依赖 legacy scalar；legacy 字段是否移除属于后端兼容期策略，不阻塞本片关闭。 |
| `FE43-R2-NON-PROJECTED-TERM-FIELDS`     | Open downstream   | 非投影条款字段与 `L4 / L5` 字段包扩展由 `EX-37C` 或后续敏感字段扩展承接。                   |
| `FE43-R3-BROWSER-MATRIX-USES-DEV-ROLES` | Accepted boundary | 浏览器矩阵继续依赖 dev role fixture 区分 admin / viewer 敏感读权限；后续权限治理可再细化。  |
| Public API / generated client           | No change         | 本片未新增 route，未重新生成 client。                                                       |
| Persistence                             | No change         | 本片未改 DDL、entity、repository 或 migration。                                             |

---

## 5. 下游承接

`FE-43` 关闭后，下游顺序为：

1. `EX-37C`：将 `operating-finance` 与 `commission-compensation` 字段包扩展到 `L4 / L5` 查询响应。
2. 后续 frontend slice：若 `EX-37C` 生成新的 projection 字段并影响 `poms-admin`，再开前端消费切片或在 `EX-37C` G3 明确最小兼容边界。

`EX-37C` 进入 implementation 前必须先冻结 G1，避免把 `L4` 经营、`L5` 提成和合同详情剩余条款字段混在一个未分层的大改里。
