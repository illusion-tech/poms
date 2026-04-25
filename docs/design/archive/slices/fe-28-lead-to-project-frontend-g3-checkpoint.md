# FE-28 从有效线索创建项目的前端转化体验 G3 Checkpoint

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-28`

## 1. 本地交付范围

- `LeadStore` 新增 `convertLeadToProject`，直接消费 generated client `LeadApi.leadControllerConvertToProject`。
- `/leads` 在线索列表行操作和详情弹窗中新增“转入项目”动作。
- 转化动作只对 `qualified` 且未转化的线索可见，并继续受 `lead:write` 控制。
- 转化弹窗收集项目编号、项目名称和预计签约日期，提交 `ConvertLeadToProjectRequest`。
- 转化成功后关闭弹窗并跳转到返回的 `ProjectSummary.id` 项目详情。
- 项目列表的正式可见入口从“新建项目”改为“从线索创建项目”，直接 Project create UI 不再作为主入口暴露。
- 项目详情展示 `sourceLeadSummary`，让用户能追溯项目来源线索。

## 2. 明确未覆盖

- 不新增或修改后端 API。
- 不删除 `POST /projects` legacy/dev/test route，也不删除 `ProjectStore.createProject` 兼容方法。
- 不做登录后菜单 / 按钮 / 直接 URL 的完整浏览器矩阵；归属 `FE-29`。
- 不关闭父级 `EX17-E2-LEAD-BOOTSTRAP`，最终关闭仍归属 `FE-29`。

## 3. G1 对齐检查

| Checkpoint                  | Result | Notes                                                                  |
| --------------------------- | ------ | ---------------------------------------------------------------------- |
| G1 baseline exists          | Pass   | `fe-28-lead-to-project-frontend-baseline.md` 已归档。                  |
| No new backend API          | Pass   | 只消费 `EX-32` 已生成的 `leadControllerConvertToProject`。             |
| Permission boundary         | Pass   | route 继续 `lead:read`，转化动作使用 `lead:write` + `qualified` 状态。 |
| Project creation UX closure | Pass   | 项目列表不再暴露“新建项目”主按钮，改为线索转项目入口。                 |
| Project source explanation  | Pass   | 项目详情新增来源线索摘要。                                             |
| FE-28 -> FE-29 boundary     | Pass   | 浏览器 journey 与 legacy route 最终清理仍显式留给 `FE-29`。            |

## 4. 验证证据

| Check                  | Command / Evidence                                                                                                              | Result                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Focused admin tests    | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=lead-list.spec.ts project-list.spec.ts project-detail.spec.ts` | Pass                                                |
| Project detail tests   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=project-detail.spec.ts`                                        | Pass                                                |
| Full admin tests       | `corepack pnpm nx test poms-admin --runInBand`                                                                                  | Pass                                                |
| Admin lint             | `corepack pnpm nx lint poms-admin`                                                                                              | Pass                                                |
| Data-access lint       | `corepack pnpm nx lint admin-data-access`                                                                                       | Pass                                                |
| Admin build            | `corepack pnpm nx build poms-admin`                                                                                             | Pass                                                |
| API tests / build      | `N/A`                                                                                                                           | Not required; no backend runtime change in `FE-28`. |
| OpenAPI / client check | `N/A`                                                                                                                           | Not required; no contract change in `FE-28`.        |
| Browser E2E            | `FE-29`                                                                                                                         | Deferred by baseline exception.                     |

## 5. Drift / Exception 判断

| ID                                         | Classification     | Scope                                                                 | Decision  | Owner | Cleanup Due |
| ------------------------------------------ | ------------------ | --------------------------------------------------------------------- | --------- | ----- | ----------- |
| `FE28-E1-LEGACY-PROJECT-CREATE-ROUTE-OPEN` | accepted exception | `POST /projects` route 和 `ProjectStore.createProject` 仍为兼容路径。 | Keep open | Codex | `FE-29` G4  |
| `FE28-E2-BROWSER-JOURNEY-DEFERRED`         | accepted exception | 登录后从菜单 / 项目管理按钮 / 直接 URL 的完整浏览器矩阵未在本片完成。 | Keep open | Codex | `FE-29` G4  |
| `FE27-E1-NO-CONVERT-ACTION`                | closed by FE-28    | `FE-27` 未提供转项目动作。                                            | Closed    | Codex | `FE-28` G3  |
| `EX17-E2-LEAD-BOOTSTRAP`                   | parent still open  | 端到端用户路径尚未由浏览器证据证明完整替代直接 Project create。       | Keep open | Codex | `FE-29` G4  |

## 6. G3 结论

- `FE-28` runtime boundary matches the G1 baseline.
- 本片可以本地进入 `G3 = Pass`，但不能进入 `G4`，因为 runtime 和 checkpoint 尚未提交。
- 下一步:
  1. 用户提交当前 `FE-27/FE-28` 变更。
  2. 基于提交 SHA 写 `FE-27` / `FE-28` G4 close-out。
  3. 进入 `FE-29`，完成登录后浏览器 journey 和父级 `EX17-E2-LEAD-BOOTSTRAP` 关闭证据。
