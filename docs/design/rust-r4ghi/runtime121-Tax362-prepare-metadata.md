# 纠正 362：全新 prepare-only 元数据

在[v3实际发布及独立读回](runtime121-Native362-publication-actual.md)通过后，当前八源载体经非作者独审固定为39063 B / `3353bd4ea0228119e841a6113bbc16d46d31bf0e8c7cf5a1a2b71bac27983866`，沿用原消费者kind/verdict/闭34字段，精确绑定executor6/prepareFacts2。恰三hot源变化、其余五源字节保持；历史H03/M06/Source361 carrier仍为as-of，不把旧compatibility标为当前通过。

Root于2026-11-12 23:13:22.900至23:13:23.759 UTC生成新options，随后纯metadata producer于23:13:50.712至23:15:03.009 UTC单次退出0、stderr0。该过程未调用Native/context/auth/SQLHTTP/prepare，也未改canonical。新nonce为 `6458f733-0fe1-4b5e-b2ff-076908543af3`；旧1899及823不重放。

具体complete3522 B / `a5ada2ecbaaa6ff2aa837c4c1cde2cfc87b8a41958462e5b0185ae47c6a20569`，input7040 B / `1834a57d5d0e868422492b888df0654f1911b60bd07ea59025a56c0f3d93ae84`，runtime120266 B / `e8460033f2958ef78941a6c07b8a6281f49a8f8863ee7fa1d31b1944d89d5e3d`，manager权限证据5562 B / `5a7fb7839b07664c600108825f6dbd49f2ee8c93b58f8c8d4a536fb96683661b`，request4043 B / `9fbc9a245cccbe572d5b880f6573637bfe10ca10db599e47a24efa6cfd7eeeef`。

expectedRoot9为1140 B / `76e4b36bd1c444543a6416bccaa2bb0f3e4515fd5d68cf6a50aba1659c5397e4`，本记录时文件尚不存在、未签具体G2。input34/runtime17/frame17/Root9/ref11不加键，实际registry/candidate对应2ba/v3，entry是真实dcac异inode私有快照；composition仍为真实前驱337/bd7d，不混作M06。13份安全控制元数据原件保存在 `tools/rust-r4ghi/runtime-recovery121/Tax362-prepare-metadata-actual01/`，不含private state/env/auth正文。

真实热checkpoint、每HTTP和完整prepare会话预算尚未证明。cold inspect296.735秒、metadata72.297秒、51→15计数模型及实际I900/A28800/T60不能代替该证明；全67FI更需独立完整预算（静态至少618个checkpoint）。具体输入FS预审可先做，但任何有界实际计时方案须明确技术证据边界并保留全部current/session/permission谓词，不得默默把预算标为通过。Root9与实际执行仍后置。

Rust240、R4 67/95、32 candidate、认证0、业务G3/G4 false；#57/#116 OPEN、#119历史 CLOSED。
