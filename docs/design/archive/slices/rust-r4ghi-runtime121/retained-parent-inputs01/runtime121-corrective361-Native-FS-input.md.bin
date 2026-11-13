# Runtime121 纠正361的真实v2计划与FS审批

本记录固定在 Root12 签署检查点，承接[六源实际提升及独立读回](runtime121-corrective361-source-actual.md)。它不宣称后续状态发布或业务验收成功。

真实v2计划的数据生成命令退出0，用时82.746秒。nonce 为 `337610a0-0a68-4445-862b-1b108cc47ce9`：plan78055 B/`6c667cb813a789fafb3af26d3d5bf096bbdc8b2da24da6686292ad007dd31767`，complete2500 B/`b8ea6e709f5daf6abafe1d26b5c4960756a7a4ec90d11366735b761a5e8f8ea9`。该步只写metadata；原M06、原API启动记录、服务端源码和ELF保持原事实。

随后真实只读Native inspect于 `2026-11-12T17:08:32.489Z` 至 `17:13:06.456Z` 执行，退出0、stderr0。实际stdout407 B/`62486ca91789b1766f76661b2e6b8cdac265f596ca3c824ab1c54e6fbb5eec14`，scope121为 `f5fe511bb56decdeb2f49f5ca74331e4e6498204752720062aafb840f0edec84`，`currentGranted=false`、`statePublished=false`。

独立精确peer7为63870 B/`a2566899fdd94a450bf1f9ac7e8b520f77485cf7def3eff49237229e48b4fa47`，实际scope与独立全plan canonical哈希一致。审查覆盖原9阶段与新4 overlay、284当前源、280不变、原API helper到新client helper的具名桥接、base18原4c与当前32bd CAS、14项actor keyset，以及三项状态变化边界。

Root于 `17:20:52.075Z` 完成一次Root12 metadata签署，审批件1684 B/`a070e7533c5be4c5ab78fa3e632892cb7b269b5469af6e2d1d2a3ef43aca5652`。权限只允许本计划的一次FS registry/candidate发布和32bd状态续接；不允许构造Native ctx、启动API、写PG或发送Tax HTTP。

Root12 helper的首个未执行版本2415在独审中发现悬空entry检查退化。原5580 B、NOTREADY及反例均保留，未签出部分Root12。修正版5720 B/`3f154f5e94762366056a7182ed84d22a7775ded57b57ef9659b4553d0c3b04c1` 改为lstat仅ENOENT通过，23项own-tempFS/源码检查及syntax0；独审5182 B/`46104bdf759e95e9131abfb14d8a167d7703196d77f7d1c2e12f19145b96baee`。

原字节分别保存在 `tools/rust-r4ghi/runtime-recovery121/Native361-plan-data-actual01/` 和 `Native361-FS-approved01/` 的八项副本映射中。没有复制私有state或env正文。

状态发布须另看实际命令、complete、私有异inode快照及独立文件读回，不从本输入审批推断结果。实际构造器/入口出口、完整67项FI及唯一Tax正常命令仍需各自验收。业务G3/G4为false，新增认证0；#57/#116保持开放，#119历史技术G4/CLOSED不变。
