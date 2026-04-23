# FE-13 个人中心路由与当前用户资料前端纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `GOV`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-20`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` `FE-13`

## 1. 触发背景与范围

- 触发原因:
  - 导航 SSOT 已把 `my_profile -> /profile` 冻结为“个人中心”正式入口，但前端实际仍把 `/profile` 挂到旧的 `user-management` 路由树，造成个人中心与平台用户管理语义混用。
- 本次目标:
  - 让 `/profile` 成为真实个人中心页，直接消费 `auth/profile` 的当前用户聚合输出。
  - 清理顶部用户菜单中的占位项，使其与正式个人中心入口对齐。
- 本次明确不做:
  - 不新增或变更后端 API。
  - 不扩展用户自助编辑命令。
  - 不清理旧 `user-management` 模板文件的全部历史残留。
- 本次纠偏后可恢复的可信边界:
  - 导航、前端路由、页面语义三者重新对齐，`/profile` 可作为正式个人中心入口被下游依赖。
- 仍不允许下游依赖的留白:
  - 旧 `/profile/*` 模板型用户管理流程不再被视为正式入口，也不应继续被新功能引用。

## 2. 正式输入

| Input Type      | Document / Source                                                | Section / Anchor     | Status     | Notes                                              |
| --------------- | ---------------------------------------------------------------- | -------------------- | ---------- | -------------------------------------------------- |
| Business design | `docs/design/platform-governance/navigation-design.md`           | `8.4` / `my_profile` | `accepted` | `my_profile` 正式链接为 `/profile`                 |
| Query boundary  | `docs/adr/008-current-user-profile-output-contract.md`           | `4. 决策`            | `accepted` | 当前用户页必须直接消费真实 `auth/profile` 聚合输出 |
| Query boundary  | `docs/design/platform-governance/navigation-route-mapping.md`    | `4.` / `my_profile`  | `accepted` | `/profile` 为正式叶子节点入口                      |
| ADR             | `docs/adr/010-platform-user-management-route-bridging-status.md` | `4. 决策`            | `accepted` | `/profile/*` 不自动等价于平台用户管理桥接          |

## 3. Drift 清单与本次 SSOT

| Concern                | Drift / SSOT                                      | Corrective Rule                                      |
| ---------------------- | ------------------------------------------------- | ---------------------------------------------------- |
| Business semantics     | `/profile` 被实现成用户管理模板入口，而非个人中心 | `/profile` 只承接当前登录人的个人中心语义            |
| Route / view alignment | 导航 `my_profile` 与前端真实页面语义不一致        | 导航、路由、页面标题和顶部入口统一指向个人中心       |
| DTO / contract naming  | `auth/profile` 已有正式契约，但页面未消费         | 个人中心页直接消费 `SanitizedUserWithOrgUnits`       |
| Identifier semantics   | 无新增 drift                                      | 沿用现有 `currentUser.id / username / orgUnits` 事实 |
| Status machine         | 无新增 drift                                      | 不新增业务状态，仅修正入口语义                       |

## 4. 当前阻断结论

- Current Gate: `G3`
- Blocking Findings:
  1. `/profile` 页面语义与导航 SSOT 不一致。
  2. 顶部用户菜单仍保留与正式产品无关的占位项。
- Why parent task cannot be closed:
  - 若不修正，个人中心入口不能作为正式导航基线被后续前端与人工测试可靠依赖。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 新增独立个人中心页，展示当前登录用户的账户、组织、角色和权限摘要。
  2. `/profile` 路由改为加载独立个人中心页。
  3. 顶部用户菜单改为真实“个人中心 / 退出登录”动作。
  4. 回写导航设计、路由对照表与 tracker。
- 本批未修复范围:
  1. 旧 `user-management` 模板页的全量文件清理。
  2. 当前用户自助编辑、头像上传等新增命令。

| Concern             | Before                                         | After                          | Result  |
| ------------------- | ---------------------------------------------- | ------------------------------ | ------- |
| `/profile` 页面承载 | 复用 `user-management` 路由树                  | 独立 `CurrentUserProfile` 页面 | `fixed` |
| 顶部用户菜单        | `Profile / Settings / Calendar / Inbox` 占位项 | “个人中心 / 退出登录”正式动作  | `fixed` |
| 导航文档状态        | 仍写成“已有 `/profile/*` 体系”                 | 明确为独立个人中心页           | `fixed` |

## 6. 测试与校验

| Check                    | Required | Command / Evidence                                                                                                                            | Result         | Gap / Reason                                   |
| ------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| Lint                     | `yes`    | `corepack pnpm nx lint poms-admin`                                                                                                            | `pass`         | 2026-04-20 通过                                |
| Build                    | `yes`    | `corepack pnpm nx build poms-admin`                                                                                                           | `pass`         | 2026-04-20 通过                                |
| Unit tests               | `yes`    | `corepack pnpm nx test poms-admin --runInBand`                                                                                                | `pass`         | 2026-04-20 通过                                |
| Browser E2E / smoke      | `yes`    | `corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts --grep "admin can reach the platform governance pages"` | `pass`         | 2026-04-20 先执行 `poms-api:seeder-run` 后通过 |
| API / integration tests  | `no`     | N/A                                                                                                                                           | `not required` | 前端纠偏，不改 API                             |
| OpenAPI / client diff    | `no`     | N/A                                                                                                                                           | `not required` | 无 API surface 变化                            |
| Migration / schema check | `no`     | N/A                                                                                                                                           | `not required` | 无持久化变化                                   |

## 7. 残余阻断与后续切片

- 已解除的阻断:
  - `/profile` 与个人中心语义错位。
  - 顶部用户菜单占位项误导。
- 仍存在的阻断:
  1. 旧 `user-management` 模板文件仍在仓库中保留历史引用，不代表正式入口。
- 后续子切片:
  1. 如需“当前用户自助编辑资料”，另起前端 / command 治理切片。
  2. 如需彻底删除旧 `/profile/*` 模板残留，另起清理切片并确认是否影响历史 smoke。

## 8. 例外与风险

| Exception ID | Level | Scope                                                  | Approved By | Cleanup Owner | Cleanup Due  | Notes                             |
| ------------ | ----- | ------------------------------------------------------ | ----------- | ------------- | ------------ | --------------------------------- |
| `FE-13-E1`   | `E1`  | 保留旧 `user-management` 模板文件但不再挂到 `/profile` | `Codex`     | `Codex`       | `2026-05-15` | 已由 `FE-14` 于 `2026-04-20` 关闭 |

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-20`
- Conditions:
  - 以 lint / build / unit / browser smoke 全部通过为最终 close-out 证据。
