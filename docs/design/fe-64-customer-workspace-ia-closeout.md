# FE-64 客户工作台信息架构重整 G3/G4 Closeout

- Gate Status: `G4 = Done`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Closed By: `Codex local`
- Closed At: `2026-06-01`
- Implementation Commit: `d4794d4b`
- Baseline: `docs/design/fe-64-customer-workspace-ia-baseline.md`
- Tracker Row: `FE-64`

## 1. Delivered Scope

- 新增 `/customers/:id` 客户工作台路由和 `CustomerWorkspace` 页面。
- 客户列表退出重型详情承载职责，只保留检索、新建、编辑和进入客户工作台。
- 客户名称点击进入工作台，销售跟进待办的客户对象入口 direct cutover 到客户工作台。
- 客户工作台承载客户摘要、基础档案、客户别名、客户关系、业务讨论、销售跟进和附件。
- 客户上下文文案从“客户销售情报”收口为“客户关系”；机会级销售情报仍归属线索 / 项目上下文。

## 2. Validation

| Check                  | Result | Evidence                                                                           |
| ---------------------- | ------ | ---------------------------------------------------------------------------------- |
| Admin customer tests   | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer`         |
| Todo navigation tests  | Pass   | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=todo-navigation`  |
| Admin lint             | Pass   | `corepack pnpm nx lint poms-admin`                                                 |
| Admin build            | Pass   | `corepack pnpm nx build poms-admin`                                                |
| Browser visual QA      | Pass   | `http://localhost:4200/customers` and `/customers/:id`; screenshots under `dist/`  |
| Markdown formatter     | Pass   | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                 |
| Whitespace check       | Pass   | `git diff --check`                                                                 |
| OpenAPI / client check | N/A    | Frontend-only slice; no public API, DTO, OpenAPI, generated client, or DB changes. |

## 3. Drift Classification

- Classification: none.
- Existing baseline drift: none observed for this slice.
- New drift introduced: none.
- Public route surface: unchanged.
- OpenAPI / generated client: unchanged.
- Persistence / migration: unchanged.

## 4. Exceptions

| Exception ID                | Level | Scope                    | Owner | Cleanup Due | Notes                                      |
| --------------------------- | ----- | ------------------------ | ----- | ----------- | ------------------------------------------ |
| FE64-E1-NO-CUSTOMER-360-API | E1    | 客户工作台不做聚合读模型 | Codex | N/A         | 如需客户经营聚合读模型，另开后续 API slice |

## 5. G4 Decision

- Can downstream rely on this slice: yes.
- Can mark tracker `Done / G4`: yes.
- Follow-up slices:
  - Optional future slice for a server-side customer workspace aggregate read model if the product needs active leads, active projects, contract health, and latest touchpoints in one query.
  - Optional future visual polish slice if shared panels need a broader Poseidon `.card` surface unification across customer, lead, and project contexts.
