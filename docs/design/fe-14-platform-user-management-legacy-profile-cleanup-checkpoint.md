# FE-14 平台用户管理历史 `/profile/*` 模板清理 Checkpoint

## 1. Checkpoint Meta

- Slice ID: `FE-14`
- Slice Type: `frontend-only`
- Status: `Pass`
- Date: `2026-04-20`
- Owner: `Codex`

## 2. 为什么需要本次纠偏

- `FE-13` 已经把 `/profile` 收口为个人中心正式入口，但代码库中仍残留一套未挂载的 `user-management` 历史模板路由与页面。
- 这批历史文件继续硬编码 `/profile/list`、`/profile/create/*`，会误导后续实现与人工测试，把已关闭的旧承载方式误当成当前有效入口。
- 同时，若文档仍以“前端当前仍存在 `/profile/*` 用户管理流程”描述现实，会让治理基线再次与实际代码脱节。

## 3. 本片纠偏范围

- 删除已脱链的前端历史模板文件：
  - `apps/poms-admin/src/app/features/user-management/usermanagement.routes.ts`
  - `apps/poms-admin/src/app/features/user-management/user-create.ts`
  - `apps/poms-admin/src/app/features/user-management/create/*`
- 收缩 `apps/poms-admin/src/app/features/user-management/index.ts`，不再暴露历史模板导出。
- 回写治理文档，使 `/platform/users` 与 `/profile` 的当前语义、承载状态和历史背景重新对齐。
- 关闭 `FE-13-E1` 例外。

## 4. Formal Inputs

| Type            | Source                                                           | Section / Anchor | Status     | Notes                                                         |
| --------------- | ---------------------------------------------------------------- | ---------------- | ---------- | ------------------------------------------------------------- |
| ADR             | `docs/adr/010-platform-user-management-route-bridging-status.md` | `4. 决策`        | `accepted` | `platform.users` 不得与历史 `/profile/*` 自动等价             |
| Business design | `docs/design/platform-governance/navigation-design.md`           | `8.4`            | `accepted` | 平台治理正式入口使用 `/platform/*`；`/profile` 只承接个人中心 |
| Business design | `docs/design/platform-governance/navigation-route-mapping.md`    | `4.`             | `accepted` | `platform.users -> /platform/users`、`my_profile -> /profile` |
| Domain design   | `docs/design/platform-governance/user-management-design.md`      | `4.` / `8.2`     | `accepted` | 第一阶段正式用户管理前端承载是 `/platform/users` 与真实 API   |

## 5. 冻结结论

| Topic                | Before                                           | After                                       |
| -------------------- | ------------------------------------------------ | ------------------------------------------- |
| 历史模板代码         | 未挂载但保留在仓库，持续暴露 `/profile/*` 旧语义 | 从前端代码中删除                            |
| 平台用户管理正式承载 | 文档与代码仍存在“旧模板是否仍是现实”的混淆       | 明确以 `/platform/users` 为唯一正式前端承载 |
| 个人中心语义边界     | `/profile` 已纠正，但旧模板仍形成回流噪音        | `/profile` 只保留个人中心语义               |
| FE-13 例外           | `FE-13-E1` 仍打开                                | 在本片关闭                                  |

## 6. 测试与校验

| Check               | Required | Command / Evidence                                                                                                                            | Result         | Gap / Reason                                    |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------- |
| Lint                | `yes`    | `corepack pnpm nx lint poms-admin`                                                                                                            | `pass`         | 2026-04-20 通过                                 |
| Build               | `yes`    | `corepack pnpm nx build poms-admin`                                                                                                           | `pass`         | 2026-04-20 通过                                 |
| Unit tests          | `yes`    | `corepack pnpm nx test poms-admin --runInBand`                                                                                                | `pass`         | 2026-04-20 通过                                 |
| Browser E2E / smoke | `yes`    | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts --grep "admin can reach the platform governance pages"` | `pass`         | 2026-04-20 先执行 `poms-api:seeder-run` 后通过  |
| API / migration     | `no`     | N/A                                                                                                                                           | `not required` | 仅前端死代码与治理文档清理，无 API / 持久化变化 |

## 7. 例外与风险

- 无新增例外。
- `FE-13-E1` 已由本片正式关闭。

## 8. G3 结论

- Checkpoint Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-20`
- Conditions:
  - 以 lint / build / unit / browser smoke 全部通过作为最终 close-out 证据。
