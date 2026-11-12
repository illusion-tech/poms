# 纠正 362：真实 prepare-only 计时证据 E1

Root在原362技术G3内冻结低影响证据顺序替代，仍是同一6458 prepare-only输入，不新增业务G1、模式、路由、权限或公开字段。Owner/approver为本批已获用户授权的Root；清理责任亦为Root，截止为该次执行完成后、任何FI/正常Tax G2之前。完整记录见 `tools/rust-r4ghi/runtime-recovery121/prepare362-timing-E1-01/Root-E1-prepare362-timing.json`。

独立代码判断确认：现有无context入口只能真实检查plan/currentFacts，不能覆盖需要实际brand/WeakMap、真实driver/root/cap的Native fresh和私有Tax checkpoint。fake cap、JSON context、抽函数跑真实P、冷inspect296秒、metadata72秒或51→15模型均不能冒充真实热预算。当前预算保持“未证明”，E1没有将其改成通过。

在标准具体G2及Root9另审通过后，只执行一次已冻结的6458真实prepare-only，同时收集其真实outer耗时与现有Auth/GET/快照/journal时间书挡。它会创建真实context、私有journal/cache和登录事实，并可能产生真实prepared/K，不能称纯FS probe；普通一次canonical登录与只读preparation GET以外的业务POST、FI、正常Tax、Main均不在范围内。

全部source/FD/Facts6/进程/环境/lease/state/ownership、真实账号/完整37权限/cookie/owned session、DB时钟和SQL前单调计时以及剩余严格大于两秒的检查保持。不得延TTL、改时钟、伪造身份、加skip/cache/callback、自动relogin、重放或合成FI前缀；input34/runtime17/frame17/Root9/ref11及当前八源不变。

若成功，直接独审消费这一次真实prepared/K/full67，不再额外重跑“正式prepare”。若失败，保存原件、状态和partial并停止，不自动改nonce重试。只报告真实捕获区间；跨多个操作的artifact时差仅可作为区间或上界，不能冒单checkpoint高尾样本。

完整67FI仍需后续独立实测预算：真实idle900/absolute28800/throttle60、至少618个checkpoint、DDL/capture/rollback/final reproof/close以及当前剩余窗口必须另验。prepare成功不授FI或正常提交。新增业务认证0、业务G3/G4 false，#57/#116保持OPEN。
