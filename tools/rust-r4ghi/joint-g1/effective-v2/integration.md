# 联合 G1 effective-v2 冻结候选

**仅输入草案，G1未通过、G2未准入。** 本目录是唯一新的有效拼接候选，原v1与capacity02字节保持原样。Root当前提供HEAD为d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5；#115已实际G4/Closed，但不代表本业务批次通过。3新canonical已在6.25登记planned。

Root正式manifest入口是`manifest.json`；完整有效机器契约`blueprint.json`；所有32目标和必要supporting DTO及传递依赖已具体拼成`public-contracts.schema.json#/components/schemas`，逐操作位置见`dto-index.json`。完整新forward migration是`migration.sql`（94->95、仍19新表），不是额外第二迁移。Root单写共享TS/DTO/OpenAPI/client/Cargo/http/ORM与关键controllers，G/H/I按原owner表写独立业务模块和UI子件。没有生成产品。

## 独审修复

BG1-01：G snapshot/period pending税额与H同为nullable+knowledge；producer1必须known+非NULL或unknown+NULL，deferred检查与不可变context及paired snapshot一致；producer0原值不回填。ORM精确差异见orm-delta.json。18,2容量不扩，preinsert checked money与422按capacity02纳入。

BG1-02：completion列表现代响应明确full-project/own-condition-only两个scopeKind wrapper，full原有required字段保留；own仅父ID/version/全体conditionStatus及本人任务/本人证据。close也是精确scope分支，只返回本次本人关闭与父聚合，不复制父验收/完成摘要/evidence。ProjectDetail独立full与creator-first-assignment-only最小指派锚点，禁止填空或as-cast。Own task前端独立入口直接调用既有completion列表，不先拿full detail；creator branch只挂指派表单。own evidence限真实任务/关闭绑定并继续附件原guard，不能据project归属扩到父全部证据。backend GET数量0变化。独审未发现通用L summary HTTP GET，不把这个旧疑问当已证漏洞。

BG1-03：participant.assignment_id一律不可更新；DELETE查OLD、INSERT查NEW、同parent UPDATE查真实父，冻结集合任何变化拒绝。真实冻结A的零权重成员不能挪到draftB，即使两边权重总和仍1也23514；反例计划见trigger-counterexamples.sql。

## F真纠正闭环与旧事实

同一existing restatement现在显式支持labor/allocation/stage-reclassification/tax-treatment-replacement四种封闭permit。stage调用真实F evidence/attribution/store生产链，consumed included成本保持included/金额/原确认，只CAS阶段事实；共享来源必须联动真实整批allocation来源刷新与全部受影响live/period重述。tax调用真实F负责评估/证据/replace，不把taxImpactAmount当G直接aggregate覆盖或自动成本。所有受影响项目权限/敏感写/完整锁与重述均须满足，任一失败全outerTX回滚。其他无真实producer的nonlabor付款/发票/普通回款冲正明确409阻断。精确nested F DTO、CAS、来源链、期末窗口与冲突目标规则见restatement-contract.json/public-contracts。

currentRoleAssignment无包200/null。R5create及archive replace/void旧Native默认201/声明200差异保留legacy，现代Rust目标200；不能全局HttpCode200改变参考。baseline/period/current assignment都先跨producer查询旧current事实，不能因新head空当第一次。此批无legacy baseline/period admission：旧baseline409 admission-required、旧period409 reconciliation-required；不静默supersede，不让23505代替语义。

所有现代row/logical int4版本绑定1..2147483647，只有缺head可0，字符串/UUID externalSourceVersion不加数字约束。原始weight token到百万整数规则不变。

## 验证与后续

verify.py只读核字节、完整schema引用/合法性、32操作/3planned、新SQL结构、严格scope DTO样例、17现代write输入、版本界限、四纠正类型与v1/capacity02保留。真实SQL/HTTP/浏览器/故障并发验收在tests-plan.json，全部planned-not-run。Root须正式canonical/baseline/manifest一致并经独立G1后方可G2。
