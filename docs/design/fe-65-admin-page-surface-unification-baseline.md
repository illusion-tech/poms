# FE-65 Admin 页面级 Surface 统一实施基线包

## Gate Status

- Gate: G4
- Slice Type: frontend-only
- Owner: Codex
- G1 Date: 2026-06-08
- G3 Date: 2026-06-08
- G4 Date: 2026-06-09
- Runtime Commit: `c17dcf66`
- Build Graph Follow-up Commit: `6317eca0`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-65`
- Parent Inputs: 用户对客户工作台卡片样式不一致的反馈、`FE-63` Admin 表格视觉系统、`FE-64` 客户工作台信息架构、`EX-71C` 客户工作台页面信息架构打磨

## Scope

- 本次目标: 对 POMS Admin 中与客户工作台同类的页面级卡片 / surface 漂移进行筛查，并把共享业务面板根容器收敛到既有 `SectionCard` / Poseidon `.card` 视觉体系。
- 下游可依赖的交付边界: 客户、线索、项目、合同详情中复用的销售情报、业务讨论、销售跟进和附件面板，其外层 surface 使用统一共享组件，而不是各自手写 `rounded-[8px] border ... p-4`。
- 不允许下游依赖的留白: 本片不改变列表工具条、表格卡片、业务流程、API、DTO、OpenAPI、generated client、权限、路由或数据模型；弹窗内部信息组和面板内部列表项不升级为页面级 `SectionCard`。

## Frozen Inputs

| Input Type       | Source                                                                 | Frozen Value                                          | Status | Notes                                  |
| ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------- | ------ | -------------------------------------- |
| UX finding       | User browser review                                                    | 客户档案与下方共享面板卡片样式不一致                  | frozen | 需要使用已有组件 / demo 风格，避免手写 |
| Visual baseline  | `apps/poms-admin/src/assets/tailwind.css`                              | `.card`                                               | frozen | Poseidon demo surface 基线             |
| Shared component | `apps/poms-admin/src/app/shared/ui/sectioncard.ts`                     | `SectionCard` host uses `.card`                       | frozen | 页面级业务区块优先复用                 |
| Drift candidates | `apps/poms-admin/src/app/shared/ui/*panel.ts`                          | 四个共享面板根容器                                    | frozen | 影响客户 / 线索 / 项目 / 合同详情      |
| Exclusions       | `lead-list` dialogs, panel inner cards, empty states, audit dialog row | 内嵌信息组继续保持局部视觉，不作为页面级 surface 处理 | frozen | 避免把弹窗与内部列表也做大卡片化       |

## Route / API Boundary

| Public Route | Inventory Status | Action                                    |
| ------------ | ---------------- | ----------------------------------------- |
| N/A          | N/A              | 本片不新增、修改或删除 public API route。 |

`docs/design/api-route-canonical-inventory.md` 无需更新。

## UI Boundary

| Area                   | Before                                      | After                                        |
| ---------------------- | ------------------------------------------- | -------------------------------------------- |
| 共享业务面板根容器     | 手写 `rounded-[8px] border ... p-4`         | `SectionCard` 承载标题、说明、操作和主体内容 |
| 客户工作台主业务区块   | 局部 `.card` 手写标题区                     | 页面级区块使用 `SectionCard` 标题投影        |
| 面板内部列表 / 空状态  | 局部边框、紧凑列表、虚线空态                | 保留，属于内容组织而非页面 surface           |
| 线索详情 / 评分弹窗    | 弹窗内信息组使用紧凑 bordered group         | 保留，弹窗信息密度优先，不升级为页面卡片     |
| 表格页 toolbar / table | `FE-63` 已定义 table card / toolbar surface | 不在本片重复调整                             |

## DRY / SOLID Guardrails

- `DRY-1`: 页面级 surface 只通过 `SectionCard` / `.card` 复用，不在各业务面板继续复制卡片圆角、阴影和间距。
- `DRY-2`: 共享面板仍承载各自业务读取和写入交互，客户 / 线索 / 项目 / 合同页面不复制面板模板。
- `SOLID-1`: `SectionCard` 只负责通用区块结构和视觉，不吸收附件、讨论、跟进或销售情报业务逻辑。
- `SOLID-2`: 内嵌列表项、空状态、对话框表单组继续由各业务组件控制，避免通用组件承担过宽职责。

## Validation Plan

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-workspace`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=business-discussion-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=attachment-panel`
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`
- Browser smoke on `/customers/11000000-0000-4000-8000-000000000001` when local dev servers are available.

## G1 Decision

`FE-65` 可以进入实现。本片为 frontend-only 视觉系统收敛，不改变后端契约、API surface、generated client、数据模型、权限或业务行为；以共享面板根容器迁移、客户工作台主区块组件化、focused tests、Admin lint/build、Markdown 和 diff check 作为 G3 验证边界。

## G3 Checkpoint

### Implementation Result

- `SectionCard` host 补齐 `block`，让共享业务面板作为自定义元素嵌入时仍保持页面级块状 surface。
- 附件、业务讨论、销售跟进、销售情报四个共享面板的根容器已迁移到 `SectionCard`，标题、说明和操作区通过模板投影承载。
- 客户工作台的经营工作台、客户档案两个主业务区块已迁移到 `SectionCard`，与下方共享面板保持同一 `.card` surface。
- 面板内部紧凑信息组、列表项、空状态和弹窗表单组按 G1 exclusion 保留局部结构，不升级为页面级卡片。

### Drift Handling

- `new-real-drift`: 浏览器验收发现共享面板 `#title` / `#description` 模板引用变量会遮蔽组件 `title` / `description` 输入，导致页面显示 `[object Object]`。本片已通过输入 alias `heading` / `descriptionText` 修正，并在四个共享面板 focused specs 中增加回归断言。
- 未发现需要修改 API、OpenAPI、generated client、migration、权限或路由的漂移。

### Local Validation

- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=customer-workspace`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-intelligence-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=business-discussion-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=sales-follow-up-panel`
- `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=attachment-panel`
- Focused tests result: 5 suites / 25 tests passed.
- `corepack pnpm nx lint poms-admin`
- `corepack pnpm nx build poms-admin`
- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`
- Browser smoke: `/customers/1e9a4b68-886b-4077-9a9e-f61537e59749` 显示经营工作台、客户档案、客户关系、客户业务讨论、客户销售跟进、客户附件；`section-card` computed style 为 `display: block`，使用 `.card` 圆角、背景和阴影；无 runtime errors。截图证据：`dist/playwright/fe65-customer-workspace-surface.png`。

`FE-65` 本地 G3 验证通过；提交前保持 `Doing`，暂不标记 G4 / Done。

## G4 Closeout

- Runtime commit `c17dcf66` 已提交，承载共享面板根容器 `SectionCard` 迁移、客户工作台主业务区块 surface 统一和四个共享面板标题 / 说明回归断言。
- Follow-up commit `6317eca0` 已提交，补齐 Admin 与 shared 库 TypeScript 构建图，支撑后续构建验证。
- Tracker 已标记 `Done / G4`；本片为 frontend-only 视觉系统收敛，未新增或修改 API、OpenAPI、generated client、migration、权限或路由。
- 下游可依赖 `SectionCard` / Poseidon `.card` 作为客户工作台主业务区块和共享业务面板根容器的页面级 surface 基线；弹窗、内部信息组、列表项和空状态仍按 G1 exclusion 保持局部结构。
