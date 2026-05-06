# EX-56 Domain Enum Literal Governance Baseline

- Task ID: `EX-56`
- Slice type: `docs-only / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-56`
- Public route surface: no new, changed or removed public route in this slice.
- Status: `G4`
- G1 Date: 2026-05-01
- G4 Date: 2026-05-01

## 1. Scope

本片冻结 POMS 领域枚举与字符串字面量治理规则，用于后续 `EX-56A` 到 `EX-57` 的分片改造。

本次目标:

1. 明确 `shared-contracts` 是领域枚举语义的第一事实源。
2. 冻结后端、共享契约、OpenAPI generated client、Admin 前端和 DB check 的枚举使用规则。
3. 区分“应该枚举化的封闭集合”和“允许继续使用字符串的开放文本 / 外部标识”。
4. 固定项目状态、待办 / 审批、CRM 域、财务 / 提成 / 成本域的实施顺序。
5. 建立后续回归扫描和例外清单的最低要求。

## 2. Out Of Scope

1. 本片不修改运行时代码、DTO、entity、OpenAPI、generated client、migration 或前端页面。
2. 本片不新增 TypeScript native `enum` 作为后端领域 SSOT。
3. 本片不把所有字符串字段强行枚举化。
4. 本片不调整任何业务状态机的业务含义。
5. 本片不新增数据库 enum 类型；当前治理继续以 `varchar + check constraint + typed contract` 为默认实现。

## 3. Static Sweep Summary

2026-05-01 对业务源码做静态抽样和 AST 扫描后，确认存在以下债务:

| Area                | Finding                                                                                          | Governance Decision                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Shared contracts    | 已存在大量 `as const` + `z.enum`，但部分视图字段仍写 `z.string()`。                              | 后续切片必须优先把已有领域枚举接回 schema 字段。                          |
| API entities        | 多数新 CRM 切片已用 `p.string().$type<T>()`，但项目、待办、审批和部分成本表仍是裸 `p.string()`。 | 持久化 enum-like 字段必须补 `$type<T>()`，高价值状态字段还要有 DB check。 |
| Service logic       | 状态流转中仍大量比较或赋值 `'active'`、`'closed'`、`'converted'`、`'confirmed'` 等字面量。       | 状态机逻辑必须改用 shared value object 或 generated enum。                |
| Generated client    | OpenAPI 已生成约百余个 enum，但前端部分页面仍自造常量或使用 `as Type`。                          | Admin 层通过 `admin-data-access` 统一 re-export 可消费 enum。             |
| Cross-domain labels | 状态 label / severity helper 使用本地 key，和 generated enum 的连接不稳定。                      | FE 收口时统一以 domain enum 作为 key。                                    |
| Intentional strings | `reason`、`summary`、`description`、`roleCode`、`permissionKey`、外部来源 code 等是开放值。      | 不纳入强制枚举化，只在必要处增加格式或长度校验。                          |

## 4. Formal Inputs

| Input Type                | Document / Source                                             | Status   | Notes                                                                                |
| ------------------------- | ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| Governance gates          | `docs/design/implementation-governance-gates.md`              | Active   | 本片为 docs-only governance slice，完成后下游切片仍需单独 G1。                       |
| Delivery guide            | `docs/design/implementation-delivery-guide.md`                | Active   | 后续运行时切片按风险分层补 lint、build、test、OpenAPI、migration check。             |
| Tracker                   | `docs/design/phase2-development-execution-tracker.md`         | Active   | `EX-56A`、`EX-56B`、`EX-56C`、`EX-56D`、`FE-52`、`EX-57` 已拆分为后续切片。          |
| Shared contract source    | `libs/shared/contracts/src/lib/shared-contracts.ts`           | Existing | 领域枚举默认使用 `const array -> type -> z.enum -> generated client enum` 链路。     |
| Generated client          | `libs/shared/api-client/model/*.ts`                           | Existing | 前端运行时可消费的 enum 来自 OpenAPI generator，不手写重复 enum。                    |
| Current runtime evidence  | `apps/poms-api/src/app/features/**`                           | Existing | 实体和服务层仍存在 enum-like 裸字符串，后续分片按风险域收敛。                        |
| Current frontend evidence | `apps/poms-admin/src/app/**`、`libs/admin/data-access/src/**` | Existing | 业务页面、store 和 presentation helper 需要在后续 FE 切片中统一 enum 消费。          |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                | N/A      | 本片不触及 public route surface；后续如不新增 route，也无需 route inventory 新增行。 |

## 5. SSOT

| Concern                   | Source Of Truth                                           | Implementation Rule                                                                                       |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Domain enum values        | `libs/shared/contracts/src/lib/shared-contracts.ts`       | 每个封闭领域集合先定义 `FOO_VALUES as const`，再导出 `Foo` type、`FooSchema` 和 `FooValue` value object。 |
| Request / response schema | Zod schema in `shared-contracts`                          | DTO 字段不得退化为 `z.string()`，除非它是开放文本、外部 code 或本片允许清单内字段。                       |
| OpenAPI / generated enum  | Generated from `shared-contracts`                         | Admin 前端优先使用 `@poms/shared-api-client` 生成 enum；`admin-data-access` 负责 re-export 常用 enum。    |
| Backend persistence type  | Shared domain type imported from `@poms/shared-contracts` | MikroORM `p.string()` 承载 enum-like 字段时必须使用 `$type<Foo>()`；关键状态字段必须补 DB check。         |
| DB value guard            | Migration / entity check constraint                       | 业务状态、阶段、生命周期、分类、安全等级等封闭集合需要 check constraint；外部开放 code 不强制 check。     |
| Service state machine     | Shared value object or generated enum equivalent          | 服务层不得直接比较或赋值裸字符串；状态转移矩阵可使用 `readonly Foo[]`，元素来自统一 value object。        |
| Frontend display          | Generated enum re-export + status presentation helper     | label / severity / filter option 以 enum 为 key；不得靠 `as Type` 把字符串转成合法值。                    |
| Exceptions                | `EX-56` baseline and `EX-57` scan allowlist               | 无法或不应枚举化的字段必须进入 allowlist，并说明原因。                                                    |

## 6. Required Value Object Pattern

后端和 shared contract 层默认采用下面模式。后续切片可按已有文件风格微调命名，但语义必须一致。

```ts
export const PROJECT_STATUSES = ['active', 'pending-approval', 'blocked', 'on-hold', 'completed', 'closed'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ProjectStatusSchema = z.enum(PROJECT_STATUSES).meta({ id: 'ProjectStatus' });

export const ProjectStatusValue = {
    Active: 'active',
    PendingApproval: 'pending-approval',
    Blocked: 'blocked',
    OnHold: 'on-hold',
    Completed: 'completed',
    Closed: 'closed'
} as const satisfies Record<string, ProjectStatus>;
```

Rules:

1. `PROJECT_STATUSES` 保持值列表，是 `z.enum` 和扫描脚本的输入。
2. `ProjectStatus` 是后端 entity、service、query 和 shared schema 的类型。
3. `ProjectStatusValue` 是运行时代码使用的值对象，替代裸字符串。
4. generated client 仍由 OpenAPI 输出 enum；Admin 前端使用 generated enum 或由 `admin-data-access` 统一 re-export 的 enum。
5. 不在后端业务源码中直接 import generated client enum，避免 API server 依赖 generated frontend client。

## 7. Classification Rules

### 7.1 Must Be Enum-Like

以下字段一旦出现在 DTO、entity、query、service 或 frontend 展示中，默认必须使用领域枚举或 value object:

| Field Pattern                                                  | Examples                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `status`, `currentStatus`, `snapshotStatus`, `recordStatus`    | project status, lead status, attachment status, payout status                               |
| `stage`, `currentStage`, `stageType`, `anchorStage`            | project stage, payout stage, archive anchor stage                                           |
| `type`, `targetType`, `sourceType`, `relationType`, `todoType` | attachment target, todo source, business object target, source record type                  |
| `category`, `securityLevel`, `priority`, `urgency`, `rating`   | attachment category, security level, todo priority, lead urgency, lead rating               |
| `mode`, `decision`, `result`, `outcome`, `actionLevel`         | projection mode, bid decision, acceptance result, follow-up outcome, operating action level |
| `scope`, `lifecycleScope`, `selectionSource`                   | follow-up lifecycle scope, baseline selection source                                        |

### 7.2 May Remain String

以下字段可以继续使用 string，但必须有长度、格式或业务说明:

| Field Pattern                              | Reason                                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `reason`, `summary`, `description`, `note` | 用户输入或业务叙述，不是封闭集合。                                                     |
| `roleKey`, `roleCode`, `permissionKey`     | 平台配置 key，虽然有约束，但通常由权限 registry 或 seed 数据治理，不用业务 enum 替代。 |
| `sourceChannel`, `sourceSummary`           | 来源名称快照或开放渠道描述，不等同于 `sourceType`。                                    |
| `externalId`, `sourceRecordId`, `code`     | 外部系统标识或字典编码，值域来自外部或运营配置。                                       |
| `mimeType`, `extension`, `storageKey`      | 技术元数据，使用格式校验 / allowlist，而非业务 enum。                                  |
| UI-only state inside demo/template pages   | 不进入正式业务路由的 Poseidon demo 不纳入本专项。                                      |

### 7.3 Needs Case-By-Case G1 Decision

以下字段需要在后续切片 G1 中判定:

1. `businessDomain`: 若只用于系统内部固定域，应枚举；若允许扩展插件域，可用 registry。
2. `eventType`: 审计事件可以采用 registry + const value object，未必适合单一大 enum。
3. `projectionLevel`: 若只存在固定视图级别，应枚举；若来自可配置投影策略，可保留 string + registry。
4. `ownerRole` / `responsibleRole`: 当前多为业务文本角色，不默认改 enum；若后续绑定平台 role，则另开切片。

## 8. Persistence Rules

后续触及持久化的枚举治理切片必须满足:

1. `p.string().$type<Foo>()` 和 shared `Foo` 类型一致。
2. 新增或修复 check constraint 时，migration 与 entity check 文案必须同值域。
3. 若字段已有历史数据，G1 必须判断是否需要 data backfill / cleanup SQL。
4. 若只是 TypeScript 类型收紧且 DDL 已有 check，仍需运行 `migration-check` 或说明不需要的理由。
5. 不得在一个大 migration 中混改多个无关业务域的状态机。

## 9. Contract And Generated Client Rules

1. 已有 `z.enum` 的字段不得在 view schema 中降级为 `z.string()`。
2. 若 generated client 输出的是 request-local enum，例如 `CreateProjectBidCommercialProcessRequestBidModeEnum`，但同一值域也在 summary view 中重复出现，后续切片应优先提取成命名 schema，避免 OpenAPI 生成多个临时 enum。
3. `admin-data-access` 只 re-export 前端需要消费的 enum 和类型，不重新定义值。
4. 新增 enum 或替换 `z.string()` 为 `z.enum()` 后必须运行 OpenAPI generation 和 `shared-api-client:check`。

## 10. Service And Query Rules

1. 状态判断必须使用 value object，例如 `ProjectStatusValue.Closed`。
2. 状态集合必须使用 typed readonly arrays，例如 `const TERMINAL_PROJECT_STAGES: readonly ProjectStage[] = [...]`。
3. query 过滤参数必须使用领域类型，例如 `{ status?: ProjectStatus }`。
4. 业务状态机转换建议集中为 helper 或方法，减少 service 内散落赋值。
5. 错误消息可以展示实际状态值，但状态值来源仍必须是 typed field。

## 11. Frontend Rules

1. 业务页面不得新增本地 `const FOO = { active: 'active' as Foo }` 形式的值对象。
2. 表格筛选、标签、severity helper 使用 generated enum 或 `admin-data-access` re-export enum。
3. `Record<Foo, string>` 可以用于 label，但 key 必须来自正式 enum type。
4. 默认值不得使用 `'active' as Foo`；必须来自 enum 成员或统一 value object。
5. 对未知历史值的 fallback 只允许存在于展示 helper，不得作为创建 / 更新请求输入。

## 12. Downstream Slice Plan

| Slice    | Type                  | Scope                                                                                                        | Validation Minimum                                                                                          |
| -------- | --------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `EX-56A` | cross-layer-high-risk | Project status / stage contract, entity, service, query, generated client and Admin displays.                | API/admin lint/build, focused backend/frontend tests, OpenAPI/client check, migration-check if DDL changes. |
| `EX-56B` | cross-layer-high-risk | Todo / approval / target object type / business domain enums and reminder deep-link stability.               | API/admin focused tests, workbench/topbar navigation tests, OpenAPI/client check if contract changes.       |
| `EX-56C` | cross-layer           | Customer, Lead, Attachment and SalesFollowUp existing enums, cast cleanup and DB check alignment.            | API/admin focused tests, OpenAPI/client check, migration-check if checks change.                            |
| `EX-56D` | cross-layer-high-risk | Contract finance, project cost and commission status/source/snapshot/action enums with risk-based sub-split. | Must create G1 checklist first; split into child slices if field count is too large.                        |
| `FE-52`  | frontend-only         | Admin enum consumption and status presentation cleanup after backend/generated client is stable.             | `poms-admin` lint/build and focused component/store tests.                                                  |
| `EX-57`  | process / governance  | Static scan, allowlist and prevention rule for new enum-like naked strings.                                  | scanner evidence, Markdown checks, optional package script if accepted.                                     |

## 13. Initial Priority

Implementation order is fixed unless a later G1 explicitly reorders it:

1. `EX-56A`: Project status and stage. This is the main state machine and already has shared constants but view schemas and entity are not typed enough.
2. `EX-56B`: Todo / approval / target object types. These values connect workbench, topbar and deep links.
3. `EX-56C`: New CRM domains. These have newer contracts and lower blast radius, so the cleanup should be straightforward.
4. `EX-56D`: Finance / commission / cost. This has high volume and must be split if a single G1 cannot freeze a safe boundary.
5. `FE-52`: Frontend consumption cleanup after generated enum surface stabilizes.
6. `EX-57`: Regression scan after the main cleanup cuts are closed.

## 14. Exceptions And Accepted Boundaries

| ID                                     | Level  | Scope                         | Decision                                                                                             | Cleanup Owner | Cleanup Due |
| -------------------------------------- | ------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| `EX56-E1-NO-TS-NATIVE-ENUM-SSOT`       | Low    | Domain modeling               | Backend domain SSOT remains `as const` + union type + `z.enum`; generated client may emit enum.      | N/A           | Accepted    |
| `EX56-E2-NO-DB-ENUM-TYPE`              | Low    | Persistence                   | Use `varchar + check constraint`; do not introduce PostgreSQL enum types in this governance cut.     | Future        | TBD         |
| `EX56-E3-OPEN-STRING-FIELDS-ALLOWLIST` | Medium | Open text / external metadata | `reason` / `summary` / external code fields remain string and must be excluded by scanner allowlist. | `EX-57`       | G4          |
| `EX56-E4-FINANCE-COST-SPLIT-PERMITTED` | Medium | `EX-56D` scope                | `EX-56D` may split into child slices if G1 identifies excessive field count or migration risk.       | `EX-56D`      | G1          |
| `EX56-E5-DEMO-TEMPLATE-OUT-OF-SCOPE`   | Low    | Poseidon demo pages           | Demo / template pages outside formal POMS routes are excluded unless later promoted to product.      | N/A           | Accepted    |

## 15. Tests And Checks

This slice is docs-only / governance.

Required:

- `corepack pnpm run format:md`
- `corepack pnpm run format:md:check`
- `git diff --check`

Not required for this slice:

- `poms-api` lint / build / tests, because no runtime backend files are changed.
- `poms-admin` lint / build / tests, because no runtime frontend files are changed.
- OpenAPI / generated client checks, because no public contract changes are made.
- Migration check, because no DDL changes are made.

## 16. G4 Closeout

Status: `Done`

Delivered:

1. POMS domain enum SSOT and value object pattern are frozen.
2. Closed-set enum-like fields and accepted open string fields are separated.
3. Persistence, contract, service/query and frontend enum usage rules are explicit.
4. `EX-56A` through `EX-57` have stable scope and dependency ordering.
5. Runtime implementation is intentionally deferred to downstream slices.
