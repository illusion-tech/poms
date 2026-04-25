# FE-30 业务编号系统生成前端表单与展示收口实施基线

- Gate Status: `Pass`
- Parent: `EX-35`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-30`

## 1. 范围

本次目标:

1. 移除正式前端创建 / 转化入口中对 POMS 内部编号的人工输入和请求提交。
2. 线索页面只展示后端返回的 `leadNo`，登记线索不再要求填写线索编号。
3. 项目页面只展示后端返回的 `projectNo`，项目创建 / 线索转项目只允许填写 optional `customerProjectNo`。
4. 合同页面只展示后端返回的 POMS 内部 `contractNo`，新建 / 编辑合同允许维护 optional `customerContractNo`。
5. 招投标 / 商务竞标读侧展示 optional `tenderNo` / `bidPackageNo`，帮助用户区分 POMS 项目编号和客户 / 招标外部编号。
6. 补前端单测，证明请求 body 不再包含 POMS 内部线索 / 项目 / 合同编号，并覆盖外部编号展示。

本次明确不做:

1. 不新增或修改后端 API、DTO、OpenAPI 或 generated client。
2. 不新增编号管理后台、sequence 重置、人工补号、跳号审计视图。
3. 不把 `customerProjectNo` / `customerContractNo` / `tenderNo` / `bidPackageNo` 做全局唯一校验。
4. 不新增完整招投标 / 商务竞标写入页面；当前前端只有读侧工作区，写入体验需独立切片。
5. 不重构合同创建的项目选择方式；当前仍沿用项目 UUID 输入，后续可由合同 UX 切片治理。

下游可依赖的交付边界:

- 前端用户不能再从正式 UI 手工填写 POMS 内部线索号、项目号或合同号。
- 前端展示用语区分“POMS / 系统编号”和“客户 / 招标外部编号”。
- `FE-31` 可在归档前端切片中继续消费 `projectNo` / 外部编号展示语义，不需要兼容旧 `projectCode` / `leadCode`。

不允许下游依赖的留白:

- 不得认为系统已有完整编号管理后台。
- 不得认为投标商务写入体验已完成；本片只收口已有读侧和现有合同 / 线索 / 项目表单。

## 2. 正式输入

| Input Type                | Document / Source                                                                        | Section / Anchor                            | Status | Notes                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- | ------ | ------------------------------------------------------------- |
| Business design           | `docs/design/archive/slices/ex-35-business-number-generation-governance-baseline.md`     | 编号分类原则 / 外部编号字段边界             | Pass   | 冻结 POMS 内部编号由系统生成，外部编号 optional。             |
| Runtime input             | `docs/design/archive/slices/ex-35a-business-number-generation-runtime-g3-g4-closeout.md` | G4 结论                                     | Pass   | 后端、契约、OpenAPI、generated client 已完成 direct cutover。 |
| Lead frontend input       | `docs/design/archive/slices/fe-27-lead-entry-list-frontend-baseline.md`                  | Lead list / create                          | Pass   | 线索入口和表单已存在。                                        |
| Lead conversion input     | `docs/design/archive/slices/fe-28-lead-to-project-frontend-baseline.md`                  | Convert dialog                              | Pass   | 线索转项目入口已存在。                                        |
| Project frontend input    | `docs/design/archive/slices/fe-16a-project-list-entry-create-frontend-baseline.md`       | Project list / create                       | Pass   | 项目列表和 direct create legacy 入口仍存在。                  |
| Table / form UI baseline  | `apps/poms-admin/src/app/demo/uikit/tabledemo.ts` + Poseidon Dialog / Form patterns      | PrimeNG table / dialog                      | Pass   | 表单和表格继续使用 PrimeNG 组件，不回退原生控件。             |
| DTO / generated client    | `libs/shared/api-client/model/*.ts`                                                      | `leadNo` / `projectNo` / external no fields | Pass   | 本片只消费 generated client，不新增 wire contract。           |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                                           | Existing routes                             | N/A    | 本片不新增、变更或删除 public API route surface。             |
| Data model / table freeze | `EX-35A`                                                                                 | entity / migration boundary                 | Pass   | 本片不改持久化。                                              |
| Schema / DDL              | `EX-35A` G4                                                                              | migration check passed                      | Pass   | 本片不跑 migration。                                          |

## 3. 本次 SSOT

| Concern                       | SSOT                                                                     | Implementation Rule                                              |
| ----------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Business semantics            | `EX-35` governance baseline                                              | POMS 内部编号后端生成、前端只读；外部编号用户可选填。            |
| Public route canonical path   | `N/A`                                                                    | 不新增或改 route。                                               |
| Route / command naming        | generated client methods                                                 | 继续调用现有 create / update / convert 方法。                    |
| DTO / contract naming         | generated client DTO                                                     | 表单字段只映射到 DTO 已存在字段，不新造 wire contract。          |
| Table / column naming         | `EX-35A` entity / migration                                              | 前端不关心 DB column，只使用 contract 字段。                     |
| Date / time semantics         | existing frontend behavior                                               | 不改变日期输入和展示。                                           |
| Identifier semantics          | `leadNo` / `projectNo` / `contractNo`                                    | 这些是系统编号，只读展示；不得出现在 create 表单必填输入里。     |
| External identifier semantics | `customerProjectNo` / `customerContractNo` / `tenderNo` / `bidPackageNo` | 可为空，trim 后空字符串转 `null` / `undefined`，不做唯一性承诺。 |
| Money / decimal semantics     | existing contract amount behavior                                        | 不改变 `signedAmount` 校验。                                     |
| Status machine                | existing Lead / Project / Contract states                                | 不改变状态机，只改表单字段和展示。                               |

## 4. 命令与接口边界

| Route / Controller                                       | Frontend Command / Store                           | Request DTO / Contract                               | Response DTO / Contract                                    | Guard / Permission                  | Design Source | Result |
| -------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- | ------------- | ------ |
| `POST /api/leads`                                        | `LeadStore.createLead`                             | `CreateLeadRequest` without internal no              | `LeadSummary` / `leadNo`                                   | `lead:write` button visibility      | `EX-35A`      | Frozen |
| `POST /api/leads/{id}:convertToProject`                  | `LeadStore.convertLeadToProject`                   | `ConvertLeadToProjectRequest.customerProjectNo?`     | `ProjectSummary.projectNo` / `customerProjectNo`           | `lead:write` + qualified state      | `EX-35A`      | Frozen |
| `POST /api/projects`                                     | `ProjectStore.createProject`                       | `CreateProjectRequest.customerProjectNo?`            | `ProjectSummary.projectNo`                                 | `project:write` legacy/dev entry    | `EX-35A`      | Frozen |
| `POST /api/contracts`                                    | `ContractStore.createContract`                     | `CreateContractRequest.customerContractNo?`          | `ContractSummary.contractNo` / `customerContractNo`        | existing contract create visibility | `EX-35A`      | Frozen |
| `PATCH /api/contracts/{id}`                              | `ContractStore.updateContract`                     | `UpdateContractBasicInfoRequest.customerContractNo?` | `ContractDetailView.customerContractNo`                    | existing edit visibility            | `EX-35A`      | Frozen |
| `GET /api/projects/{projectId}/bid-commercial-workspace` | `ProjectWorkspaceStore.loadBidCommercialWorkspace` | `N/A`                                                | `ProjectBidCommercialProcessSummary.tenderNo/bidPackageNo` | `project:read` workspace route      | `EX-35A`      | Frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): no route changes in this slice
- Current implemented route(s): existing generated client calls only
- Inventory status: `N/A`
- Route governance source: `EX-35A` confirms no new route needed for frontend cutover
- Blocker / exception: none for route governance

## 5. 读侧边界

| Query / View                             | Consumer                      | Fields                                                   | Filter / Sort                         | Permission Boundary                | Design Source | Result |
| ---------------------------------------- | ----------------------------- | -------------------------------------------------------- | ------------------------------------- | ---------------------------------- | ------------- | ------ |
| `LeadListView` / `LeadDetailView`        | `/leads`                      | `leadNo`                                                 | table global filter includes `leadNo` | `lead:read`                        | `FE-27`       | Frozen |
| `ProjectListView` / `ProjectDetailView`  | `/projects`, project detail   | `projectNo`, `customerProjectNo`                         | table global filter includes both     | `project:read`                     | `FE-16A`      | Frozen |
| `ContractSummary` / `ContractDetailView` | `/contracts`, contract detail | `contractNo`, `customerContractNo`                       | table global filter must include both | existing contract read permissions | `EX-35A`      | Frozen |
| `ProjectBidCommercialWorkspaceView`      | bid commercial workspace      | `currentProcess.tenderNo`, `currentProcess.bidPackageNo` | read-only fact grid                   | `project:read`                     | `EX-35A`      | Frozen |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| `N/A` | `N/A`     | `N/A`               | `EX-35A`            | 本片不改持久化。 |

| Field                | Design Type / Meaning | Migration / DDL | Entity / Contract Source | Frontend Rule                                      | Result |
| -------------------- | --------------------- | --------------- | ------------------------ | -------------------------------------------------- | ------ |
| `leadNo`             | POMS 系统线索编号     | `EX-35A`        | generated client         | read-only display; never input                     | Frozen |
| `projectNo`          | POMS 系统项目编号     | `EX-35A`        | generated client         | read-only display; never input                     | Frozen |
| `contractNo`         | POMS 系统合同编号     | `EX-35A`        | generated client         | read-only display; never input                     | Frozen |
| `customerProjectNo`  | 客户项目编号          | `EX-35A`        | generated client         | optional input where project create/convert exists | Frozen |
| `customerContractNo` | 客户合同编号          | `EX-35A`        | generated client         | optional input in contract create/edit             | Frozen |
| `tenderNo`           | 招标编号              | `EX-35A`        | generated client         | read-side display in existing bid workspace        | Frozen |
| `bidPackageNo`       | 标段 / 包件编号       | `EX-35A`        | generated client         | read-side display in existing bid workspace        | Frozen |

## 7. 一致性结论

- Document -> code: `EX-35/35A` 已冻结编号语义，FE-30 只做产品级前端收口。
- ADR-015 inventory -> route: 不触碰 public route surface。
- Migration -> entity: 不适用，本片不改持久化。
- Entity -> contract: 消费 `EX-35A` generated client 已有字段。
- Route -> command: 继续使用现有 store 和 generated client commands。
- Query -> view: 列表、详情和工作区展示字段与 generated DTO 对齐。
- Guard / permission: 不新增权限；按钮显隐沿用现有 read/write 权限。
- OpenAPI / generated client: 不需要重新生成；如实现发现 DTO 缺口，必须回退到后端治理切片。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                | Result       | Gap / Reason                             |
| -------------------------------- | -------- | --------------------------------------------------------------------------------- | ------------ | ---------------------------------------- |
| Lint                             | yes      | `corepack pnpm nx lint poms-admin`                                                | pending G3   | frontend-only touched admin.             |
| Build                            | yes      | `corepack pnpm nx build poms-admin`                                               | pending G3   | generated DTO and templates touched.     |
| Unit tests                       | yes      | focused feature specs; `corepack pnpm nx test poms-admin --runInBand`             | pending G3   | request shape and display behavior.      |
| API / integration tests          | no       | `N/A`                                                                             | not required | No API runtime change.                   |
| E2E / browser journey            | yes      | local browser or Playwright smoke for logged-in menu / button path where feasible | pending G3   | product-level frontend slice.            |
| OpenAPI generation / client diff | no       | `N/A`                                                                             | not required | Only consumes existing generated client. |
| Migration / schema check         | no       | `N/A`                                                                             | not required | No persistence change.                   |
| Markdown format                  | yes      | `corepack pnpm run format:md:check`                                               | pending G3   | docs touched.                            |
| Diff hygiene                     | yes      | `git diff --check`                                                                | pending G3   | required before close-out.               |

## 9. 例外与风险

| Exception ID                               | Level | Scope                                                                | Approved By | Cleanup Owner | Cleanup Due                       | Notes                                                                      |
| ------------------------------------------ | ----- | -------------------------------------------------------------------- | ----------- | ------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `FE30-E1-BID-WRITE-ENTRY-DEFERRED`         | E1    | 当前招投标 / 商务竞标前端只有读侧工作区，没有 create/edit 过程表单。 | Codex       | Codex         | future bid commercial write UX G1 | 本片展示 `tenderNo` / `bidPackageNo`；不为编号字段临时新造完整竞标录入流。 |
| `FE30-E2-CONTRACT-PROJECT-PICKER-DEFERRED` | E1    | 合同创建仍使用项目 UUID 输入，不在本片改造成项目选择器。             | Codex       | Codex         | future contract UX G1             | 本片只改编号语义，避免把合同项目选择体验混入编号收口。                     |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-26`
- Conditions:
  1. 不新增后端 API / generated client。
  2. 前端不得提交 `leadNo`、`projectNo`、`contractNo` 作为创建输入。
  3. 外部编号必须以可选、可为空、业务文案明确的形式进入 UI。
  4. 若发现 generated client 缺字段，不在前端绕过，转回后端治理切片。
