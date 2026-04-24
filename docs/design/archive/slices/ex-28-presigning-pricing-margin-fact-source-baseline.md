# EX-28 签约前报价与毛利评审事实源实施基线包

- Gate Status: `Pass`
- Parent: `FE-11`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-04-24`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` -> `EX-28`

## 1. 范围

- 本次目标: 新增项目级签约前报价与毛利评审事实源、历史集合读取和 current workspace projection，作为 `FE-11` 报价与毛利页的正式输入。
- 本次明确不做: 不实现审批引擎、不生成商业放行基线本体、不做报价明细 BOM / 附件库、不做合同差异重审链、不做前端页面。
- 下游可依赖的交付边界: 下游可读取当前报价、成本版本引用、竞标 / 直接商务路径、税率与税务条件、回款条件、毛利判断、审批摘要引用、商业放行基线引用、阻断原因、下一步和 allowed actions。
- 不允许下游依赖的留白: 不允许前端根据 `ContractReadinessDetail`、`CommercialReleaseBaselineSummary` by-id 或技术成本工作区反推报价评审结论。

## 2. 正式输入

| Input Type                | Document / Source                                           | Section / Anchor                | Status | Notes                                                                  |
| ------------------------- | ----------------------------------------------------------- | ------------------------------- | ------ | ---------------------------------------------------------------------- |
| Business design           | `phase2-presigning-pricing-margin-workspace.md`             | `2` / `3` / `5` / `7` / `8`     | Frozen | 报价评审必须绑定成本、税务、回款条件和毛利判断，并输出签约就绪承接关系 |
| Handoff design            | `phase2-presigning-workspace-handoff-map.md`                | `4.4` / `5` / `6`               | Frozen | 未放行或关键财务 / 税务 / 回款条件未确认时不得进入签约就绪             |
| Permission design         | `phase2-data-permission-and-sensitive-visibility-design.md` | Sensitive visibility boundaries | Frozen | 首版 workspace 只返回摘要级字段，不返回人员级成本或提成敏感字段        |
| Route inventory / ADR-015 | `api-route-canonical-inventory.md`                          | `project` rows for `EX-28`      | Frozen | 新增项目子集合 create/list 与项目级 workspace query view               |
| Query boundary            | `ProjectPricingMarginWorkspaceView`                         | shared contract                 | Frozen | 缺少当前评审时返回业务 gap，不返回页面级 404                           |
| Data model / table freeze | `ProjectPricingMarginReview`                                | 本基线包                        | Frozen | 版本链 current record，历史可追溯                                      |
| Schema / DDL              | migration `ex28_project_pricing_margin_review`              | 本基线包                        | Frozen | review 主表 + condition 子表                                           |

## 3. 本次 SSOT

| Concern                     | SSOT                                                | Implementation Rule                                                       |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Business semantics          | `phase2-presigning-pricing-margin-workspace.md`     | 报价与毛利评审是经营判断，不是单独价格输入                                |
| Public route canonical path | `api-route-canonical-inventory.md` + `ADR-015`      | 使用 `/projects/{projectId}/pricing-margin-*` 项目子资源                  |
| Route / command naming      | `ProjectPricingMarginReview`                        | create/list 用 reviews，current projection 用 workspace                   |
| DTO / contract naming       | shared contract schemas                             | DTO 只包装 shared schemas，不新造 wire contract                           |
| Table / column naming       | migration + entity                                  | `project_pricing_margin_review` / `project_pricing_margin_condition_item` |
| Date / time semantics       | ISO datetime in contracts, `datetime` in DB         | `effectiveAt` / `dueAt` / audit fields 均为时间点                         |
| Identifier semantics        | system UUID                                         | source IDs 仅引用仓内已有 UUID；不承载外部编号                            |
| Money / decimal semantics   | decimal string in contract, `decimal(18,2/8)` in DB | 金额以字符串返回避免 JS 浮点误差；毛利率 / 税率用 decimal string          |
| Status machine              | shared enum constants                               | `effective/superseded` 版本状态；decision 决定是否阻断签约就绪            |

## 4. 命令与接口边界

| Route / Controller                                   | Command / Service                  | Request DTO / Contract                    | Response DTO / Contract             | Guard / Permission | Design Source                            | Result |
| ---------------------------------------------------- | ---------------------------------- | ----------------------------------------- | ----------------------------------- | ------------------ | ---------------------------------------- | ------ |
| `POST /projects/{projectId}/pricing-margin-reviews`  | `createProjectPricingMarginReview` | `CreateProjectPricingMarginReviewRequest` | `ProjectPricingMarginReviewSummary` | `project:write`    | pricing-margin workspace `5.1`-`5.6`     | Frozen |
| `GET /projects/{projectId}/pricing-margin-reviews`   | `listProjectPricingMarginReviews`  | N/A                                       | `ProjectPricingMarginReviewList`    | `project:read`     | pricing-margin workspace `8`             | Frozen |
| `GET /projects/{projectId}/pricing-margin-workspace` | `getProjectPricingMarginWorkspace` | N/A                                       | `ProjectPricingMarginWorkspaceView` | `project:read`     | pricing-margin workspace `4` / `5` / `7` | Frozen |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): `POST/GET /projects/{projectId}/pricing-margin-reviews`, `GET /projects/{projectId}/pricing-margin-workspace`
- Current implemented route(s): 待实现
- Inventory status: `planned`
- Route governance source: `ADR-015` + `EX-28`
- Blocker / exception: 无

## 5. 读侧边界

| Query / View                        | Consumer | Fields                                                                                     | Filter / Sort            | Permission Boundary | Design Source                            | Result |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------ | ------------------------ | ------------------- | ---------------------------------------- | ------ |
| `ProjectPricingMarginReviewList`    | FE-11    | 历史版本摘要、报价、成本引用、竞标引用、毛利判断、审批摘要和阻断计数                       | projectId；version desc  | `project:read`      | pricing-margin workspace `8`             | Frozen |
| `ProjectPricingMarginWorkspaceView` | FE-11    | current review、condition items、blocking reasons、next step、readyForContracting、actions | current effective review | `project:read`      | pricing-margin workspace `4` / `5` / `7` | Frozen |

## 6. 持久化边界

| Table                                   | Migration                         | Entity / Repository                 | DDL / Freeze Source | Check Result |
| --------------------------------------- | --------------------------------- | ----------------------------------- | ------------------- | ------------ |
| `project_pricing_margin_review`         | `Migration20260424203000_ex28...` | `ProjectPricingMarginReview`        | 本基线包            | Pending      |
| `project_pricing_margin_condition_item` | `Migration20260424203000_ex28...` | `ProjectPricingMarginConditionItem` | 本基线包            | Pending      |

| Field                         | Design Type / Meaning                      | Migration / DDL        | Entity          | Shared Contract / OpenAPI | Result |
| ----------------------------- | ------------------------------------------ | ---------------------- | --------------- | ------------------------- | ------ |
| `technicalCostPackageId`      | 技术与成本正式版本包引用                   | UUID not null          | string          | UUID string               | Frozen |
| `bidCommercialProcessId`      | 竞标路径引用；直接商务路径可空             | UUID nullable          | string nullable | UUID string nullable      | Frozen |
| `commercialReleaseBaselineId` | 放行 / 条件放行 / 升级审批时的商业基线引用 | UUID nullable          | string nullable | UUID string nullable      | Frozen |
| `summarySnapshotId`           | 审批摘要快照引用                           | UUID nullable          | string nullable | UUID string nullable      | Frozen |
| `quoteAmount*`                | 金额                                       | decimal(18,2)          | string          | decimal string            | Frozen |
| `taxRate` / `grossMarginRate` | 百分比 / 比率                              | decimal(18,8) nullable | string nullable | decimal string nullable   | Frozen |
| `decision`                    | 放行结论                                   | varchar enum           | shared enum     | shared enum               | Frozen |

## 7. 一致性结论

- Document -> code: 以本基线包冻结的字段与规则实现。
- ADR-015 inventory -> route: 新增 `planned` 行后才进入 controller / DTO / OpenAPI 实现。
- Migration -> entity: 主表和条件项子表必须与 entity 字段一一对应。
- Entity -> contract: shared contract 暴露摘要字段，不暴露未建模的敏感明细。
- Route -> command: POST 只创建新 current version，并 supersede 旧 current。
- Query -> view: 无 current review 返回业务 gap；不得返回页面级 404。
- Guard / permission: 读取 `project:read`；创建 `project:write`。
- OpenAPI / generated client: 本片必须 regenerate 并通过 `shared-api-client:check`。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                   | Result  | Gap / Reason |
| -------------------------------- | -------- | ---------------------------------------------------- | ------- | ------------ |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`                     | Pending |              |
| Build                            | Yes      | `corepack pnpm nx build poms-api`                    | Pending |              |
| Unit tests                       | Yes      | focused project service / query tests                | Pending |              |
| API / integration tests          | No       | Not required for focused fact-source slice           | N/A     |              |
| E2E                              | No       | FE-11 will cover browser entry chain                 | N/A     |              |
| OpenAPI generation / client diff | Yes      | `generate` + `shared-api-client:check`               | Pending |              |
| Migration / schema check         | Yes      | `poms-api:migration-up` + `poms-api:migration-check` | Pending |              |
| Markdown / whitespace            | Yes      | `pnpm run format:md:check` + `git diff --check`      | Pending |              |

## 9. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ----- |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | 无    |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-24`
- Conditions: 先更新 route inventory 为 `planned`，再进入 controller / DTO / OpenAPI / generated-client 实现；`FE-11` 在 `EX-28` 至少达到本地 `G3` 前继续保持 blocked。
