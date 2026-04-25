# FE-30 业务编号系统生成前端表单与展示收口 G3/G4 Close-out

- Gate Status: `G3 = Pass`, `G4 = Pass`
- Parent: `EX-35`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- G4 Reviewer: `Codex`
- Close-out Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-30`

## 1. 交付边界

本片已交付:

1. 线索登记与线索列表继续使用 `leadNo` 只读展示，登记线索不提交 POMS 内部编号。
2. 线索转项目与项目创建继续只提交 optional `customerProjectNo`，不提交 POMS 内部 `projectNo`。
3. 项目详情展示 `POMS 项目编号` 与 `客户项目编号`，编辑基本信息时可维护 optional `customerProjectNo`。
4. 合同列表和合同详情区分 `POMS 合同编号` 与 `客户合同编号`。
5. 新建合同不再填写 / 提交内部 `contractNo`；编辑合同可维护 optional `customerContractNo`。
6. 招投标 / 商务竞标工作区展示 `tenderNo` 与 `bidPackageNo`。
7. 登录后浏览器 journey 已覆盖从菜单 / 项目入口进入线索、登记线索、确认有效、转项目、客户项目编号展示、只读用户直达拦截和匿名 returnUrl。

本片未交付:

1. 编号管理后台、sequence 重置、人工补号、跳号审计视图。
2. 完整招投标 / 商务竞标 create/edit 前端写入体验。
3. 合同创建时的项目选择器；当前仍沿用项目 UUID 输入。
4. 后端 API / DTO / OpenAPI / generated client 变更。

## 2. Drift 与纠偏记录

| Drift ID                             | Classification   | Finding                                                      | Resolution                                                                                | Result   |
| ------------------------------------ | ---------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------- |
| `FE30-D1-LEAD-E2E-OLD-NO-INPUT`      | `new-real-drift` | `lead-bootstrap` 浏览器旅程仍填写线索编号和项目编号。        | 改为断言内部编号输入不存在，登记线索只填标题 / 客户 / 来源，转项目只填客户项目编号。      | Resolved |
| `FE30-D2-PROJECT-DETAIL-CUSTOMER-NO` | `new-real-drift` | 线索转项目已提交 `customerProjectNo`，但项目详情没有展示。   | 项目详情新增 POMS 项目编号 / 客户项目编号卡片，并允许编辑 basic info 时维护客户项目编号。 | Resolved |
| `FE30-D3-CONTRACT-INTERNAL-NO-INPUT` | `new-real-drift` | 合同创建表单仍要求用户填写 `contractNo`。                    | 新建合同去掉内部合同号输入，改为系统生成提示和 optional `customerContractNo`。            | Resolved |
| `FE30-D4-BID-EXTERNAL-NO-HIDDEN`     | `new-real-drift` | 后端已有 `tenderNo` / `bidPackageNo`，前端竞标工作区未展示。 | 竞标过程 fact grid 新增招标编号和标段 / 包件编号。                                        | Resolved |

## 3. 验证结果

| Check                   | Required    | Command / Evidence                                                                                                  | Result                                     | Notes                                                                                                  |                                                                                 |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Admin lint              | Yes         | `corepack pnpm nx lint poms-admin`                                                                                  | Passed                                     | All files pass linting.                                                                                |                                                                                 |
| Admin build             | Yes         | `corepack pnpm nx build poms-admin`                                                                                 | Passed                                     | Production build passed.                                                                               |                                                                                 |
| Admin unit tests        | Yes         | `corepack pnpm nx test poms-admin --runInBand`                                                                      | Passed                                     | `22` suites / `94` tests.                                                                              |                                                                                 |
| Focused component tests | Yes         | `contract-list`, `contract-detail`, `project-detail`, `project-bid-commercial-workspace` focused specs              | Passed                                     | Covered request shape and display changes.                                                             |                                                                                 |
| Browser journey         | Yes         | `POMS_E2E_PORT_SEED=431 POMS_E2E_LOOPBACK_HOST=127.0.0.1 playwright ... lead-bootstrap.journey.spec.ts --workers=1` | Passed                                     | `3` tests: menu / button path, viewer denial, anonymous returnUrl.                                     |                                                                                 |
| Full admin E2E          | Best effort | `corepack pnpm nx e2e poms-admin-e2e`                                                                               | Partial / tool-env                         | First two runs exposed FE-30 drifts and were fixed; final full run hit local `EADDRINUSE` / `ENOBUFS`. |                                                                                 |
| Seeder / migration      | Support     | `corepack pnpm nx run poms-api:seeder-run`                                                                          | Passed after cleanup                       | Required to confirm DB recovered after E2E resource exhaustion.                                        |                                                                                 |
| Legacy input scan       | Yes         | `rg -F "createForm.contractNo"`; `rg -F "id=\"contractNo\""`; `rg "leadCode\                                        | projectCode"` on admin app/data-access/e2e | Passed                                                                                                 | No internal no create-form leftovers; e2e helper naming updated to `projectNo`. |
| Markdown format         | Yes         | `corepack pnpm run format:md:check`                                                                                 | Pending final check                        | Run after close-out doc format.                                                                        |                                                                                 |
| Diff hygiene            | Yes         | `git diff --check`                                                                                                  | Pending final check                        | Run after close-out doc format.                                                                        |                                                                                 |

## 4. 例外处理

| Exception ID                               | Status      | Scope                                                                | Resolution / Transfer                                                                           |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `FE30-E1-BID-WRITE-ENTRY-DEFERRED`         | Transferred | 当前招投标 / 商务竞标前端只有读侧工作区，没有 create/edit 过程表单。 | 本片展示 `tenderNo` / `bidPackageNo`；完整写入体验转入 future bid commercial write UX G1。      |
| `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` | Transferred | 合同创建仍使用项目 UUID 输入。                                       | 本片只改编号语义；项目选择器转入 future contract UX G1。                                        |
| `FE30-E3-FULL-E2E-LOCAL-RESOURCE`          | Closed      | 全量 `poms-admin-e2e` 第三次运行遇到本地端口 / DB 连接资源耗尽。     | 清理残留 Playwright 进程后 DB seed 恢复；目标 `lead-bootstrap` journey 单 worker 独立端口通过。 |

## 5. G4 结论

- `FE-30` 可标记 `Done`。
- 下游前端不得再把 `leadNo`、`projectNo`、`contractNo` 当成用户输入字段。
- 客户 / 招标外部编号继续作为 optional 用户维护字段，不能替代 POMS 系统编号。
- `FE-31` 可继续进入项目归档撤销 / 替代前端入口，不需要兼容旧 `leadCode` / `projectCode` 或手填内部合同号。
