# FE-33 合同创建项目选择器与合同上下文体验 G3 检查点

- Gate Status: `G3 = Pass / G4 Pending Commit`
- Parent: `FE-30`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G3 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-33`

## 1. 交付边界

已完成:

1. 合同创建弹窗已从原生项目 UUID 输入改为 PrimeNG AutoComplete 项目选择器。
2. 项目选择器消费既有 `ProjectStore.loadProjects()` / `ProjectListView[]`。
3. 选择器支持按项目编号、项目名称、客户、客户项目编号、阶段和状态客户端过滤。
4. 选择项目后展示项目编号、项目名称、客户、客户项目编号、阶段和状态上下文。
5. 创建合同仍只提交 selected project `id`，不提交 `projectNo`、`projectName` 或客户展示字段。
6. focused component tests 覆盖表单展示、项目过滤、创建 request shape。
7. targeted Playwright 覆盖登录后从菜单进入合同管理、打开新建合同、选择项目、创建合同。

未纳入:

1. 未新增 public API、OpenAPI、generated client、DTO、permission key 或 DDL。
2. 未提供合同编辑时改关联项目能力；当前 `UpdateContractBasicInfoRequest` 无 `projectId`。
3. 未新增服务端项目搜索 / 分页 query。
4. 未改变合同创建、审批、激活、资金条款或合同状态流转。

## 2. 一致性检查

| Edge                       | Result | Evidence                                                                                       |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Document -> code           | Pass   | 实现遵循 FE-33 G1 baseline：只替换合同创建项目选择体验，不扩大合同业务范围。                   |
| ADR-015 inventory -> route | Pass   | 本片未新增或修改 public route；只消费既有 `GET /projects` 与 `POST /contracts`。               |
| DTO / contract -> frontend | Pass   | 创建合同 request 仍只提交 `CreateContractRequest.projectId` 和合同字段。                       |
| Query -> view              | Pass   | `ProjectListView` 字段足以支撑项目选择器和上下文展示。                                         |
| Guard / permission         | Pass   | 前端未放宽权限；合同创建与项目列表读取继续依赖既有 route guard / backend permission boundary。 |
| State transition           | Pass   | 前端未改变合同状态流转；仍由合同创建 command 返回 draft contract summary。                     |
| E2E entry chain            | Pass   | Playwright 从“合同管理”菜单进入，不只验证直接 URL。                                            |

## 3. 验证证据

| Check                  | Required | Result | Evidence                                                                                                                                                                              |
| ---------------------- | -------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract list tests    | Yes      | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=contract-list`，4 tests passed                                                                                       |
| Admin lint             | Yes      | Pass   | `corepack pnpm nx lint poms-admin`                                                                                                                                                    |
| Admin build            | Yes      | Pass   | `corepack pnpm nx build poms-admin`                                                                                                                                                   |
| Seeder                 | Yes      | Pass   | `corepack pnpm nx run poms-api:seeder-run`                                                                                                                                            |
| Admin E2E              | Yes      | Pass   | `POMS_E2E_PORT_SEED=768 corepack pnpm exec playwright test --config apps/poms-admin-e2e/playwright.config.ts apps/poms-admin-e2e/src/contract-management.journey.spec.ts --workers=1` |
| Markdown format        | Yes      | Pass   | `corepack pnpm run format:md` / `corepack pnpm run format:md:check`                                                                                                                   |
| Diff whitespace        | Yes      | Pass   | `git diff --check`                                                                                                                                                                    |
| OpenAPI / client check | No       | N/A    | 本片没有 OpenAPI 或 generated client 变更。                                                                                                                                           |
| Migration check        | No       | N/A    | Frontend-only；无 DDL。                                                                                                                                                               |

## 4. Drift 判断

| Item                                      | Classification   | Result                                                                                         |
| ----------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| `FE33-D1-E2E-AUTOCOMPLETE-OPTION-LOCATOR` | `new-real-drift` | 首次 E2E 用 `role=option` 定位 PrimeNG AutoComplete 选项失败；已改为下拉项文本定位并重跑通过。 |
| OpenAPI / generated client                | `N/A`            | 本片只消费 existing generated client，没有 contract drift。                                    |
| Playwright inspector port note            | `tool-noise`     | E2E webServer 输出本地 inspector `9229` 端口占用提示；目标 journey 通过，不影响产品行为。      |
| Bundle warning                            | `N/A`            | `poms-admin` build 通过，未出现新增 bundle warning。                                           |

## 5. 例外处理

| Exception ID                               | G1 Status | G3 Status                        | Notes                                                                                            |
| ------------------------------------------ | --------- | -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` | Open      | Close at G4                      | 合同创建已由项目选择器替代原始 UUID 输入，并补上下文展示和浏览器入口链。                         |
| `FE33-E1-CLIENT-SIDE-PROJECTS`             | Low       | Close at G4 / accepted-by-design | 本片复用现有 `GET /projects` 客户端过滤；当前字段足够，未来规模增长再开服务端搜索 / 分页 query。 |

## 6. G3 结论

- `FE-33` 本地实现已满足 G3。
- 提交后可创建 G3/G4 close-out，将 `FE-33` 标记 `Done`。
- `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` 可由本片在 G4 正式关闭。
