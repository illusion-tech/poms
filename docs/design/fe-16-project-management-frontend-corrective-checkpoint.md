# FE-16 项目管理前端主入口纠偏 Checkpoint

- Checkpoint Status: `Pass`
- Parent: `GOV`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G3 Reviewer: `Codex`
- Checkpoint Date: `2026-04-21`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` `FE-16`

## 1. 触发背景与范围

- 触发原因:
  - 当前 `/projects`、`/projects/:id` 与 `/projects/:id/workspace` 虽已有真实页面，但信息架构仍停留在 legacy CRUD + 实现说明页，未按用户画像、生命周期承接与 query/view 边界承接第二阶段正式设计。
  - 当前项目列表 / 项目详情仍消费 `ProjectSummary` 级旧契约，前端用本地字段和静态文案填补业务解释缺口，已经形成“设计要求是稳定视图，页面实现却在本地重算结论”的 drift。
  - 当前项目管理入口对用户可见文案仍混有实现视角和内部术语，不能满足“按用户画像组织交互、对用户只说业务中文”的新增约束。
- 本次目标:
  - 把本轮审阅发现的项目管理前端 drift 正式冻结为 corrective checkpoint。
  - 把“用户画像驱动交互”“先讲业务结论与下一步”“用户可见内容只说业务中文”收成后续整改的 SSOT。
  - 为后续可执行前端整改子片建立正式 tracker 入口，避免继续以口头 review 结论直接编码。
- 本次明确不做:
  - 不在本片直接改动 `/projects`、`/projects/:id`、`/projects/:id/workspace` 的运行时代码。
  - 不在本片直接新增或变更后端 query route、OpenAPI 或 shared contract。
  - 不在前端本地私自补齐 `ProjectListView` / `ProjectDetailView` 缺失字段。
- 本次纠偏后可恢复的可信边界:
  - “项目管理前端为什么要重做、重做到哪里、哪些前置输入没冻结前不能编码”已有正式治理记录。
  - 后续项目管理前端整改必须同时满足用户画像、稳定 query、按钮守卫和业务中文四条硬约束。
- 仍不允许下游依赖的留白:
  - 当前 `/projects`、`/projects/:id` 与工作区首页仍不能被视为稳定产品体验，也不能继续作为后续页面设计的默认样板。
  - 若后续整改涉及 `ProjectListView` / `ProjectDetailView` 正式 query、`CreateProjectRequest` 语义或 public route surface 变化，必须先补对应后端治理切片。

## 2. 正式输入

| Input Type       | Document / Source                                               | Section / Anchor                        | Status   | Notes                                                                          |
| ---------------- | --------------------------------------------------------------- | --------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Business design  | `docs/design/phase2-user-task-map.md`                           | `§4`、`§5`、`§6`                        | `review` | 冻结销售、商务行政、财务、管理层等角色的任务链、痛点与主入口诉求               |
| Business design  | `docs/design/phase2-lifecycle-experience-blueprint.md`          | `§2`、`§3`、`§5`                        | `review` | 冻结“一个项目，一个上下文”“阶段输出天然复用”“阻断原因必须可解释”               |
| Query boundary   | `docs/design/query-view-boundary-design.md`                     | `§5.2`、`§5.4`                          | `active` | 冻结 `ProjectListView`、`ProjectDetailView`、`L4` 读取页边界与禁止前端重算     |
| Business design  | `docs/design/business-authorization-matrix.md`                  | `§5.10`、`§5.13`                        | `active` | 冻结项目对象按钮守卫、对象级可见性与前后端统一校验规则                         |
| Business design  | `docs/design/project-lifecycle-design.md`                       | `§4`、`§5`、`§6`                        | `draft`  | 冻结 `Project` 正式主阶段链，不再把 `lead/opportunity/proposal` 当成项目主阶段 |
| Expression rules | `docs/design/phase2-commission-rule-explanation-language.md`    | `§4`、`§6`、`§7`、`§9`                  | `review` | 冻结“阻断原因 + 影响 + 下一步动作”的说法，以及用户可见内容用中文表达           |
| Expression rules | `docs/design/phase2-project-unified-accounting-view-caliber.md` | `snapshotAt` / `快照时点` 命名约束      | `review` | 冻结“内部字段可保留英文，前台标签不用英文术语”的页面命名原则                   |
| Runtime fact     | `apps/poms-admin/src/app/features/project/*`                    | current list / detail / workspace pages | `fact`   | 当前 drift 事实来自真实前端实现，而非纯文档推演                                |
| Runtime fact     | `apps/poms-admin/src/app.routes.ts`                             | current project routes                  | `fact`   | 当前 `/projects` 与 `/projects/:id` guard 缺口已是真实运行态问题               |

## 3. Drift 清单与本次 SSOT

| Concern              | Drift / SSOT                                                                        | Corrective Rule                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 页面职责分层         | 项目列表、项目详情、工作区首页混有 CRUD、说明页和本地推导职责                       | 列表负责定位与筛选，详情负责稳定业务事实，工作区首页负责连续工作引导，不再混成一个全能页                   |
| Query / view 契约    | 前端继续消费 `ProjectSummary` 并自行补语义                                          | 若 `ProjectListView` / `ProjectDetailView` 缺字段，先补后端 query / contract slice，前端不得本地拼业务结论 |
| 用户画像驱动交互     | 当前页面按技术模块堆字段，不按角色任务链组织                                        | 页面首屏与主按钮必须围绕销售、商务行政、财务、项目负责人、管理层的真实任务链组织                           |
| 用户可见文案         | 当前页面混有 `workspace`、`gate`、实现边界说明和技术术语                            | 用户可见内容只说业务中文；先讲当前结论、阻断原因、下一步和责任归口，不显示英文术语或内部实现词             |
| 生命周期语义         | `Project` 创建入口仍暴露 `lead/opportunity/proposal/negotiation` 旧语义             | `Project` 只承接正式项目主链；签约前 pipeline 语义不得继续通过项目创建页硬编码暴露                         |
| 权限与按钮守卫       | `/projects`、`/projects/:id` 与“新建 / 编辑 / 提成操作”未按对象级授权与状态前提收口 | 路由 guard、按钮显隐和动作顺序必须共同满足导航权限、对象动作授权、状态前提与 `allowedActions`              |
| 前端本地派生业务结论 | 工作区首页和 `L4` 页仍用本地 helper 或 `allowedActions` 回推出“下一步 / 可下游使用” | 当前动作、缺口、下一步和可用性必须来自稳定 query；前端只能投影，不得改写或补算                             |
| 工作区首页产品语义   | 首页仍在展示“已落地入口 / 本轮边界 / 暂不覆盖”这类实现说明                          | 工作区首页只承接业务导航和当前工作建议，不再面向用户输出研发状态说明                                       |

## 4. 当前阻断结论

- Current Gate: `G3`
- Blocking Findings:
  1. 当前项目列表、项目详情与工作区首页不符合第二阶段“一个项目，一个上下文”的主入口设计。
  2. 当前列表 / 详情 query 契约无法支撑正式 `ProjectListView` / `ProjectDetailView`，前端整改不能在缺 SSOT 的情况下直接开工。
  3. 当前项目页路由守卫、按钮守卫与用户可见文案均未按授权矩阵和表达规则收口。
- Why parent task cannot be closed:
  - 项目管理页是人工测试、后续签约前工作区和执行 / 经营 / 提成主线的共同入口。如果继续把当前实现视作“基本可用”，后续所有前端切片都会建立在错误入口模型上重复漂移。

## 5. 本次纠偏范围与修复结果

- 本批修复范围:
  1. 把项目管理前端 drift 正式收口为 corrective checkpoint。
  2. 把用户画像驱动交互与业务中文表达规则纳入后续整改 SSOT。
  3. 在执行板新增 `FE-16` 及后续 `FE-16A ~ FE-16D` 可执行切片入口。
- 本批未修复范围:
  1. 运行时代码中的项目列表、项目详情、工作区首页、守卫与文案问题。
  2. `ProjectListView` / `ProjectDetailView` 对应后端 contract、query、route surface 与 generated client。

| Concern            | Before                                          | After                                                              | Result  |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------ | ------- |
| 纠偏依据           | 只有 review 结论，缺正式治理载体                | 有正式 corrective checkpoint                                       | `fixed` |
| 交互与文案约束     | 仍停留在口头要求                                | 已冻结为后续前端整改的 SSOT                                        | `fixed` |
| 后续执行切片入口   | 尚未纳入执行板                                  | 已新增 `FE-16` 与 `FE-16A ~ FE-16D` 入口                           | `fixed` |
| 当前运行态前端漂移 | 仍存在                                          | 仍存在，待后续整改切片关闭                                         | `open`  |
| 后端 query / route | 仍未与 `ProjectListView/ProjectDetailView` 对齐 | 仍未对齐；本 checkpoint 只冻结“缺口必须先补，前端不能本地绕过”原则 | `open`  |

## 6. 测试与校验

| Check                            | Required | Command / Evidence | Result         | Gap / Reason           |
| -------------------------------- | -------- | ------------------ | -------------- | ---------------------- |
| Lint                             | `no`     | N/A                | `not required` | docs-only checkpoint   |
| Build                            | `no`     | N/A                | `not required` | docs-only checkpoint   |
| Unit tests                       | `no`     | N/A                | `not required` | docs-only checkpoint   |
| API / integration tests          | `no`     | N/A                | `not required` | 未触达运行时代码与 API |
| E2E                              | `no`     | N/A                | `not required` | 本片只冻结后续整改边界 |
| OpenAPI generation / client diff | `no`     | N/A                | `not required` | 本片不改 contract      |
| Migration / schema check         | `no`     | N/A                | `not required` | 无持久化变化           |
| Diff hygiene                     | `yes`    | `git diff --check` | `pass`         | 2026-04-21 已通过      |

## 7. 残余阻断与后续切片

- 已解除的阻断:
  - “项目管理前端 drift 只有口头 review、没有正式治理输入”的状态已解除。
- 仍存在的阻断:
  1. 当前 `/projects`、`/projects/:id` 与工作区首页运行态仍未整改。
  2. `ProjectListView` / `ProjectDetailView` 对应后端 query、contract 与可能的 route governance 尚未冻结。
- 后续子切片:
  1. `FE-16A` 项目列表入口与创建体验纠偏。
  2. `FE-16B` 项目详情业务化与动作守卫纠偏。
  3. `FE-16C` 项目工作区首页 / 壳层业务引导纠偏。
  4. `FE-16D` 项目页路由守卫、按钮守卫与浏览器验证收口。
  5. 若 `FE-16A` / `FE-16B` 触达正式 query / contract / route surface，先增设对应后端治理切片，再进入各自 `G1` baseline。

## 8. 例外与风险

- 无新增例外。
- 当前风险不在于“页面不好看”，而在于项目管理主入口已经成为后续前端切片的错误上游；若不先纠偏，后续 `L1 / L3 / L4 / L5` 页面会继续在错误入口模型上叠加复杂度。

## 9. G3 Checkpoint 结论

- Checkpoint Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-04-21`
- Conditions:
  - 本 checkpoint 仅表示纠偏输入已冻结，不等于运行时代码已修复。
  - 后续 `FE-16A ~ FE-16D` 必须逐片建立 `G1` baseline 后再编码。
  - 涉及 `ProjectListView` / `ProjectDetailView` 正式 contract 或 route surface 变化时，必须先走后端治理，不接受前端本地兜底。
