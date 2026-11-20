# 纠正 362：v3 实际 FS 发布与私有 entry 保全

本记录承接[v3 具体输入与真实Root12](runtime121-Native362-FS-input.md)。独立peer7与Root12仅授一次registry/candidate和冻结三项状态续接，不授普通context、API/PG写或Tax HTTP。

Root按真实2ba计划和scope37b单次执行FS发布，2026-11-12 22:49:33.883至22:57:55.329 UTC退出0、stdout329 B、stderr0，未创建Native context或执行SQL/HTTP。501.446秒仅本次完整发布过程，不是热checkpoint或业务吞吐指标。实际调用采用 `wsl.exe -d Debian --cd Root -- Node publisher` 前缀及冻结九参数，没有Source或Tax CLI混用。

actual complete为1522 B / `5759e7524d1fd59dee9b019d0cc67e6c573dc45e5c0b9f3e73dcab4436ee7ffd`，registry134446 B / `a8bcbc8db0125d3d7b5d0a1e3a941747f66fecc00d7f8dcaaa8752e7164c5a03`，candidate126007 B / `2094bdded77e23efb985c90294c259f5458407fe9f79b12d7a9d828c82fd07f8`。发布后canonical为14274424 B / `dcacbdd8087aece6f1a17a62732b4243014650f91838a04a3b8444f67145da3d`；e0d9继续作为immutable before，不能再当当前状态。

Root于23:00:24.994至23:00:25.530 UTC单次私有保全退出0，将真实post-state写为 `runtime121-native-entry-snapshots362/2ba18403-1739-4274-8c3e-5e444f2aa6cf/entry-state.json`。副本与canonical逐字相同且不同inode，regular/mode0600/nlink1/uid1000；preservation1329 B / `aa2e9495837db8b7d6ccb6817a52e190cd69b4cc99f8eb7860e0b0eeb21f87f1`。完整状态值仅留私有目录，不公开cookies、actor或env正文。

真实complete/registry/candidate、私有保全metadata及outer原件10份见 `tools/rust-r4ghi/runtime-recovery121/Native362-publication-actual01/`。本记录时独立实际发布读回尚未运行；Root的发布退出0与副本一致不能代替对完整三项变化、actors/37权限/cookies/seq39、owned、两个失败journal及history前缀的独立验收。

下一步先完成只读auditor代码资格和单次真实读回。通过后才能以新registry/candidate及真实entry生成current8/prepare-only输入，另做具体G2与真实Ctor/cap/entry/exit/K/full67。没有prepare/FI/正常Tax/Main执行，Rust240、R4 67/95、候选32、认证0、业务G3/G4 false；#57/#116 OPEN、#119历史 CLOSED。

## 追加：独立实际发布读回通过

上文待验收段保留为发布后的初始时点。审计代码30484/fd7dc0先经另一非作者完整源码与4个完整I文件模型独审，再单独授权唯一实际Linux Node24只读执行。2026-11-12 23:08:56.110至23:09:11.983 UTC退出0、stdout993 B、stderr0，使用真实IO adapter和冻结八个CLI参数，没有fixture替代或实际Native/Core/app导入。

原函数直接返回的审件73125 B / `5063a0676cbe76c5d371d774f69f3089cc45769f405921cacb68c887d1cbda14`、原seal1676 B / `563d805a805e7f3a2e8d2ee80648a5b61f70e52941c2ff6c285b73cec44399d4`验证：完整registry/candidate字节重建；且只有lease/history-prefix+1/活动失败Tax槽三项变化；14actors及cookies/cache37、seq39、owned/API/provision、823/1899两个journal与其他所有字段保留，ownership完整7456/eb4a及原b76前缀保持。全284实际重读，S3/W3/wrappers、Root12/peer7/scope、快照同字节异inode及锁/temp收尾均通过。

实际比较只在内存中使用私有值，输出仅布尔、hash、pin及计数，不保存state/actor/env正文。13份实际读回、代码独审和调用原件见 `tools/rust-r4ghi/runtime-recovery121/Native362-publication-readback-actual01/`。执行完整seal3543 B / `7961b974d08e7f6c62c61bb1d60a5844943353ca5a791a7ae38ffa76ada03c16`保留唯一实际调用；发布和Source都未重放。

本次仅确认真实FS续接，仍要求真实constructor/capability与fresh prepare验收。新context、K/full67、FI/正常Tax及本批业务G3/G4均未由此验收执行或批准；认证仍0，父项保持开放。
