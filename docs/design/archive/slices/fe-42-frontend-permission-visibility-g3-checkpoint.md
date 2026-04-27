# FE-42 前端权限与敏感字段可见性回归矩阵 G3 Checkpoint

- Task ID: `FE-42`
- Date: 2026-04-28
- Owner: Codex
- Slice Type: frontend-only implementation / browser regression
- Baseline: `docs/design/archive/slices/fe-42-frontend-permission-visibility-baseline.md`

---

## 1. 本地交付

`FE-42` 已按 G1 基线完成本地实现：

1. 新增前端共享敏感字段可见性基线：
   - `BUSINESS_FINANCE_PERMISSION_KEYS`
   - `FINANCIAL_SENSITIVE_FIELD_HIDDEN_TEXT`
2. 合同列表在用户缺少 `contract:finance:manage` 时：
   - 隐藏签约金额；
   - 展示统一遮罩文案；
   - 隐藏“新建合同”入口。
3. 合同详情在用户缺少 `contract:finance:manage` 时：
   - 隐藏签约金额；
   - 隐藏核心条款中的经营敏感信息；
   - 隐藏 draft 合同编辑 / 提交审核入口。
4. 项目详情的当前合同签约金额已按同一权限遮罩。
5. 合同承接页的有效合同额与合同表格签约金额已按同一权限遮罩。
6. 修复 `project-workspace.smoke.spec.ts` 中项目编号 helper 命名漂移。
7. 新增 `frontend-permission-visibility.matrix.spec.ts`，覆盖 viewer 菜单、admin / viewer 合同金额可见性、viewer direct URL 拒绝与 anonymous returnUrl。

---

## 2. 文件范围

| Area                | Files                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Shared UI primitive | `apps/poms-admin/src/app/shared/ui/sensitive-visibility.ts`                                                                             |
| Contract UI         | `apps/poms-admin/src/app/features/contract/contract-list.ts`、`apps/poms-admin/src/app/features/contract/contract-detail.ts`            |
| Project UI          | `apps/poms-admin/src/app/features/project/project-detail.ts`、`apps/poms-admin/src/app/features/project/project-contract-handover.ts`   |
| Component tests     | `contract-list.spec.ts`、`contract-detail.spec.ts`、`project-detail.spec.ts`、`project-contract-handover.spec.ts`                       |
| E2E                 | `apps/poms-admin-e2e/src/frontend-permission-visibility.matrix.spec.ts`、`apps/poms-admin-e2e/src/project-workspace.smoke.spec.ts`      |
| Governance          | `fe-41-contract-list-tabledemo-g3-g4-closeout.md`、`fe-42-frontend-permission-visibility-baseline.md`、本 checkpoint、tracker、progress |

---

## 3. 验证结果

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

Playwright targeted run: `9 passed`。WebServer 仍输出 `NX Daemon is not running` 和 inspector port 占用提示，归类为本机工具环境噪声；不影响本片 G3 判定。

---

## 4. Drift 判断

| Edge                   | Result    | Notes                                                                                     |
| ---------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Document -> code       | Pass      | 实现遵循 FE-42 G1，只做前端权限可见性和浏览器回归矩阵。                                   |
| Route / guard          | Pass      | 未修改 route guard；viewer direct URL 拒绝与 anonymous returnUrl 已覆盖。                 |
| Sensitive UI surface   | Pass      | 合同列表、合同详情、项目详情、合同承接页金额字段均按 `contract:finance:manage` 遮罩。     |
| Workbench / todo route | No change | FE-39 / FE-40 深链不改；FE-42 只补提成 operations direct URL 拒绝和 anonymous returnUrl。 |
| API / generated client | No change | 不需要 `shared-api-client:check`。                                                        |
| Persistence            | No change | 不涉及 DDL / migration。                                                                  |

---

## 5. 例外与风险

| ID                                  | Status            | Decision                                                                                |
| ----------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `FE42-R1-FRONTEND-MASKING-LIMITED`  | Accepted boundary | 本片只保证前端可见面不越权展示；后端 DTO 仍可能返回原始字段，后端字段级投影需独立治理。 |
| `FE42-R2-CONTRACT-ROUTE-READ-SCOPE` | Accepted boundary | `/contracts` 继续用 `project:read` 作为协作入口，金额用字段可见性遮罩。                 |

---

## 6. G3 结论

`FE-42` 满足本地 G3。提交后可进入 G4 close-out；后续若要把敏感字段控制升级为真正的安全边界，应另开后端字段级投影 / 审计治理切片，而不是继续扩大前端遮罩范围。
