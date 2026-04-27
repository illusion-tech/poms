# FE-42 前端权限与敏感字段可见性回归矩阵 G4 Close-out

- Task ID: `FE-42`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Baseline: `docs/design/archive/slices/fe-42-frontend-permission-visibility-baseline.md`
- G3 Checkpoint: `docs/design/archive/slices/fe-42-frontend-permission-visibility-g3-checkpoint.md`
- Runtime Commit: `3f0a4a3 feat(admin): 完成 FE-42 前端权限可见性闭环`

---

## 1. G4 结论

`FE-42` 可以关闭为 `Done / G4`。

已提交内容与 G1 边界一致：

1. 前端新增共享敏感字段可见性基线，当前使用 `contract:finance:manage` 控制经营金额类字段展示。
2. 合同列表、合同详情、项目详情和合同承接页已对签约金额 / 有效合同额等经营金额字段做前端遮罩。
3. viewer 可以进入合同协作入口，但看不到经营金额和“新建合同”动作。
4. 新增浏览器矩阵覆盖 viewer 菜单、admin / viewer 合同金额差异、viewer direct URL 拒绝和 anonymous returnUrl。
5. 修复 project workspace smoke 中项目编号 helper 命名漂移。

---

## 2. 提交证据

| Evidence         | Result                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Commit           | `3f0a4a3 feat(admin): 完成 FE-42 前端权限可见性闭环`                                                                               |
| Runtime files    | `sensitive-visibility.ts`、合同列表 / 详情、项目详情、合同承接页、`frontend-permission-visibility.matrix.spec.ts`、workspace smoke |
| Governance files | FE-41 G4 close-out、FE-42 baseline、FE-42 G3 checkpoint、tracker、progress                                                         |
| Tracker update   | 本 close-out 后将 `FE-42` 标记为 `Done / G4`                                                                                       |

---

## 3. G3 验证回放

G3 已在本地 checkpoint 记录，结果如下：

| Check                                                                                                                                                                                                                | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-list.spec.ts`                                                                                                        | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/contract/contract-detail.spec.ts`                                                                                                      | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-detail.spec.ts`                                                                                                        | Pass   |
| `corepack pnpm nx test poms-admin --testFile=apps/poms-admin/src/app/features/project/project-contract-handover.spec.ts`                                                                                             | Pass   |
| `corepack pnpm nx lint poms-admin`                                                                                                                                                                                   | Pass   |
| `corepack pnpm nx build poms-admin`                                                                                                                                                                                  | Pass   |
| `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts` | Pass   |
| `corepack pnpm run format:md:check`                                                                                                                                                                                  | Pass   |
| `git diff --check`                                                                                                                                                                                                   | Pass   |

`shared-api-client:check`、`poms-api` lint / build / test 与 `migration-check` 不适用：本片未修改后端 API、generated client、权限模型或 DDL。

---

## 4. Drift 与例外

| Item                                 | Status            | Decision                                                                        |
| ------------------------------------ | ----------------- | ------------------------------------------------------------------------------- |
| Route / guard drift                  | Closed            | 未修改 guard；viewer 拒绝和 anonymous returnUrl 已由 targeted Playwright 覆盖。 |
| Sensitive UI surface drift           | Closed            | 正式前端金额可见面已按 `contract:finance:manage` 遮罩。                         |
| `FE42-R1-FRONTEND-MASKING-LIMITED`   | Accepted boundary | 本片只保证前端可见面不越权展示；后端字段级投影 / 审计需独立治理。               |
| `FE42-R2-CONTRACT-ROUTE-READ-SCOPE`  | Accepted boundary | `/contracts` 继续用 `project:read` 作为协作入口，金额用字段可见性遮罩。         |
| API / DTO / permission / persistence | No change         | 未发现本片新增 public contract、权限 key 或持久化 drift。                       |

---

## 5. 下游承接

`FE-42` 关闭后，`FE-39 ~ FE-42` 这一组正式入口、待办深链、合同表格和权限可见性回归已完成前端闭环。

后续若继续增强安全边界，应新开后端字段级投影 / 字段访问审计切片，不能把前端遮罩误当成完整数据安全控制。
