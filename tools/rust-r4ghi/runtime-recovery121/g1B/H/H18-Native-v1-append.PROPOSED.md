# H18／Native v1 具名补充

本补充优先于原H17描述，原36a34/5304和其他原件不改。新增唯一H MOD为 `legacy-authority15-284/witness284.mjs`，真实before为4160B/82ef8d7c733cd0eeaf526e7872e20eb3199be7a6df513531cd8a82bc0412f7a7。它在第4/6行真调用两次old current registry和一次old current summary，无法靠runtime284别名合法保留。仅这三处改用固定Native121；view函数接原code.registry只用于schema/epoch/registered roots，不读currentAPI，原生产/视图/算法/动作顺序保持。

因此42观察→18MOD/24保护；#120为5MOD/20保护；H3仍4MOD/0ADD。I明确2ADD+5MOD（Native2、consumer/http/fault-sweep/ghfacts/trusted）；当前只规划229，实际全图pin仍null，不是已准入。

绑定不可变Native ABI f96c及I提案792e。currentRuntime/assertRuntimeBinding无可弱化options。RootTax与generic HTTP可在同一实际ctx/调用内保存Native私有verifiedRuntime并每effect调用assertCurrentLease121；RuntimeReference仅可记录，不能替代cap/验证，不跨Root/view共享。full历史核验按Native入口/出口/显式reader要求，不能持久化“已通过”布尔。

补充一个必须显式区分的真实字段：原 `retainedProducerState` 继续指 code.producerState 的冻结14 provenance；新增 mandatory `retainedSource15State` 指 Native retained.statePin 的真实failed15。RetainedFixture121.retainedProducerState与后者强等，绝不与14混比。Main13旧bridge全部字段/retainedThrough14保原值，retainedThrough15单列。新runtime和policy env因此各加runtimeAdmission121与retainedSource15State；叶数不变。

current.binaryFiles为新实际stat；旧code plan/build事实保历史，不能直接当新stat比较。旧Reg5/B1永不伪成current候选。

Root已保base7085（266）与supplement0b0b（H9外置四叶）共270。历史resolver必须核两者与authority，旧pin/file保原；不执行归档代码，不以新path假读旧sha。

原H提案的34/12/12、五ID三参、真正record121与fresh prepare-only严格同值续接、F→C→S→state、原算法保护/未知STOP/全部actual-null仍适用。本补充不授实现或G2；B仍待Root联合冻结。
