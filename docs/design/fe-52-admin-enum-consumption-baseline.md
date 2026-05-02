# FE-52 Admin 前端枚举消费与状态展示收口基线

- Gate Status: `Pass`
- Parent: `EX-56` 领域枚举与字符串字面量治理基线
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-02`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-52`

## 1. 范围

本片负责在后端与 generated client 枚举稳定后，收敛 Admin 前端业务代码中的领域枚举消费方式。

本次目标：

- `libs/admin/data-access` re-export Admin 业务页面需要直接消费的 generated enum。
- `status-presentation` / `project-presentation` 使用 generated enum 作为闭合状态 SSOT，不再用本地字符串字面量定义已经冻结的业务状态。
- 业务页面、store、focused specs 优先使用 generated enum runtime value；只在开放 taxonomy 或 UI-only severity 场景保留字符串。
- 明确 demo/template/mock UI 不属于 POMS 领域枚举治理范围，避免误清理。

本次明确不做：

- 不改 API route、OpenAPI schema、DB migration、后端业务状态机或权限。
- 不收窄仍被设计定义为开放 taxonomy 的字段，如业务规则编码、阻断原因编码、角色类型、UI demo 文件类型。
- 不把 PrimeNG `severity`、按钮 severity、toast severity、图表配置 type 等 UI-only 字符串当作领域枚举处理。
- 不新增历史兼容枚举别名，不为旧中文值或旧状态值保留特殊路径。

下游可依赖的交付边界：

- Admin 业务代码中 closed domain enum 的显示、比较、表单选项和测试夹具尽量从 generated enum 派生。
- 剩余开放字符串字段有明确例外范围，交给 `EX-57` 静态扫描与允许清单固化。

不允许下游依赖的留白：

- Demo、CMS、mail/chat/template dashboard 的 mock status/type 不作为 POMS 业务枚举治理结果。
- 开放 taxonomy 仍可能保留 `Record<string, string>` label 映射，直到对应业务切片冻结。

## 2. 子切片拆分

| Slice    | Scope                                 | Depends On | Notes                                                                             |
| -------- | ------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `FE-52A` | Shared presentation 与 enum re-export | `FE-52`    | 收敛 `admin-data-access` re-export、`status-presentation`、`project-presentation` |
| `FE-52B` | CRM 前端页面与 store 消费             | `FE-52A`   | 客户、线索、附件、销售跟进相关页面 / specs                                        |
| `FE-52C` | 项目、合同、提成前端页面消费          | `FE-52A`   | 项目详情 / 工作区、合同、提成页面 / specs                                         |
| `FE-52D` | 回归扫描、例外清单与测试夹具尾项      | `FE-52B/C` | 为 `EX-57` 输入静态扫描 allowlist 和残留治理清单                                  |

## 3. 正式输入

| Input Type                | Document / Source                                    | Section / Anchor | Status | Notes                       |
| ------------------------- | ---------------------------------------------------- | ---------------- | ------ | --------------------------- |
| Governance                | `ex-56-domain-enum-literal-governance-baseline.md`   | 全文             | frozen | 枚举治理总规则              |
| Backend enum slices       | `EX-56A` / `EX-56B` / `EX-56C` / `EX-56D` tracker    | G4 rows          | frozen | generated client 已稳定     |
| Shared API client         | `libs/shared/api-client/model/*.ts`                  | generated enums  | frozen | Admin runtime enum 消费面   |
| Admin data access         | `libs/admin/data-access/src/index.ts`                | public exports   | active | 前端业务页面导入入口        |
| Admin presentation        | `status-presentation.ts` / `project-presentation.ts` | label helpers    | active | FE-52A 首要收口位置         |
| Route inventory / ADR-015 | N/A                                                  | N/A              | N/A    | 不触及 public route surface |

## 4. 本次 SSOT

| Concern                     | SSOT                           | Implementation Rule                                                        |
| --------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Business enum runtime value | `@poms/shared-api-client` enum | 经 `@poms/admin-data-access` re-export 后由业务页面消费                    |
| Display labels              | Admin presentation helpers     | key 使用 generated enum member，不用裸字符串重建闭合值集                   |
| UI severity                 | `ui-severity.ts`               | UI-only severity 保留字符串 union，不纳入领域枚举                          |
| Open taxonomy labels        | 当前业务页面局部 label map     | 可保留 `Record<string, string>`，必须在基线 / 例外中说明                   |
| Tests / fixtures            | generated enum preferred       | focused specs 对 closed enum 使用 generated enum，开放 taxonomy 可用字符串 |
| Public route canonical path | N/A                            | 本片不新增、不修改、不删除 route                                           |
| Status machine              | Backend EX-56A-D G4 output     | 前端只消费，不改变状态流转                                                 |

## 5. 命令与接口边界

| Route / Controller | Command / Service | Request DTO / Contract | Response DTO / Contract | Guard / Permission | Design Source | Result             |
| ------------------ | ----------------- | ---------------------- | ----------------------- | ------------------ | ------------- | ------------------ |
| N/A                | N/A               | N/A                    | N/A                     | N/A                | N/A           | 不触及 API / guard |

## 6. 读侧边界

| Query / View              | Consumer      | Fields                   | Filter / Sort | Permission Boundary | Design Source | Result               |
| ------------------------- | ------------- | ------------------------ | ------------- | ------------------- | ------------- | -------------------- |
| generated API view models | Admin pages   | status/type/stage fields | unchanged     | unchanged           | EX-56A-D G4   | 仅变更前端 enum 引用 |
| presentation helpers      | Admin display | label/severity           | N/A           | N/A                 | FE-52A        | 统一 closed enum key |

## 7. 持久化边界

| Table | Migration | Entity / Repository | DDL / Freeze Source | Check Result     |
| ----- | --------- | ------------------- | ------------------- | ---------------- |
| N/A   | N/A       | N/A                 | N/A                 | 本片不触及持久化 |

## 8. 一致性结论

- Document -> code: 先以本基线拆分子切片，再按子切片落地。
- ADR-015 inventory -> route: N/A，不触及 public route surface。
- Migration -> entity: N/A。
- Entity -> contract: 依赖 EX-56A-D 已完成输出。
- Route -> command: N/A。
- Query -> view: 前端显示 helper 使用 generated enum 对齐 response fields。
- Guard / permission: 不改。
- OpenAPI / generated client: 不重新生成；只消费已生成 enum。

## 9. 测试与校验

| Check            | Required | Command / Evidence                                      | Result  | Gap / Reason |
| ---------------- | -------- | ------------------------------------------------------- | ------- | ------------ |
| Markdown         | yes      | `corepack pnpm run format:md:check`; `git diff --check` | pending |              |
| Admin lint       | yes      | `corepack pnpm nx lint poms-admin`                      | pending |              |
| Admin build      | yes      | `corepack pnpm nx build poms-admin`                     | pending |              |
| Admin unit tests | targeted | `corepack pnpm nx test poms-admin --runInBand`          | pending |              |
| API / OpenAPI    | no       | N/A                                                     | N/A     | 不改 API     |
| Migration        | no       | N/A                                                     | N/A     | 不改 DDL     |

## 10. 例外与风险

| Exception ID | Level | Scope                               | Approved By | Cleanup Owner | Cleanup Due | Notes                                             |
| ------------ | ----- | ----------------------------------- | ----------- | ------------- | ----------- | ------------------------------------------------- |
| FE52-E1      | E1    | demo/template/mail/chat/CMS mock UI | Codex       | `EX-57`       | 2026-05-10  | 非 POMS 业务枚举，不纳入本轮领域枚举收口。        |
| FE52-E2      | E1    | 开放 taxonomy 局部 label map        | Codex       | `EX-57`       | 2026-05-10  | 需由后续业务切片冻结，当前不强制 generated enum。 |

## 11. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-02`
- Conditions:
  - 先执行 `FE-52A`，再推进 CRM / 项目合同提成页面。
  - 不修改 API、DDL、权限、状态机。
  - 不引入旧值兼容或中文 enum value。
