# FE-37 Admin 模板 / Demo Severity 字面量清理实施基线包

- Gate Status: `G1 = Frozen`
- Task ID: `FE-37`
- Owner: `Codex`
- Slice Type: `process-only / docs-only`
- Baseline Date: `2026-04-27`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `FE-37`
- Upstream Exceptions: `FE35-E1-DEMO-SEVERITY-LITERALS`, `FE35-E2-NON-POMS-TEMPLATE-PAGES`

## 1. Problem Statement

`FE-35` 已把 POMS 主业务页面中的 domain status -> label / severity 映射收敛到共享 `Ui*Severity` primitive type 与 `status-presentation` helper，但仍保留两个低风险例外:

1. Poseidon demo / uikit 示例页中的 PrimeNG severity 字面量。
2. landing / cms / mail / chat / files 等非 POMS 主业务模板页中的 PrimeNG severity 字面量。

`FE-37` 的目标不是默认批量替换所有 `success | secondary | info | warn | danger | contrast` 字面量，而是先判断这些剩余使用是否属于需要工程清理的业务状态映射，还是属于合理保留的 PrimeNG 组件 API 示例 / 模板债务。

## 2. Scope

本片交付:

1. 对 `FE35-E1` / `FE35-E2` 涉及的剩余 severity literal 使用进行范围分类。
2. 冻结后续治理规则: domain state/status mapping 必须使用严格的 presentation helper；组件局部 UI intent、PrimeNG demo / uikit 示例、未产品化模板页不强制迁移。
3. 将 `FE35-E1` / `FE35-E2` 从“开放例外”收敛为正式范围判断，提交后可在 `G4` 关闭。
4. 更新 tracker / progress，说明本片为 process-only / docs-only，不改运行时代码。

本片不交付:

1. 不批量修改 `apps/poms-admin/src/app/demo/**` 的 Poseidon / PrimeNG 示例代码。
2. 不批量修改 `cms`、`files`、`tasklist`、dashboard widget、layout right menu 等非 POMS 主业务模板页。
3. 不把 PrimeNG 组件的所有直接 `severity="secondary"` / `[severity]="'warn'"` 一律判为违规。
4. 不改 public API、OpenAPI、generated client、DTO、权限、store、route、E2E 或 runtime UI 行为。

## 3. Formal Inputs

| Input Type               | Document / Source                                                                   | Status  | Notes                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| Upstream slice           | `docs/design/archive/slices/fe-35-admin-ui-severity-presentation-baseline.md`       | Frozen  | 已定义 POMS 主业务页面 severity helper 与 demo / template 例外。       |
| Upstream close-out       | `docs/design/archive/slices/fe-35-admin-ui-severity-presentation-g3-g4-closeout.md` | Done    | 已把 `FE35-E1` / `FE35-E2` 转交后续 FE-37。                            |
| Tracker row              | `docs/design/phase2-development-execution-tracker.md` / `FE-37`                     | G0      | 完成定义允许“清理”或“把保留范围正式归档”。                             |
| Code search evidence     | `rg` over `apps/poms-admin/src/app`                                                 | Current | 剩余 literal 分布在 demo/uikit、template-like pages 与局部 UI intent。 |
| Public route inventory   | N/A                                                                                 | N/A     | 本片不触及 public API route surface。                                  |
| Data model / persistence | N/A                                                                                 | N/A     | 本片不触及 DDL、entity 或 migration。                                  |

## 4. G1 Classification

| Area                                                    | Classification          | G1 Decision                                                                                                                                    |
| ------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/poms-admin/src/app/demo/**`                       | Poseidon / PrimeNG demo | 保留原始 PrimeNG severity literal。demo 的目的之一是展示组件 API，迁移到 POMS helper 会降低模板参考价值并制造无业务收益的维护成本。            |
| `apps/poms-admin/src/app/demo/uikit/**`                 | UIKit reference demo    | 保留原始写法。UIKit demo 是后续表格、按钮、消息等交互基线的参考，不应被业务 presentation helper 改写。                                         |
| `features/cms` / `features/files` / `features/tasklist` | Non-POMS template page  | 进入正式产品化或模板清理前保留。若未来变成 POMS 主业务页面，必须另开产品化切片并按共享 UI primitive / presentation helper 收口。               |
| Dashboard / layout template widgets                     | Mixed template / shell  | 仅在承载 POMS 业务状态时才迁移；纯组件意图、示例性 action、badge、message severity 可直接使用 PrimeNG literal。                                |
| POMS business domain status mapping                     | Controlled              | 必须使用 `status-presentation.ts` 或 feature presentation helper；默认 helper 输入保持已知字面量 union，DTO `string` 字段必须走显式 fallback。 |
| Local component UI intent                               | Allowed                 | 例如 button secondary、message warn、toast info 这类局部交互意图可以直接使用 PrimeNG literal；当出现重复业务状态映射时再抽 helper。            |

## 5. Severity Governance Rule

后续执行按以下规则判断是否需要治理:

1. **必须治理**: domain state、status machine、业务阶段、归档状态、合同 / 线索 / 项目状态、提成阶段等业务事实到 label / tag severity 的映射。
2. **可以直接使用 literal**: 组件局部视觉意图，例如次要按钮、警告消息、信息提示、模板示例、demo 文档页。
3. **必须拆片再治理**: 非 POMS 模板页产品化为真实业务页面时，先冻结页面职责、数据来源、权限和状态语义，再迁移 severity。
4. **不得做的事**: 为了消除搜索结果而把 demo / template / action intent 统一塞进业务 `status-presentation` helper。

## 6. Public Interfaces / API

| Boundary           | Status | Notes                                             |
| ------------------ | ------ | ------------------------------------------------- |
| Public API route   | N/A    | 不新增、修改或删除后端 route。                    |
| OpenAPI / DTO      | N/A    | 不改 generated client 或 shared contract。        |
| Persistence / DDL  | N/A    | 无数据库变化。                                    |
| Frontend API       | N/A    | 本片不新增共享 UI API；只冻结使用规则与例外判断。 |
| Permission / guard | N/A    | 不改权限与可见性。                                |

## 7. Test And Validation Plan

Required for this process-only slice:

1. `corepack pnpm run format:md:check`
2. `git diff --check`

Not required:

1. `corepack pnpm nx lint poms-admin`，因为不改 TypeScript、模板或样式文件。
2. `corepack pnpm nx build poms-admin`，因为不改 runtime code。
3. E2E，因没有 UI 行为变化。
4. `shared-api-client:check`，因不改 OpenAPI / generated client。
5. `migration-check`，因不改 persistence。

## 8. Exceptions

| Exception ID                      | Level | Scope                                        | Approved By | Cleanup Owner | Cleanup Due                    | G1 Decision                                                                                |
| --------------------------------- | ----- | -------------------------------------------- | ----------- | ------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| `FE35-E1-DEMO-SEVERITY-LITERALS`  | Low   | Poseidon demo / uikit                        | Codex       | Codex         | On demo productization/removal | Accepted for closure: retain literals as component API examples.                           |
| `FE35-E2-NON-POMS-TEMPLATE-PAGES` | Low   | cms / files / tasklist / dashboard templates | Codex       | Codex         | On page productization/removal | Accepted for closure: retain until the page becomes a POMS business surface or is removed. |

## 9. G1 Decision

`FE-37` 可以作为 `process-only / docs-only` 切片进入 `G3`。本片的正确收口方式是正式归档保留范围并关闭 `FE35-E1` / `FE35-E2`，不是批量替换 demo / template 中所有 PrimeNG severity literal。
