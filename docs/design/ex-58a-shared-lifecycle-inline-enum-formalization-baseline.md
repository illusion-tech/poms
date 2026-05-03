# EX-58A 共享生命周期与 inline enum 正式化基线

- Task ID: `EX-58A`
- Slice type: `contract / refactor`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-58A`
- Public route surface: no new, changed or removed public route in this slice.
- Status: `G1`
- G1 Date: 2026-05-03

## 1. Scope

本片承接 `EX-58`，只治理 shared contract 中的 enum 形态：

1. 把 shared contracts 中仍直接写在 schema 字段里的 inline `z.enum([...])` 提取为命名 const / type / schema / value object。
2. 对重复出现的 lifecycle 值域建立共享 family 名称，先提供统一 schema，不直接替换所有业务 enum。
3. 让 generated client 能产出稳定命名 enum，减少 request-local / anonymous enum。
4. 为 `EX-58B` code value direct cutover 和 `EX-59` 扫描扩展提供稳定输入。

本片不做：

1. 不修改 DB 值、migration、entity、service 状态机或 Admin 页面行为。
2. 不把配置型枚举转字典；这由 `EX-58C` 承接。
3. 不统一 `void` / snake case / UPPER_SNAKE 等代码值；这由 `EX-58B` 承接。
4. 不新增 public route。

## 2. Formal Inputs

| Input Type                 | Document / Source                                                   | Status  | Notes                                                   |
| -------------------------- | ------------------------------------------------------------------- | ------- | ------------------------------------------------------- |
| Parent governance          | `docs/design/ex-58-enum-semantic-model-refinement-baseline.md`      | Stable  | 冻结语义分类、code value policy 和后续拆片。            |
| Enum governance            | `docs/design/ex-56-domain-enum-literal-governance-baseline.md`      | Stable  | 冻结 shared-contracts SSOT 和 value object 模式。       |
| Regression scan            | `tools/check-enum-like-strings.ts`                                  | Stable  | 当前只覆盖 Admin / generated client；后端扩展由 EX-59。 |
| Shared contracts           | `libs/shared/contracts/src/lib/shared-contracts.ts`                 | Active  | 本片唯一运行时代码修改面。                              |
| OpenAPI / generated client | `libs/shared/api-spec/openapi.json`、`libs/shared/api-client/model` | Derived | 本片会因 schema 命名而更新 generated client。           |

## 3. Contract Boundary

### 3.1 Inline enum fields to formalize

| Area                | Current Fields                                                                                | Target                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Platform registry   | membership type、permission status / source type、navigation item type                        | Named schema + value object；不改变值。                      |
| Audit / security    | `AuditLogResult`、`SecurityEventResult`、`SecurityEventSeverity`                              | Add const arrays + value objects while retaining schema ids. |
| Commercial baseline | commercial release baseline status                                                            | Named `CommercialReleaseBaselineStatusSchema`。              |
| Contract handover   | baseline validation、current baseline、latest rebaseline、receivable init、handover status 等 | Named schemas，保持当前值不变。                              |
| Project handover    | participant status、confirmation status、receipt judgment freeze/source、handover status      | Named schemas，保持当前值不变。                              |
| Internal cost rate  | version status、scope type、rate unit                                                         | Named schema + value object，保持当前值不变。                |

### 3.2 Shared lifecycle families introduced

本片新增共享 lifecycle family，但只在 projection-only / future-facing schema 中使用；已存在业务状态是否替换由后续 G1 判断。

| Family                         | Values                     | Initial Use                         |
| ------------------------------ | -------------------------- | ----------------------------------- |
| `ActiveInactiveStatus`         | `active/inactive`          | 字典项和平台启停类状态的通用候选。  |
| `VersionLifecycleStatus`       | `active/superseded/voided` | 版本链 / 快照生命周期候选。         |
| `EffectiveSupersededStatus`    | `effective/superseded`     | 已生效版本包候选。                  |
| `ReadyBlockedMissingStatus`    | `ready/blocked/missing`    | 只读 readiness projection 候选。    |
| `AvailableMissingStatus`       | `available/missing`        | 只读 availability projection 候选。 |
| `PendingConfirmedClosedStatus` | `pending/confirmed/closed` | 确认参与人状态候选。                |

Rule：共享 family 的存在不代表所有同值域业务 enum 都必须合并。真正替换需要证明语义、流转、权限动作和历史要求一致。

## 4. Out Of Scope Fields

| Field / Pattern                      | Reason                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `z.enum([CustomerStatusValue...])`   | request-local subset，仍由 `CustomerStatus` 驱动。       |
| `InvoiceRecordPatchableStatus`       | subset schema，由 `InvoiceRecordStatusValue` 驱动。      |
| `CreatableOperatingSnapshotMode`     | subset schema，由 `OperatingSnapshotModeValue` 驱动。    |
| `ConfirmCostStageAttributionMode`    | subset schema，由 `CostStageAttributionModeValue` 驱动。 |
| `NonRetentionCommissionPayoutStage`  | subset schema，由 `CommissionPayoutStageValue` 驱动。    |
| `blockingReasons` / `allowedActions` | 开放原因 / 动作投影，继续 string。                       |

## 5. Validation

Required:

1. `corepack pnpm nx run poms-api:openapi`
2. `corepack pnpm nx run shared-api-client:check`
3. `corepack pnpm nx build poms-api`
4. `corepack pnpm run format:md:check`
5. `git diff --check`

Recommended:

1. `corepack pnpm nx build poms-admin` if generated client changes ripple into Admin compile.

Not required:

1. migration check, because this slice does not touch DDL.
2. API E2E, because no route behavior or persistence changes.

## 6. G1 Conclusion

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-03`
- Conditions:
  - Keep all persisted / API code values unchanged in this slice.
  - Generated client changes are expected only from schema naming / enum extraction.
  - If a value rename appears necessary, stop and move it to `EX-58B`.
