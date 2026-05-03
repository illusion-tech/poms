# FE-52D Admin 枚举残留扫描与例外清单

**文档状态**: Review / G3
**最后更新**: 2026-05-03
**所属父切片**: `FE-52`
**适用范围**: Admin 前端枚举消费尾项、残留扫描分类、`EX-57` 回归扫描输入

---

## 1. 切片目标

`FE-52D` 是 `FE-52` 的收尾切片，目标不是继续扩大业务改造，而是完成三件事：

1. 补齐 `FE-52B` / `FE-52C` 后仍能安全收口的 Admin generated enum 消费尾项。
2. 对剩余裸字符串做分类，区分闭合领域枚举、开放 taxonomy、路由参数、demo/template UI 和 generated client 仍为 `string` 的字段。
3. 为 `EX-57` 建立回归扫描和允许清单提供输入，后续新增业务枚举不得绕过 generated enum 或 shared value object。

本切片不改 API、DTO、数据库、权限、页面交互和业务流程。

---

## 2. 本轮已收口项

| 文件                                                                               | 收口内容                                                                                                 |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `libs/admin/data-access/src/index.ts`                                              | 补齐项目技术成本、投标商务、报价毛利、合同承接、项目移交等 Admin 侧需要消费的 generated enum re-export。 |
| `libs/admin/data-access/src/lib/commission/commission.store.ts`                    | 提成计算、规则版本、发放、调整统计改为 `Commission*Status` enum 常量。                                   |
| `apps/poms-admin/src/app/features/project/project-contract-handover.ts`            | 合同承接、再基线化、回款计划、项目移交、参与人确认、回款判断状态改为 generated enum key 映射。           |
| `apps/poms-admin/src/app/features/commission/project-commission-freeze-binding.ts` | 冻结版本状态、项目移交状态、参与人确认状态、回款判断来源、有效基线来源改为 generated enum key 映射。     |
| `apps/poms-admin/src/app/features/project/project-presentation.ts`                 | 项目工作区 guide 的项目状态和阶段判断改为 `ProjectStatus` / `ProjectStage` enum 常量。                   |
| `apps/poms-admin/src/app/features/project/project-detail.ts`                       | 当前归档记录判断改为 `ProjectArchiveRecordSummaryStatusEnum.Recorded`。                                  |
| `apps/poms-admin/src/app/features/*/*.spec.ts`                                     | 项目、合同、提成、待办导航等 focused fixtures 中的闭合状态 / 类型字段改为 generated enum 常量。          |

---

## 3. 扫描命令

本轮扫描使用以下命令作为 `FE-52D` G3 证据：

```powershell
rg -n "'[^']+' as const|status === '|status !== '|Record<string, string>|Object\.entries\(.*LABELS\)" apps\poms-admin\src\app\features apps\poms-admin\src\app\shared libs\admin\data-access\src -g "*.ts"
rg -n "status:\s*'|type:\s*'|sourceType:\s*'|targetType:\s*'|stage:\s*'|decision:\s*'|mode:\s*'|category:\s*'|priority:\s*'|handoverStatus:\s*'|diffLevel:\s*'|reviewStatus:\s*'|packageStatus:\s*'|guardDecision:\s*'" apps\poms-admin\src\app\features apps\poms-admin\src\app\shared libs\admin\data-access\src -g "*.spec.ts"
rg -n "status: string|type: string|sourceType: string|targetType: string|stage: string|decision: string|mode: string|category: string|severity: string|receiptJudgmentMode: string|participantRoleKey: string|costSubtype: string|costSubcategory: string" libs\shared\api-client\model -g "*.ts"
```

---

## 4. 剩余残留分类

### 4.1 允许作为扫描例外的非领域枚举

| 类别               | 示例                                                                                           | 处理口径                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 路由 query params  | `todo-navigation.ts` / `project-detail.spec.ts` 的 `Record<string, string>`                    | 这是 URL 参数结构，不是领域状态枚举。                             |
| Promise settlement | `Promise.allSettled()` 返回的 `fulfilled`                                                      | JavaScript 标准 API discriminant，不属于 POMS 领域枚举。          |
| UI-only severity   | `success` / `warn` / `danger` / `secondary`                                                    | PrimeNG tag severity 和展示层颜色语义，保留在 UI 层。             |
| demo/template UI   | `tasklist`、`dashboard/marketing`、`landing`、`files.ts` icon map                              | 非 POMS 业务事实源，后续如纳入业务页面需单独治理。                |
| 泛型展示 helper    | `status-presentation.ts` / `project-presentation.ts` 的泛型 `Readonly<Record<string, string>>` | 用于已经 enum-keyed 的 label map 复用，不表示新的业务 code 集合。 |

### 4.2 开放 taxonomy 或后端仍为 string 的字段

| 字段 / 位置                                                              | 当前原因                                                                  | 后续处理                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `project-detail.ts` 的 `BLOCKING_REASON_LABELS`                          | 阻断原因是开放 taxonomy，目前后端未冻结闭合枚举。                         | `EX-57` 先列为开放 taxonomy；若要闭合，需另起后端治理切片。           |
| `project-presentation.ts` 的 `SIGNAL_LEVEL_LABELS`                       | 经营信号与风险等级有大小写归一展示桥接。                                  | `EX-57` 扫描规则应允许该归一 helper，但禁止新增业务页面自造同类 map。 |
| `project-commission-freeze-binding.ts` 的 `RECEIPT_JUDGMENT_MODE_LABELS` | `receiptJudgmentMode` 在 generated client 中仍为 `string/null`。          | 后端 DTO 枚举化后再切到 generated enum。                              |
| `project-commission-freeze-binding.ts` 的 `ROLE_TYPE_LABELS`             | 参与人角色 key 当前来自 JSON 责任边界，generated client 暴露为 `string`。 | 需要先冻结责任角色 taxonomy，再进入后端 / 前端收口。                  |
| `profile/current-user-profile.ts` 的更新类型 label                       | 个人资料更新摘要是展示型事件分类，不在本轮业务枚举治理范围。              | `EX-57` 记录为低优先级候选，若进入审计 taxonomy 再治理。              |

### 4.3 generated client string gap

这些字段仍由 OpenAPI generated client 暴露为 `string`，不能在前端伪造 enum：

| generated model                                             | 字段                               |
| ----------------------------------------------------------- | ---------------------------------- |
| `audit-log-summary.ts`                                      | `targetType: string`               |
| `command-result.ts`                                         | `targetType: string`               |
| `readiness-initialization-result.ts`                        | `targetType: string`               |
| `payment-record-summary.ts`                                 | `sourceType: string`               |
| `receipt-record-summary.ts`                                 | `sourceType: string`               |
| `project-detail-confirmation-summary.ts`                    | `status: string`                   |
| `project-actual-cost-record-summary.ts` / `detail-view.ts`  | `costSubtype: string/null`         |
| `project-technical-cost-item-view.ts`                       | `costSubcategory: string/null`     |
| `project-handover-participant-confirmation-item.ts` / input | `participantRoleKey: string`       |
| `project-handover-receipt-judgment-mode-summary.ts`         | `receiptJudgmentMode: string/null` |

`EX-57` 需要把这些作为扫描基线输入：如果字段本身确实应该闭合，优先在后端 DTO / shared contract 侧治理；前端不得用本地字符串 enum 代替 generated enum。

---

## 5. EX-57 输入规则

建议 `EX-57` 建立三层扫描：

1. **必须失败**: POMS 业务页面 / store / specs 中对 `status`、`type`、`sourceType`、`targetType`、`stage`、`decision`、`mode`、`category`、`priority` 的新裸字符串比较或 fixture 默认值。
2. **允许但需命中白名单**: query params、Promise settlement、UI-only severity、demo/template UI、泛型展示 helper。
3. **需要后端治理再收口**: generated client 仍为 `string` 的业务字段，不允许前端自行定义本地闭合枚举。

---

## 6. 验证记录

| 命令                                                | 结果                                                        |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `corepack pnpm nx lint poms-admin`                  | 通过                                                        |
| `corepack pnpm nx test poms-admin --runInBand`      | 通过，29 suites / 164 tests                                 |
| `corepack pnpm nx build poms-admin --skip-nx-cache` | 通过；仍有既有 initial bundle budget warning，超出 12.87 kB |
| `corepack pnpm run format:md:check`                 | 通过                                                        |
| `git diff --check`                                  | 通过                                                        |

---

## 7. G3 结论

`FE-52D` 已完成 Admin 前端枚举消费尾项收口和残留分类。当前剩余项不属于可在前端直接补 enum 的闭合 generated enum 消费问题，后续由 `EX-57` 建立扫描与白名单，并由新的后端治理切片处理仍暴露为 `string` 的业务字段。
