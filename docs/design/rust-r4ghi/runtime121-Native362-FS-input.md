# 纠正 362：v3 Native FS 具体输入

[实际八源与独立读回](runtime121-corrective362-source-actual.md)完成后，Root从直接返回facts1713/f032生成唯一v3 metadata。没有重建Rust/ELF、重启API/PG或复制项目状态值。

nonce `2ba18403-1739-4274-8c3e-5e444f2aa6cf` 的options为1034 B / `a8bcdca8a672010d66bad407666217b5547c49e36337091dc0040815a9d277a8`，Root options metadata单次退出0。纯数据Native-plan producer于2026-11-12 22:30:35.421至22:32:09.488 UTC退出0、stderr0，未调用Native、创建context或改canonical。actual complete2517 B / `9579babc16850317ceffcc11a21db14c4ea13a1b46ec5fd7aea6e9105683162d`。

具体plan为78405 B / `f3e56838c28e7006311b6f292b882d8785cb49fd764d4370e60cfa36d9995fef`，request3224 B / `c7a65ca1b6913eed3883d0b0c5c37eae3d85aa7a8044f802d2f6a8f268e1e5fd`。其protocol3、plan12/base18/current13/composition3/stateTransfer4/tooling2/outputs3保持冻结形状，真实expectedState为e0d9、expectedOwnership为immutable eb4a，actor缓存保留；原codeParent4c/b76与两个failed journal继续保全。composition基线是真实旧337 publication bd7d，原API启动及M06语义不改写。

Root真实只读inspect于22:33:51.853至22:38:48.588 UTC单次退出0、stderr0，实际执行原生源码/字节/进程/环境/历史链校验，未状态发布或创建context。stdout407 B / `064eef6e646f0982d781ab5285db2d4dcbd0236d0e0fd5daaece2f22b0862507` 返回 `scope121=37b9b98b27133ce8406be156a43756cba29975c80cd4b4daaf19ccede3ed4bc0`，`currentGranted=false`、`statePublished=false`。296.735秒是此次冷inspect耗时，不代替热checkpoint或完整FI预算。

12份纯控制元数据及真实inspect原件保存在 `tools/rust-r4ghi/runtime-recovery121/Native362-plan-data-actual01/`，不含私有state、env或auth正文。本记录时Root12未签，peer7具体审查进行中；new registry/candidate及实际状态续接均未发生。后续只能按本次实际scope完成exact FS G2和单次发布，再独立验证三项状态变化与完整保全，冻结私有异inode entry快照。

新current8、prepare-only、真实K/full67、完整FI与唯一正常Tax201仍后置。Rust240、R4 67/95、32 candidate、认证0、业务G3/G4 false；#57/#116 OPEN、#119历史 CLOSED。

## 追加：具体 FS G2 与实际 Root12

上述“Root12未签”保留为metadata/inspect时点记录。后续独立17组、377个raw文件只读核验通过，peer63850 B / `37547234925f1868df091fc6307538416269ee72be655fbad5866499f3532c80`严格闭7键并绑定真实scope、全284、e0d9和完整eb4a前缀。Root于22:49:00.053至22:49:07.433 UTC签署唯一Root12，退出0、stderr0：1728 B / `12c004c3edff05ae78f15ba91a7ef347c06ace25bdc58b0edc79196f3907d00b`，与非作者预计算正文逐字一致。该步骤只写审批metadata，没有状态发布或context。

9份审批/独审原件保存在 `tools/rust-r4ghi/runtime-recovery121/Native362-FS-input-actual01/`。许可仅为一次registry/candidate及e0d9三项状态续接；API/PG写、Tax HTTP和context仍不在本许可内。实际发布结果及独立读回将另记，不从Root12存在推断发布完成。
