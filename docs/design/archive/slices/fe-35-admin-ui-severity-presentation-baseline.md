# FE-35 Admin UI Severity 与业务状态展示治理实施基线包

- Gate Status: `G1 = Frozen`
- Task ID: `FE-35`
- Owner: `Codex`
- Slice Type: `frontend-only`
- Baseline Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-35`

## 1. Problem Statement

业务前端页面中重复出现 PrimeNG tag severity union 与 domain status -> label / severity 映射，例如项目列表、项目详情、线索列表和合同列表各自维护:

- `success | secondary | info | warn | danger | contrast`
- 项目阶段 / 项目状态 label 与 severity
- 线索状态 label 与 severity
- 合同状态 label 与 severity
- 项目归档 / 确认状态 label 与 severity

这会造成后续页面扩展时的视觉漂移、类型漂移和重复维护。共享 helper 的默认 API 必须尽量严格：已知状态使用 `as const` 字面量推导的 union；后端 DTO 仍为普通 `string` 的字段必须显式走 `*OrFallback`，不能让宽松输入隐藏在默认 helper 中。

## 2. Scope

本片交付:

1. 新增共享 UI severity primitive values 与 primitive types，区分 tag、message、button、toast 的 PrimeNG severity 语义，并从 `as const` 值列表推导类型。
2. 新增共享业务状态展示 helper，集中维护项目阶段、项目状态、合同状态、线索状态、确认状态和归档状态的 label / tag severity；默认 helper 只接受已知字面量 union，`*OrFallback` helper 才接受 DTO `string | null | undefined`。
3. 将项目列表、项目详情、项目合同移交、线索列表、合同列表、合同详情、工作台和提成操作页的重复本地映射迁移到共享 helper。
4. 让既有 `project-presentation.ts` 继续提供 L4/L5 / commission 页面需要的 presentation helper，但不再本地定义 `UiTagSeverity` 或重复项目阶段 / 状态映射。
5. 补 focused unit tests 覆盖共享映射的核心状态与 fallback。

本片不交付:

1. 不批量修改 Poseidon demo / uikit 示例代码。
2. 不批量修改 dashboard、landing、cms、mail、chat 等模板示例页。
3. 不改变路由、API、DTO、generated client、权限、store、业务 command 或 persistence。
4. 不把 Toast / Message 的 `error` 与 Tag / Button 的 `danger` 混用；不同 PrimeNG 组件保留不同 severity primitive type。

## 3. Public Interfaces / API

| Boundary          | Status | Notes                                          |
| ----------------- | ------ | ---------------------------------------------- |
| Public API route  | N/A    | Frontend-only；不新增或修改后端 route。        |
| OpenAPI / DTO     | N/A    | 不改 generated client 或 shared contracts。    |
| Persistence / DDL | N/A    | 无数据库变化。                                 |
| Frontend API      | Frozen | 新增 admin 内部 `shared/ui` presentation API。 |

## 4. Implementation Boundaries

| Area                        | Decision                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI primitive type           | `apps/poms-admin/src/app/shared/ui/ui-severity.ts`                                                                                                          |
| Domain status presentation  | `apps/poms-admin/src/app/shared/ui/status-presentation.ts`                                                                                                  |
| Project presentation bridge | `apps/poms-admin/src/app/features/project/project-presentation.ts` 继续导出项目 / L4/L5 helper                                                              |
| Initial migration scope     | `project-list`、`project-detail`、`project-contract-handover`、`lead-list`、`contract-list`、`contract-detail`、`dashboard/workbench`、`project-commission` |
| Demo / template scope       | Explicitly out of scope                                                                                                                                     |

## 5. Alignment Rules

| Edge                   | Required Handling                                                                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Document -> code       | Code must use shared severity primitive types and shared status presentation helpers.                                                         |
| DTO / contract -> view | Generated enum / known literal should call strict helper; DTO plain `string` must call explicit `*OrFallback` helper without contract change. |
| Query -> view          | No query behavior change; only display mapping moves.                                                                                         |
| Guard / permission     | No permission behavior change.                                                                                                                |
| Visual consistency     | Same domain status must resolve to same label and tag severity across migrated pages.                                                         |

## 6. Test Plan

Required:

1. `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=status-presentation`
2. Existing affected focused specs when practical:
   - `project-list`
   - `project-detail`
   - `lead-list`
   - `contract-list`
3. `corepack pnpm nx lint poms-admin`
4. `corepack pnpm nx build poms-admin`
5. `corepack pnpm run format:md:check`
6. `git diff --check`

Not required:

1. `shared-api-client:check`，因为不改 OpenAPI / generated client。
2. `migration-check`，因为不改 persistence。
3. E2E，除非本片引入页面结构或交互行为变更；本片目标是 presentation helper refactor。

## 7. Exceptions

| Exception ID                      | Level | Scope                                        | Owner | Cleanup Trigger                          | Notes                                               |
| --------------------------------- | ----- | -------------------------------------------- | ----- | ---------------------------------------- | --------------------------------------------------- |
| `FE35-E1-DEMO-SEVERITY-LITERALS`  | Low   | Poseidon demo / uikit                        | Codex | 如正式产品启用 demo 页或清理模板时再处理 | 示例页保留 PrimeNG 原始写法，不纳入业务一致性治理。 |
| `FE35-E2-NON-POMS-TEMPLATE-PAGES` | Low   | landing / cms / mail / chat / files 等模板页 | Codex | 对应页面产品化前                         | 当前不是 POMS 主业务页面，避免扩大无关改动。        |

## 8. G1 Decision

`FE-35` 可以进入实现。实现不得扩大到 public API、generated client、权限或 demo 模板清理。
