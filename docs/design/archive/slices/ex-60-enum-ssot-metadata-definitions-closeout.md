# EX-60 枚举 SSOT 形态收敛与 metadata definitions 治理收口

- Task ID: `EX-60`
- Slice type: `contract / frontend / governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-60` through `EX-60F`
- Public route surface: no new, changed or removed public route.
- Status: `G4`
- G4 Date: 2026-05-04

## 1. Delivered Scope

本片完成枚举 SSOT 形态收敛的 A-F 子切片：

1. 新增 `defineEnumDefinitions`、`defineSeverityEnumDefinitions`、`enumDefinitionValues`、`enumDefinitionValueObject`、`enumDefinitionLabels`、`enumDefinitionOptions`、`enumDefinitionSeverities` 和 `enumObjectValues` helper。
2. `LeadGateMissingItem` 改为 metadata definitions SSOT，后端 gate explanation 改用 shared label map。
3. CRM 展示型枚举收敛到 shared metadata，包括客户 / 线索状态、线索预算 / 紧迫程度 / 评级、附件安全级别、销售跟进结果与记录状态。
4. 项目、合同、合同准备、合同移交、项目移交、签约前技术 / 招投标 / 报价毛利工作区的展示型枚举收敛到 shared metadata。
5. 财务记录、审批 / 待办、提成计算 / 发放 / 调整 / 结算、规则解释、经营信号和基线来源补齐 label / severity / options metadata。
6. 通用 lifecycle、platform permission、audit / security 低层枚举改为 Value object SSOT 派生数组 / schema。
7. Admin 端 `status-presentation`、`project-presentation`、线索列表、附件面板、销售跟进面板、合同移交、提成冻结绑定和签约前工作区改为消费 shared metadata。
8. 附件上传默认分类不再硬编码 `demand`，改为读取首个 active `AttachmentCategory` 字典项。

## 2. Governance Outcome

| Area                   | Outcome                                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Closed business enums  | 使用 metadata definitions 派生 values / schema / value object / label / severity / options。          |
| Shared low-level enums | 使用 Value object 派生数组和 schema，避免低层枚举引入 label 噪音。                                    |
| Runtime dictionaries   | `AttachmentCategory`、`SalesFollowUpType`、`ExpenseCategory` 等继续走 `dictionary_item`，不前端伪造。 |
| Admin presentation     | 不再本地重复维护已治理闭合枚举的中文 label / severity。                                               |
| Enum-like scan         | 保持通过，200 findings 全部由 22 条显式 allowlist 分类。                                              |

## 3. Drift Handling

| Drift                                                         | Classification            | Resolution                                                                                          |
| ------------------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| `ContractReadinessStatus` shared label 初始写成“有条件放行”。 | `new-real-drift`          | 对齐原 Admin 展示口径为“有条件就绪”，并同步 guard / item labels，避免无意改变页面文案。             |
| `AttachmentPanel` 默认上传分类仍硬编码 `demand`。             | `new-real-drift`          | 改为首个 active attachment category 字典项，测试 fixture 使用局部常量表达 runtime dictionary code。 |
| `poms-admin` build initial bundle budget warning。            | `existing-baseline-drift` | 不属于本片范围；构建通过，保留既有预算 warning。                                                    |

## 4. Validation Evidence

| Check                                            | Result                                           |
| ------------------------------------------------ | ------------------------------------------------ |
| `corepack pnpm nx build shared-contracts`        | Passed                                           |
| `corepack pnpm nx build poms-api`                | Passed                                           |
| `corepack pnpm nx build poms-admin`              | Passed, with existing initial bundle warning     |
| `corepack pnpm nx lint poms-api`                 | Passed                                           |
| `corepack pnpm nx lint poms-admin`               | Passed                                           |
| `corepack pnpm nx test poms-api`                 | Passed, 46 suites / 561 tests                    |
| `corepack pnpm nx test poms-admin --watch=false` | Passed, 29 suites / 164 tests                    |
| `corepack pnpm nx run poms-api:openapi`          | Passed                                           |
| `corepack pnpm nx run shared-api-client:check`   | Passed, with existing OpenAPI generator warnings |
| `corepack pnpm run check:enum-like-strings`      | Passed, 200 findings / 22 allowlist entries      |
| `corepack pnpm run format:md:check`              | Passed                                           |
| `git diff --check`                               | Passed                                           |

## 5. G4 Conclusion

- Gate Status: `Pass`.
- Delivered boundary matches `EX-60A` through `EX-60F`.
- No runtime compatibility mapping, old value fallback, Chinese code value or DB migration was introduced.
