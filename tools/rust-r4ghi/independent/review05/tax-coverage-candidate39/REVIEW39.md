# TAX39-P1：部分评估错误地代表完整税务覆盖

这是 review05 编写的修正候选，Root 需作非作者审查、精确晋升及真实验收。没有修改 Root 产品、Git 或数据库。精确 before/candidate SHA 见 manifest39.json。

G 原 context.rs1448-1463（base a504f99f...）与 H 原 policy.rs599-614（base f687418c...）只在全局税务评估数组为空时保留缺评估 unknown。反例：已纳入的费用成本 C1 税650.00，无任何 F 税务评估；C2 有一份只引用 C2 的真实 F 评估，pending123.45。原代码因数组非空，将项目 pending 记成 known123.45，等价于把 C1 的未评估部分当零。H 同样复算并接受这个错误结果，后续成熟度/风险/阶段建议可能据此失真。

已有 direct cost.taxTreatmentRefs 关联不能消除此缺口：原 aggregate 没有读取它。原 H tax21 的“有真实评估”正向测试只 push 税务行而未给成本真实关联，因而也没有覆盖该反例。本候选补该关联，并加入混合未覆盖/完整覆盖/旧版本引用等应用测试。

冻结依据是 effective-v2/tests-plan.json 的“真实 known0 与未知税务保持区别”、source-context.schema.json1819 的真实 F snapshot/evidence 与 pending/unknown，以及 acceptance-plan01 A04 的实际来源/分类/税务生产者。不改变11条规则、任何阈值、金额层或税务负责人结论。

候选行为：每一个保留于冻结成本范围内、税额非零或未知的成本，必须具有与本次已实际采纳的 taxTreatmentRef 完整 kind/id/version/hash 一致的 cost.taxTreatmentRefs；有一项无覆盖则 pending unknown/null、原因 tax-assessment-missing。完整覆盖时仍只合计真实 F pendingAmount，绝不把 source tax 650.00 当成 pending650.00。真实税额0仍是有依据的已知零，不要求虚构评估。G 用 JSON 真正来源列表、H 用 typed frozen model 分别复核。坏金额错误向上传播。

direct cost_tax_refs 同时从裸 UUID 匹配收紧为 kind=source 且对应真实 `project-actual-cost-record`/`source-cost-fact` 的 cost ID，或对应实际上游 source_type/source_id。F 原件本身及 hash/期间是否被本次采纳仍由现有 G producer/evidence 链检查；本候选不会因税务行仅同项目就授予覆盖。G 消费导致成本状态/版本变化时，仍保留真实 F 原源关系，不错误要求早前评估的 sourceVersion 等于后来 inclusion 的版本。

excluded 成本仍属于当前完整成本税务范围。原 G/H 已扫描全部成本，本候选保持这个口径，避免将 include/exclude 当成零税证明；不另行发明“排除成本则不需税务评估”的政策。

allocation 当前实际代码是在构造时给 taxTreatmentRefs=[]；1265-1290 后续添加的是 basis/result 的 governanceEvidenceRefs，没有补 share 税务关联。不能据这些治理证据复制源项目 F 税务 pending，更不能按权重自行计算税务 pending。候选保留 []：

- 份额税层实际为0，且其他非零/未知成本均真实覆盖时，可沿真实评估合计得到 known。
- 非零或未知份额税层没有项目本地、份额专属、可审的 F 覆盖关系时，继续 unknown。源项目有评估不等于接收项目份额已评估。
- 要使这类非零份额取得 known，需真实 producer/evidence 契约能够证明其覆盖的接收项目、份额/层和 pending 量纲，并纳入完整授权与来源闭包。当前 F 支持的 sourceType 列表没有 allocation-result 目标，不能把手工说明中的 UUID 当作这种强关系。本候选没有新 endpoint/schema、跨项目敏感读取或替代量纲政策。

这会保留暂未证明的 unknown，而非虚造每项目税额。37 的共享 labor 税为真实0，仍可用它验证跨项目非空更正；非零共享税务的完整 positive 要单独说明现有 producer 能力/业务口径边界。

应用测试候选包括：C1未覆盖+C2已覆盖拒 known123.45；两成本各有真实不同评估时接受其 pending 合计173.45；同 ID 旧版本引用不覆盖；excluded 税务不消失；有税 share 无本地关系保留未知、零税 share 不造评估。另 G 测成本来源 type 与 UUID 同时匹配。

实际执行证据：三文件 rustfmt 语法通过；精确 H 覆盖函数在隔离最小 typed frame 的10项 Rust 回归通过，包含旧谓词确实漏 partial 的反例。该 frame 不编译完整 G collector/H model，也不认证金额解析或实际来源权限。完整应用 cargo 测试、真实 C1/C2 两次 producer 与 G/H HTTP/PG、必要写 FI 仍由 Root 在晋升后执行；不签整体 G3/G4。
