# FE-29 EX17-E2 浏览器验证与 G4 收口 G3 Checkpoint

- Gate Status: `Pass`
- Parent: `EX-17`
- Owner: `Codex`
- Slice Type: `frontend-e2e / validation`
- G3 Date: `2026-04-25`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-29`

## 1. 本地交付范围

- 新增 `apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts`。
- 覆盖 admin 登录后从左侧菜单进入“线索管理”。
- 覆盖 admin 从“项目管理”页点击“从线索创建项目”进入 `/leads`，且页面不再暴露“新建项目”主按钮。
- 覆盖 UI 登记线索、确认有效、转入项目、跳转项目详情。
- 覆盖项目详情显示来源线索摘要和“已转项目”状态。
- 覆盖 viewer 看不到线索菜单，直接访问 `/leads` 被送到 `/auth/access`。
- 覆盖 anonymous 直接访问 `/leads` 被送到登录页，并在登录后回到 `/leads`。

## 2. 明确未覆盖

- 不新增业务 runtime。
- 不删除后端 `POST /projects` legacy/dev/test route。
- 不重跑全部 project workspace 浏览器套件。
- 不在未提交状态下写 G4 close-out；`FE-27/28/29` 的 G4 必须等提交 SHA。

## 3. G1 对齐检查

| Checkpoint                | Result | Notes                                                          |
| ------------------------- | ------ | -------------------------------------------------------------- |
| G1 baseline exists        | Pass   | `fe-29-lead-bootstrap-browser-validation-baseline.md` 已归档。 |
| Menu entry evidence       | Pass   | admin 从菜单点击“线索管理”进入 `/leads`。                      |
| Project button evidence   | Pass   | admin 从项目页点击“从线索创建项目”进入 `/leads`。              |
| UI conversion evidence    | Pass   | 创建 -> 有效化 -> 转项目 -> 项目详情均由浏览器动作触发。       |
| Permission evidence       | Pass   | viewer / anonymous 均有浏览器证据。                            |
| Legacy create UX closure  | Pass   | 项目页无“新建项目”主按钮。                                     |
| Parent exception boundary | Pass   | `EX17-E2` 已具备关闭证据，但等待提交后 G4。                    |

## 4. 验证证据

| Check                 | Command / Evidence                                                                                                                                                   | Result                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| E2E lint              | `corepack pnpm nx run poms-admin-e2e:eslint:lint`                                                                                                                    | Pass                                                         |
| Seeder refresh        | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                           | Pass                                                         |
| Focused browser E2E   | `POMS_E2E_PORT_SEED=530 corepack pnpm exec playwright test apps/poms-admin-e2e/src/lead-bootstrap.journey.spec.ts --config apps/poms-admin-e2e/playwright.config.ts` | Pass, 3 tests                                                |
| First browser attempt | `POMS_E2E_PORT_SEED=529 ... lead-bootstrap.journey.spec.ts`                                                                                                          | Failed before seeder refresh; admin menu lacked `线索管理`.  |
| Admin unit/build      | Existing `FE-28` evidence                                                                                                                                            | Pass                                                         |
| API E2E               | Existing `EX-32` evidence                                                                                                                                            | Not required for `FE-29`; this slice validates browser path. |

## 5. Drift / Exception 判断

| ID                                    | Classification                    | Scope                                                                                  | Decision                         | Owner | Cleanup Due |
| ------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------- | ----- | ----------- |
| `FE29-D1-SEED-PREREQUISITE`           | validation-prerequisite-missing   | 第一次 focused Playwright 未先跑 seeder，DB 中导航权限基线旧，admin 菜单无“线索管理”。 | Closed by seeder refresh + retry | Codex | `FE-29` G3  |
| `FE29-E1-BROWSER-SCOPE-FOCUSED`       | accepted exception                | 本片只跑 Lead bootstrap focused E2E，不跑全部浏览器套件。                              | Accepted                         | Codex | `FE-29` G3  |
| `FE28-E2-BROWSER-JOURNEY-DEFERRED`    | closed by FE-29                   | 登录后菜单 / 项目管理按钮 / 直接 URL 的完整浏览器矩阵。                                | Closed                           | Codex | `FE-29` G3  |
| `EX32-E1-LEGACY-PROJECT-CREATE-ROUTE` | accepted legacy runtime exception | `POST /projects` route 仍保留给 legacy/dev/test。                                      | UX closed; route remains         | Codex | `FE-29` G4  |
| `EX17-E2-LEAD-BOOTSTRAP`              | ready for G4 close                | 浏览器证据已证明正式前端用户入口改为 Lead -> Project。                                 | Close at G4 after commit         | Codex | `FE-29` G4  |

## 6. G3 结论

- `FE-29` runtime/evidence boundary matches the G1 baseline.
- `FE27-E2-BROWSER-JOURNEY-DEFERRED` 和 `FE28-E2-BROWSER-JOURNEY-DEFERRED` 已由本片浏览器证据关闭。
- `EX17-E2-LEAD-BOOTSTRAP` 已具备关闭条件，但不能在未提交状态下写 G4 close-out。
- 下一步:
  1. 跑 markdown / diff hygiene。
  2. 用户提交 `FE-27/28/29` 当前批次。
  3. 根据提交 SHA 写 `FE-27/28/29` G4 close-out，并清理 tracker 中父级例外。
