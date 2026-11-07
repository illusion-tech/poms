# C15 两文件精确修正及更新pins

C12/C13旧准入被本追加记录替代。按Root明确要求，review05仅在本目录撰写两份工具修正候选，未写Root产品或工具；这两处修正的作者是review05，不把本页冒充非作者代码终审。

`C15/root-proposal/`只包含`full-build.mjs`及`registered-module-graph.mjs`的改动。改为`posix.normalize(posix.join(posix.dirname(from), specifierExt))`后与登记logical path精确相等。没有采用虚拟根`posix.resolve('/')`，因为它会吞掉多余`..`并重新误认路径。原逻辑同时接受foreign-prefix与parent-underflow；修正后两个反例都在新pin前拒绝。Full-build实际私有resolver也已从候选原代码提取运行，两个非法路径不匹配，合法canonical相对路径保持匹配。

真实固定Node24重建确认：整个identity、registry、候选manifest与原09逐项相等，338/330/1159、224/455/114均不变；实际A路径/blob/working/index/untracked只读guard再次通过。见`C15/correction-regression15.json`及`C15/regression15.mjs`。

精确候选hash：full-build `96f510b0737d79826e6a663faabf0d32dccbf2a69c0c88f66348cdf0247a36e3`；registered-module-graph `bf9db24cf463f06d81e639d0772f16a5d284074e0f9d2b0ac4a85da4212aa308`。完整pins与可复制metadata在`C15/reviewed-C15/`，registry仍`0c0d873ac31398cc916a1a21e7ed0b63544c08484c610cb41dc76558972fc806`，review.mjs新SHA为`f7fa0d173770e70260e450d181d742810170575a0c3eb0596b5199c76fe35625`；六工具pins只更新上述两项。

修正后的精确C候选已准备好，由Root核两文件patch后再复制/commit并跑portable probes、metadata-clean、真实whole write/check和生成Rust/整crate验证。尚未执行Root C写入，未签SDK修正或业务G3/G4。
