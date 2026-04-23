# FE-15 个人中心自助编辑资料前端实施基线包

- Gate Status: `Pass`
- Parent: `FE-15`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Solo worktree checkpoint`
- G1 Date: `2026-04-21`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-15`

---

## 1. 范围

- 本次目标:
  1. 在 `/profile` 的“账户信息”区域增加“编辑资料”入口。
  2. 以前端单页内 dialog 落地 `displayName / email / phone` 编辑表单。
  3. 成功后以 `PATCH /auth/profile` 返回值刷新 `AuthStore.currentUser`，同步个人中心页与顶部身份区。
  4. 补齐前端 unit / browser smoke，并回写 tracker 与基线结果。
- 本次明确不做:
  1. 不新增新的前端叶子路由，例如 `/profile/edit`。
  2. 不开放 `avatarUrl`、`username`、角色、组织、权限的自助编辑。
  3. 不实现验证码、密码修改、头像上传或草稿自动保存。
  4. 不改动平台用户管理页的管理员编辑能力。
- 下游可依赖的交付边界:
  1. 已登录用户可在 `/profile` 直接编辑 `displayName / email / phone`。
  2. 保存成功后 `AuthStore.currentUser`、个人中心页和顶部身份区立即一致。
  3. 留空 `email / phone` 会按 `null` 提交，不保留前端伪值。

---

## 2. 正式输入

| Input Type            | Document / Source                                        | Section / Anchor          | Status   | Notes                                                |
| --------------------- | -------------------------------------------------------- | ------------------------- | -------- | ---------------------------------------------------- |
| Business design       | `platform-governance/profile-self-service-design.md`     | `5.4` ~ `7.4`, `8`, `9`   | Accepted | 字段范围、交互方式、保存后刷新语义已冻结             |
| Business design       | `platform-governance/navigation-design.md`               | `my_profile` / `/profile` | Accepted | `/profile` 继续作为个人中心唯一入口                  |
| Query boundary        | `query-view-boundary-design.md`                          | `CurrentUserProfileView`  | Accepted | 继续消费 `SanitizedUserWithOrgUnits`                 |
| API baseline          | `ex-16-current-user-profile-self-service-baseline.md`    | `4`, `5`, `7`, `8`        | Accepted | `PATCH /auth/profile` 已完成落地，可作为正式前端写侧 |
| Corrective checkpoint | `fe-13-personal-center-profile-corrective-checkpoint.md` | `5`, `6`, `7`             | Accepted | `/profile` 已收口为独立个人中心页，不再回退到旧模板  |

---

## 3. 本次 SSOT

| Concern             | SSOT                                                      | Implementation Rule                                          |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Page entry          | `/profile`                                                | 不新增新路由，编辑交互在当前页内完成                         |
| Read model          | `AuthStore.currentUser` / `GET /auth/profile`             | 页面与顶部身份区都从同一 signal 读取                         |
| Write model         | `PATCH /auth/profile` / `UpdateCurrentUserProfileRequest` | 前端不调用管理员 `PATCH /platform/users/{id}`                |
| Editable fields     | `displayName`、`email`、`phone`                           | 其余字段只读展示                                             |
| Contact clearing    | blank -> `null`                                           | 邮箱/手机允许清空，不保留空字符串                            |
| Post-save sync      | response `SanitizedUserWithOrgUnits`                      | 成功后必须覆盖 `AuthStore.currentUser`，不能只改本地页面副本 |
| Validation boundary | field-local validation + backend error fallback           | 字段错误原位展示，提交失败保留表单内容                       |

---

## 4. 前端边界

| Surface         | Current State                            | Target State                                 | Result |
| --------------- | ---------------------------------------- | -------------------------------------------- | ------ |
| `/profile` page | 只读展示当前用户资料                     | 增加 dialog 编辑入口与保存态                 | Pass   |
| `AuthStore`     | 只负责 login / initialize / refreshTodos | 增加当前用户资料更新方法并刷新 `currentUser` | Pass   |
| Topbar identity | 读取 `AuthStore.currentUser`             | 保持现有读法，依赖 signal 刷新自动同步       | Reuse  |
| Route           | `/profile`                               | 保持不变                                     | Reuse  |

---

## 5. 测试与校验计划

| Check                    | Required | Command / Evidence                                                                                                                                               | Result | Gap / Reason                                                              |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Lint                     | Yes      | `corepack pnpm nx lint poms-admin`；`corepack pnpm nx lint admin-data-access`                                                                                    | Pass   | `poms-admin` 与依赖的 `admin-data-access` 均通过                          |
| Build                    | Yes      | `corepack pnpm nx build poms-admin`                                                                                                                              | Pass   | production build 通过                                                     |
| Unit tests               | Yes      | `corepack pnpm nx test poms-admin --runInBand`                                                                                                                   | Pass   | 4 suites / 15 tests，覆盖 `AuthStore` 与 `/profile` 页面新行为            |
| Browser smoke            | Yes      | `corepack pnpm nx run poms-api:seeder-run`；`corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts --grep "profile self-service"` | Pass   | seeded 数据下验证登录、编辑、保存、页面回显、验证标记回退与顶部身份区同步 |
| API / integration tests  | No       | `N/A`                                                                                                                                                            | `N/A`  | 后端写侧已由 `EX-16` 覆盖                                                 |
| OpenAPI / client diff    | No       | `N/A`                                                                                                                                                            | `N/A`  | 本切片消费既有 generated client                                           |
| Migration / schema check | No       | `N/A`                                                                                                                                                            | `N/A`  | 无持久化变化                                                              |

---

## 6. G1 结论

- Gate Status: `Pass`
- Approved By: `Solo worktree checkpoint`
- Approved At: `2026-04-21`
- Conditions:
  1. `AuthStore.currentUser` 必须是个人中心和顶部身份区的唯一前端事实源。
  2. `email / phone` 允许清空，但提交时必须归一为 `null`。
  3. `avatarUrl` 继续只读展示，不得在本片偷带开放编辑。
