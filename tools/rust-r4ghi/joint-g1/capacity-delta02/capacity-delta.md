# G/H 聚合金额容量确认 delta02

**结论：不需要扩列。** 逐列核对94个迁移up()及当前ORM，20个既有G/H聚合金额列均为`numeric(18,2)`/`.precision(18).scale(2)`，不存在后来变为18,4的ALTER；新V1另8个金额字段也是18,2。最大值为`9999999999999999.99`，与E既有`MONEY_MAX=999999999999999999` cents一致。仅凭旧formatAmount输出4位小数不能推断存储scale。

Root已撤回经营列18,4的假设：现有18,4实际是technical-cost line的quantity/unit_price，金额列仍18,2。未提供或伪造catalog实测。`capacity-verification.sql`只是Root可选的只读检查输入，本任务未执行。

封存v1原件完全保留，本目录为追加澄清，未通过G1、未获G2准入，未改产品、执行SQL/HTTP/Git或读取凭证。

| 表.金额列 | ORM属性 | 迁移精度 | ORM精度 | 精确出处 |
| --- | --- | --- | --- | --- |
| `operating_baseline_package.original_baseline_cost` | `originalBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:148` / `operating-baseline-package.entity.ts:44` |
| `operating_baseline_package.change_package_total` | `changePackageTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:149` / `operating-baseline-package.entity.ts:45` |
| `operating_baseline_package.current_effective_baseline_cost` | `currentEffectiveBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:150` / `operating-baseline-package.entity.ts:46` |
| `change_package_baseline.change_amount` | `changeAmount` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:182` / `change-package-baseline.entity.ts:29` |
| `project_operating_snapshot.effective_contract_total` | `effectiveContractTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:210` / `project-operating-snapshot.entity.ts:60` |
| `project_operating_snapshot.receivable_confirmed_total` | `receivableConfirmedTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:211` / `project-operating-snapshot.entity.ts:61` |
| `project_operating_snapshot.included_cost_total` | `includedCostTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:212` / `project-operating-snapshot.entity.ts:62` |
| `project_operating_snapshot.original_baseline_cost` | `originalBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:213` / `project-operating-snapshot.entity.ts:63` |
| `project_operating_snapshot.current_effective_baseline_cost` | `currentEffectiveBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:214` / `project-operating-snapshot.entity.ts:64` |
| `project_operating_snapshot.gross_margin_amount` | `grossMarginAmount` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:215` / `project-operating-snapshot.entity.ts:65` |
| `project_operating_snapshot.tax_impact_pending_amount` | `taxImpactPendingAmount` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:218` / `project-operating-snapshot.entity.ts:68` |
| `period_closing_snapshot.effective_contract_total` | `effectiveContractTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:249` / `period-closing-snapshot.entity.ts:66` |
| `period_closing_snapshot.receivable_confirmed_total` | `receivableConfirmedTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:250` / `period-closing-snapshot.entity.ts:67` |
| `period_closing_snapshot.included_cost_total` | `includedCostTotal` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:251` / `period-closing-snapshot.entity.ts:68` |
| `period_closing_snapshot.original_baseline_cost` | `originalBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:252` / `period-closing-snapshot.entity.ts:69` |
| `period_closing_snapshot.current_effective_baseline_cost` | `currentEffectiveBaselineCost` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:253` / `period-closing-snapshot.entity.ts:70` |
| `period_closing_snapshot.gross_margin_amount` | `grossMarginAmount` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:254` / `period-closing-snapshot.entity.ts:71` |
| `period_closing_snapshot.tax_impact_pending_amount` | `taxImpactPendingAmount` | 18,2 | 18,2 | `Migration20260414100000_ex07a_cost_accumulation_snapshot_model.ts:257` / `period-closing-snapshot.entity.ts:74` |
| `data_maturity_evaluation_result.tax_impact_pending_amount` | `taxImpactPendingAmount` | 18,2 | 18,2 | `Migration20260418170000_ex13a_operating_signal_model.ts:19` / `data-maturity-evaluation-result.entity.ts:61` |
| `operating_signal_gate_binding.tax_impact_pending_amount` | `taxImpactPendingAmount` | 18,2 | 18,2 | `Migration20260418170000_ex13a_operating_signal_model.ts:184` / `operating-signal-gate-binding.entity.ts:78` |

完整原行、后续类型ALTER追踪、28个目标、源容量和来源SHA见`capacity-audit.json`/`sources.json`。所需容量SQL ALTER为0、容量ORM改动为0。v1已冻的两个gross_margin_rate→38,6及H pending nullable+knowledge原样保留；本delta不把它们当新增容量修复。无须sidecar-only方案：真实聚合列已具备所需容量，JSON context也不得被当成无限金额容器。

## 必须进入正式G1的金额边界

- 所有新V1已知source/aggregate金额仍为精确两位、16整数位容量；字符串/checked整数cents计算，不用f64、JS Number或旧formatAmount作权威。每类总额独立有界，不把回款+成本混加成不必要的中间金额来拒绝合法零毛利。
- 已知source及聚合超过范围，或checked i128运算溢出，必须在baseline/snapshot/period/H聚合INSERT前返回`422 operating_money_capacity_exceeded`。同outerTX内已作的source/CAS/classification/summary/audit/pending-auth变更全部回滚；不能把DB22003作为合法source失败路径。错误只回字段/固定最大容量，不泄露未投影的精确合计或成员。
- `change_amount/change_package_total/execution_change_package_total/costVarianceNet/grossMarginNet`允许其定义中的负值；其他本来非负总额继续非负。每个已知金额独立满足绝对值MAX，不夹到0、不截断。
- 历史金额若有有效第三位小数，新的正式V1消费应`422 operating_money_precision_unsupported`并保留原值，不能静默round后入新baseline。`1.2300`可精确取123 cents而不改历史；`1.2340`不可。quantity/unitPrice/rate自身合法的4位精度不属于金额总额，不能因此错误拒绝已真实记录的两位估算金额。
- unknown保留null+knowledge/reason，不填0；有真实proof的0.00正常表示已知零。毛利由两个各自合法的MAX相减可以为已知0；净回款1cent、成本MAX可以得到合法负毛利`-9999999999999999.98`，不因此改动H低回款/成熟度规则。
- 毛利比例按原有理数/6位展示规则，存储仍是封存38,6。1cent/MAX负例的比例为`-999999999999999998.000000`，可存38,6；0分母返回null/reason，不造0比例。金额MAX不错误套到比例。

Root单写公共Money类型/range guard/typed422以及共享error DTO，G collector和H断言校验复用；C/E/F普通金额容量不扩大。规范及具体fixture见`capacity-audit.json.moneyContract`与`fixtures.json`。

## 检查与真实验收

`verify.py`只读验证逐列DDL/ORM、来源字节、v1保留、精确整数最大值/13%净税拆分/零与负毛利/单cent超限/有效第三位历史/未知值。它不是SQL执行或业务验收。真实HTTP/DB/UI验收还必须由Root产生最大合法source、验证各类聚合与38,6比例、超限422前后所有域状态与证据行原子不变，并保持真实资格/权限/来源链；纯算术fixture不能补造业务准入事实。
