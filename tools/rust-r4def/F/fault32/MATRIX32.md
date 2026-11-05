# fault32 实际验收矩阵候选

以下全部 planned-not-run。每个场景由真实 API 生产独立受控 fixture。完整方法 / 路由 / opId / 成功状态来自冻结 operation-map06，详见 matrix32.json。P0是建议执行优先级，未跑场景不能因其他场景通过而计为Pass。

| 场景                             | 优先级 | 真实 operation                                                                                                        | 注入 / 屏障                  |
| -------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| F01-stage-evidence               | P1     | `ProjectCostController_confirmCostStageAttribution`                                                                   | `f-evidence`                 |
| F02-stage-attribution            | P0     | `ProjectCostController_confirmCostStageAttribution`                                                                   | `f-stage-insert`             |
| F03-stage-cost-update            | P0     | `ProjectCostController_confirmCostStageAttribution`                                                                   | `f-stage-cost-update`        |
| F04-stage-audit                  | P0     | `ProjectCostController_confirmCostStageAttribution`                                                                   | `business-audit`             |
| F05-stage-pending-auth           | P0     | `ProjectCostController_confirmCostStageAttribution`                                                                   | `pending-auth`               |
| F06-reclass-attribution          | P1     | `ProjectCostController_reclassifyCostStageAttribution`                                                                | `f-stage-insert`             |
| F07-reclass-audit                | P1     | `ProjectCostController_reclassifyCostStageAttribution`                                                                | `business-audit`             |
| F08-basis-evidence               | P1     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `f-evidence`                 |
| F09-basis-row                    | P1     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `f-basis-insert`             |
| F10-basis-second-source          | P0     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `f-source-insert`            |
| F11-basis-second-result-evidence | P1     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `f-result-evidence`          |
| F12-basis-second-result          | P0     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `f-result-insert`            |
| F13-basis-audit                  | P0     | `ProjectCostController_confirmSharedCostAllocationBasis`                                                              | `business-audit`             |
| F14-replace-old-basis            | P1     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-old-basis-supersede`      |
| F15-replace-old-result           | P1     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-old-result-supersede`     |
| F16-replace-release-source       | P0     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-old-source-release`       |
| F17-replace-new-basis            | P1     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-basis-insert`             |
| F18-replace-new-source           | P0     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-source-insert`            |
| F19-replace-second-result        | P0     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `f-result-insert`            |
| F20-replace-final-audit          | P0     | `ProjectCostController_replaceSharedCostAllocationResult`                                                             | `business-audit`             |
| F21-tax-evidence                 | P1     | `ProjectCostController_confirmAccountingTaxTreatment`                                                                 | `f-evidence`                 |
| F22-tax-record                   | P1     | `ProjectCostController_confirmAccountingTaxTreatment`                                                                 | `f-tax-insert`               |
| F23-tax-replace-record           | P1     | `ProjectCostController_replaceAccountingTaxTreatment`                                                                 | `f-tax-insert`               |
| F24-tax-replace-audit            | P1     | `ProjectCostController_replaceAccountingTaxTreatment`                                                                 | `business-audit`             |
| F25-tax-replace-pending-auth     | P0     | `ProjectCostController_replaceAccountingTaxTreatment`                                                                 | `pending-auth`               |
| E26-map-cost-row                 | P0     | `ProjectCostController_createProjectActualCostRecord`                                                                 | `e-cost-insert`              |
| E27-map-audit                    | P0     | `ProjectCostController_createProjectActualCostRecord`                                                                 | `business-audit`             |
| E28-map-pending-auth             | P0     | `ProjectCostController_createProjectActualCostRecord`                                                                 | `pending-auth`               |
| E29-expense-row                  | P1     | `ProjectCostController_createExpenseRecord`                                                                           | `e-expense-insert`           |
| E30-expense-audit                | P1     | `ProjectCostController_createExpenseRecord`                                                                           | `business-audit`             |
| E31-labor-replace-row            | P0     | `ProjectCostController_replaceLaborCostRecord`                                                                        | `e-labor-replacement-insert` |
| E32-labor-replace-audit          | P0     | `ProjectCostController_replaceLaborCostRecord`                                                                        | `business-audit`             |
| E33-labor-replace-pending-auth   | P0     | `ProjectCostController_replaceLaborCostRecord`                                                                        | `pending-auth`               |
| F34-masked-get-security          | P0     | `ProjectCostController_getSharedCostAllocationBasis`                                                                  | `projection-security-event`  |
| F35-masked-get-pending-auth      | P0     | `ProjectCostController_getSharedCostAllocationBasis`                                                                  | `pending-auth`               |
| C01-one-stage-winner             | P0     | `ProjectCostController_confirmCostStageAttribution` / `ProjectCostController_confirmCostStageAttribution`             | f-stage-cost-update          |
| C02-intersecting-source-sets     | P0     | `ProjectCostController_confirmSharedCostAllocationBasis` / `ProjectCostController_confirmSharedCostAllocationBasis`   | f-source-insert              |
| C03-complete-replacement-winner  | P0     | `ProjectCostController_replaceSharedCostAllocationResult` / `ProjectCostController_replaceSharedCostAllocationResult` | f-result-insert              |
| C04-one-source-mapping           | P0     | `ProjectCostController_createProjectActualCostRecord` / `ProjectCostController_createProjectActualCostRecord`         | e-cost-insert                |
| C05-E-replace-before-F-stage     | P0     | `ProjectCostController_replaceLaborCostRecord` / `ProjectCostController_confirmCostStageAttribution`                  | e-labor-replacement-insert   |
| C06-F-stage-before-E-replace     | P0     | `ProjectCostController_confirmCostStageAttribution` / `ProjectCostController_replaceLaborCostRecord`                  | f-stage-cost-update          |
| C07-sorted-rate-families         | P1     | `ProjectCostController_confirmSharedCostAllocationBasis` / `ProjectCostController_confirmSharedCostAllocationBasis`   | production rate family lock  |
