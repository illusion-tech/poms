# #118 code02 纠偏检查点

本检查点保持原 G1 八个外置叶边界。H3、native14、Rust 编译输入与 #119 技术准入不变，业务新增认证仍为0。

第一次真实 prepare-only 执行记录为 `16acf217fbbac315d6598dba9f722aa4bbc138f53ba7ef02496d4e52c16eef6c`：exit1、stdout0、stderr118。首个保留 expense checkpoint 调用未绑定的 `sha`。真实 `createContext` 已返回，但 cap 尚未返回给 runner，因此没有尝试 native exit。初始 A6 与 ownership0 保持原字节；wire、login、guardActor、capture 及 DB client/connect 路径均未到达。不能把它标作零 ctx、完整 bookend 或准备成功。

原始 `f205`、`b3d`、`187a`、`0bce`、`ee16` 及该失败的 intent/partial 均保留。非作者失败审 `46065e69…` 和有限引用审 `2d881796…` 记录了实际边界。引用审还发现完整 facts 返回中的 `TAX13_OPERATION` 缺少绑定；该函数尚未在原失败中执行到。

code02 在四叶作有限修正，其余四叶原字节不变：

- 从已有 `business/pure.mjs` 引入 `sha`，从已有 `tax13-facts.mjs` 引入 `TAX13_OPERATION`。原 checkpoint 和完整事实派生函数字节保持。
- 实际 constructor 返回后，open 内部保护全部后续设置路径。cap 未分配时，用那个真实 root 及原 native ABI 尝试一次完整 exit，并独立重核全部执行源；cap 已分配而尚未返回时，在 open 内部关闭一次。constructor 未返回时不伪造 root 或再次构造。
- 退出成功只记录真实 `closed-failed-before-capability`；退出或留存失败保留 `failed-preserve` 与主错。不给失败补造 entry-verified、Tax 完成或 F/C/S。锁清理错误作为 secondary 留存，不覆盖原主错，不清除活动控制或猜测回滚。

原57项与新增13项合计70项隔离检查通过，8项语法和帮助入口通过。新增检查使用真实函数 span、真实临时文件，以及明确标注的 native/模块加载替身；它们不等于实际 caller、ctx 或数据库执行。有限八源引用复核 `6295d1df…` 的未绑定与声明类诊断为0，Node 环境类型项单列。

code02 冻结包位于 `tools/rust-r4ghi/tax15-invocation118/tests/sealed-code02/manifest118-code02.json`，SHA 为 `e798873c3abf8adac3d1b29104aee13725b5ac2b0ab8ae01190e88eb30bcd548`。H 完整非作者代码审 `feff98a01aa0a693c4e60061e41733c5527f0bb5bd4307efc9b193dcc3f9a3ab` 已封为 code-ready，独立重跑70项及八语法、帮助入口通过，真实 Source12 expense checkpoint 新通过、旧引用错精确复现；该代码审不授实际执行。

失败保留边界单列：若调用 intent 本身缺失，仍尝试一次真实 native exit，后续八源复核因缺失身份未完成，主错及 secondary exitEvidenceError 保留；该路径不记完整 source-exit 通过。冻结包继承的 `source15Admitted:false` 是原代码候选字段，不撤销已完成的 #119 技术准入；本轮八源代码尚无新的实际模式结果。

后续必须采用新 codeReview 与其八源闭包、新 nonce/phase、真实 entry 副本及新输入，再单独 exact G2。可复用内容未变的原 immutable runtime 与冷权限事实，但不得重发原失败输入、改写原 partial、补称旧 native exit，或依旧 `b3d` 许可运行新代码。#119 已完成的技术 G4 与本次 #118 代码纠偏分别记录；#118/#120 与业务 Gate 保持开放。
