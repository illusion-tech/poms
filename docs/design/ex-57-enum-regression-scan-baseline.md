# EX-57 枚举治理回归扫描与例外清单实施基线包

- Gate Status: `Pass`
- Parent: `EX-56`
- Owner: `Codex`
- Slice Type: `build / process`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-03`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-57`

## 1. 范围

- 本次目标:
  - 新增 enum-like 字符串静态扫描工具，覆盖 Admin 前端、admin data-access 和 generated api-client model 的高风险字段。
  - 新增允许清单，显式记录 query params、UI-only severity、demo/template UI、开放 taxonomy 和 generated client string gap。
  - 提供本地校验命令，后续新增裸字符串若未进入 allowlist 应直接失败。
- 本次明确不做:
  - 不改 API、DTO、OpenAPI、generated client、数据库或业务运行时代码。
  - 不把 generated client 仍为 `string` 的字段在前端伪造成本地 enum。
  - 不治理 `tasklist`、`dashboard`、`landing`、`files` demo/template UI 的内部状态语义。
- 下游可依赖的交付边界:
  - `EX-57` 完成后，下游可使用统一命令检查新增 enum-like 裸字符串。
  - 允许清单是显式治理输入，不允许在业务切片中隐式新增例外。
- 不允许下游依赖的留白:
  - allowlist 中的 generated client string gap 不代表长期接受；若字段应闭合，必须先做后端 DTO / shared contract 治理。

## 2. 正式输入

| Input Type                | Document / Source                                     | Section / Anchor        | Status | Notes                              |
| ------------------------- | ----------------------------------------------------- | ----------------------- | ------ | ---------------------------------- |
| Business design           | `ex-56-domain-enum-and-string-literal-governance.md`  | 全文                    | Stable | 枚举治理 SSOT 与例外边界。         |
| Command design            | N/A                                                   | N/A                     | N/A    | 本切片不新增命令。                 |
| DTO / OpenAPI design      | `fe-52d-admin-enum-residual-scan-closeout.md`         | `4.3`                   | Stable | generated client string gap 输入。 |
| Route inventory / ADR-015 | N/A                                                   | N/A                     | N/A    | 不新增或修改 public route。        |
| Query boundary            | `fe-52d-admin-enum-residual-scan-closeout.md`         | `5. EX-57 输入规则`     | Stable | 扫描失败 / 白名单 / 后端治理分层。 |
| Data model / table freeze | N/A                                                   | N/A                     | N/A    | 不触及持久化。                     |
| Schema / DDL              | N/A                                                   | N/A                     | N/A    | 不触及 DDL。                       |
| ADR                       | `implementation-governance-gates.md` / `EX-56` 基线包 | gate 与例外治理相关章节 | Stable | 例外必须有 scope / cleanup owner。 |

## 3. 本次 SSOT

| Concern                     | SSOT                                            | Implementation Rule                                              |
| --------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Business semantics          | `EX-56` / `FE-52D`                              | 闭合领域枚举必须使用 shared value object 或 generated enum。     |
| Public route canonical path | N/A                                             | 不触及 public route。                                            |
| Route / command naming      | N/A                                             | 不新增命令。                                                     |
| DTO / contract naming       | generated client model files                    | 只扫描 generated string gap，不在前端本地补 enum。               |
| Table / column naming       | N/A                                             | 不触及持久化。                                                   |
| Date / time semantics       | N/A                                             | 不触及日期字段。                                                 |
| Identifier semantics        | path + pattern + finding text                   | allowlist 使用文件路径与匹配片段表达例外，不使用中文业务值兼容。 |
| Money / decimal semantics   | N/A                                             | 不触及金额。                                                     |
| Status machine              | `shared-contracts` / generated enum / allowlist | 未在 allowlist 的 `status/type/...` 字符串应失败。               |

## 4. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | ------ |
| N/A                | N/A               | N/A                    | N/A                     | N/A                | N/A           | 不触及 |

### 4.1 公共路由补充信息

- Canonical inventory document: N/A
- Canonical route(s): N/A
- Current implemented route(s): N/A
- Inventory status: N/A
- Route governance source: N/A
- Blocker / exception: N/A

## 5. 读侧边界

| Query / View | Consumer           | Fields                                        | Filter / Sort | Permission Boundary | Design Source | Result       |
| ------------ | ------------------ | --------------------------------------------- | ------------- | ------------------- | ------------- | ------------ |
| file scan    | local check script | file path, line, rule id, matched text, scope | path/rule     | N/A                 | `FE-52D`      | 本切片新增。 |

## 6. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result |
| ----- | --------- | ------------------- | ------------------- | ------------ |
| N/A   | N/A       | N/A                 | N/A                 | 不触及       |

| Field | Design Type / Meaning | Migration / DDL | Entity | Shared Contract / OpenAPI | Result |
| ----- | --------------------- | --------------- | ------ | ------------------------- | ------ |
| N/A   | N/A                   | N/A             | N/A    | N/A                       | 不触及 |

## 7. 一致性结论

- Document -> code: 扫描规则必须覆盖 `FE-52D` 中列出的三层输入规则。
- ADR-015 inventory -> route: N/A，不触及 public route。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: 工具输出即本地 scan view。
- Guard / permission: N/A。
- OpenAPI / generated client: 只读取 generated model，未修改生成内容。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                  | Result  | Gap / Reason                      |
| -------------------------------- | -------- | ----------------------------------- | ------- | --------------------------------- |
| Lint                             | No       | N/A                                 | N/A     | 只新增 Deno 工具与 docs。         |
| Build                            | No       | N/A                                 | N/A     | 不触及 app build surface。        |
| Unit tests                       | Yes      | scan tool check command             | Pending | 工具本身通过 fixture/当前库扫描。 |
| API / integration tests          | No       | N/A                                 | N/A     | 不触及 API。                      |
| E2E                              | No       | N/A                                 | N/A     | 不触及用户流程。                  |
| OpenAPI generation / client diff | No       | N/A                                 | N/A     | 不改 OpenAPI/generated client。   |
| Migration / schema check         | No       | N/A                                 | N/A     | 不触及持久化。                    |
| Markdown format                  | Yes      | `corepack pnpm run format:md:check` | Pending | 文档变更必须通过。                |
| Diff whitespace                  | Yes      | `git diff --check`                  | Pending | 本地最终校验。                    |

## 9. 例外与风险

| Exception ID        | Level | Scope                                           | Approved By | Cleanup Owner | Cleanup Due | Notes                                                     |
| ------------------- | ----- | ----------------------------------------------- | ----------- | ------------- | ----------- | --------------------------------------------------------- |
| `EX57-E1-GENSTRING` | E1    | generated client 当前仍为 `string` 的业务字段   | Codex       | `EX-57`       | `EX-57 G3`  | allowlist 必须显式列出，不允许前端伪造本地 enum。         |
| `EX57-E2-DEMOUI`    | E1    | demo/template UI 的内部 status / severity 字段  | Codex       | `EX-57`       | `EX-57 G3`  | 仅限非 POMS 业务事实源路径；迁入业务页面时必须重新治理。  |
| `EX57-E3-TAXONOMY`  | E1    | 阻断原因、责任角色、回款判断模式等开放 taxonomy | Codex       | `EX-57`       | `EX-57 G3`  | 后续如需闭合，必须从后端 shared contract / DTO 侧先治理。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-03`
- Conditions:
  - 先实现扫描工具和 allowlist，不改业务运行时代码。
  - 扫描规则必须能在当前库通过，并对未归类新增项失败。
  - tracker 进入 `Doing / G1` 后方可进入工具实现。
