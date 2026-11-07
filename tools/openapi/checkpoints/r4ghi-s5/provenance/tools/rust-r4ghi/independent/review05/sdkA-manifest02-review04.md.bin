# S5 A 有效manifest02增量独审04

**允许将manifest02作为feature-only G2输入commit A的有效manifest。** SHA256 `3b9bea8727a4c89c1a8ad5c0a3891d0718d1435d4913c285dedebb4d524ec602`；原manifest01 SHA256 `9f1d5c6b712af05b4eef0b82dc62c47ae40d59e62ff827d975a711dacb550cbc`及原414 snapshot完整保留，本次不修改审查03。

独立逐字验证：有效414份snapshot的长度/raw/normalized/current源全部相符；仅2源替换，且只删除`OPERATING_RISK_LEVELS`、`OPERATING_SIGNAL_LEVELS`、`PROJECT_STAGES`三项unused import，其他字节无差异。inventory/generator/六protected源及其余实质manifest字段与已审03一致。spec仍`8965393af9264e0805c3174520816673a1a56920944428bb8a9321e81da74ab0`、242/296/689。

lint02真实为0errors/5warnings，不能称0warning。三项新增警告对应本次删除；两个`_selection`位于HEAD未改的contract-readiness.service.ts，属于已有基线。lint03状态见JSON实际捕获，不扩大为整体lint/产品通过。Java validate04已明确pin当前spec且unchangedDuringCheck=true、exit0。

A仍只允许spec+checkpoint及必要原始provenance；B在精确A提交上保六guard和完整清单。SDK write/check、业务真实验收、main与整体G3/G4均不在此批准内。
