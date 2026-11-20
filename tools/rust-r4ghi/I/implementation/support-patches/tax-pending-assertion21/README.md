# 21 真实 G/H taxPendingAmount422 最小修复候选

仅I工具内的Root-owned完整两文件候选；Root Rust/epoch08/private/DB/HTTP均未改。Root保当前源码先完成epoch08 cleanup；随后按apply-manifest21.json精确beforeSHA晋升并走新的已审input checkpoint，不能暗改旧sourcePins或把partial当通过。

G在无税务评估而源cost.tax650/unknown时合法产出unknown/null；H assert_metrics却将empty tax assessment sum当known0。因此Root实际第4context FI未命中就422，与body.assertions=null无关。修复H的独立source预期，仍保strict amount/assert_amount，缺评估必须null+tax-assessment-missing，伪known0/伪unknown值/伪reason均拒。Source cost650不代表待确认税务金额650，绝不强改known。

同时修H optional_pending对unknown pending-tax的漏判，否则仅修assert会mature/normal。冻结effective-v2明确tax uncertainty→preliminary/unknown不能normal；加入H02，不改hard eligibility、阈值、policy version/hash、G计算、shared/schema/loader或源验证。

六个真实model纯回归候选覆盖合法missing评估、伪known0、null/reason、真实零税、实际评估123.45与源税650区分、未知源税。Rustfmt parse/check PASS；作者未跑Cargo/H model tests/PG/HTTP，Root统一执行，非G3/G4。
