状态：**Doing / OPEN**。R0/R1/R2/R3已完成；R4进行中，首批37入口已G4收口；R5–R7继续Todo。最后核验2026-11-04（Asia/Tokyo）。

- [x] R0 #58：迁移基线、契约、数据和环境
- [x] R1 #60：应用、认证、SQLx与跨平台基础
- [x] R2 #67：108/108操作及R2M阶段验收；#61裁决已收口
- [x] R3 #85：58/58公共HTTP及#97非HTTP/审批/完整阶段集成G4
- [ ] R4 #101：合同、资金、移交、成本与执行；首批#102及#103/#104/#105共37入口已收口，完整阶段保持Doing
- [ ] R5：提成全链路，依赖完整R4
- [ ] R6：迁移/发布接管与回滚演练，依赖R5
- [ ] R7：统一切换、观察和旧后端退出，依赖R6与正式切换授权

当前Rust公开surface累计210（既有173+本批37），共享契约完整291 operations/595 schemas、client586文件；不把共享schema或已有最小只读适配计作尚未迁移的业务producer。

实施提交 [a2995dfb](https://github.com/illusion-tech/poms/commit/a2995dfb187a70064d2e54ce336a72c24974721a)，归档候选提交 [17c71bac](https://github.com/illusion-tech/poms/commit/17c71bac90bbeb7686fbdee5c043e58684bcb6b7)；永久S3 4f78bd48保留。[实际验收](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/validation-checkpoint57.md)、[独立G3](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/g3-independent08.json.bin)、[固定提交](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/fixed-commit09.json.bin)、[main复核](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/main-integration10.json.bin)、[原字节归档](https://github.com/illusion-tech/poms/blob/main/docs/design/archive/slices/rust-r4abc/archive-origin-map63.json)。

验收：Rust310通过/54历史ignored，Native74套863项，Angular59套411项；必要写故障59项实命中并完整113表回滚/重试，6锁屏障及跨项目锁负例，Linux同构建续跑链/Windows完整原UI。163早期负例仅有界等价复用，原失败/partial/ignored/Native参考不升格。

清理：1004自有行精确清理，3借用原件恢复；两库113表/各529原seed及catalog/ACL精确恢复、两次noop，2对象86B原字节保留、运行副本0；自有API/浏览器/Native/PG停止，卷/private保留，3作者工作树可恢复归档。

后续仍为R4移交、实际成本40、经营核算/验收完工归档及完整阶段验收，再推进R5–R7。新Rust以业务语义、正确性和合理性为准，不追Node缺陷级对齐。无生产部署、切流或性能结论；总体Issue继续Open。


<!-- poms-r4def-g4-current-batch -->

本批R4DEF（D7/E11/F12共30入口）已完成实现、验收、清理和main/归档；按独立关闭许可仅收口 #107/#108/#109 后再 #106。当前就绪治理提交 [e5f13b05](https://github.com/illusion-tech/poms/commit/e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76)；[归档及状态](https://github.com/illusion-tech/poms/blob/e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76/docs/design/rust-r4def-delivery-status.json)。Final docs/main和实际G4/Seal仍须按顺序核对，不以preclose代替末次读回。

本批收口后，正式交付镜像将更新为Rust240、R4累计67/92、剩25（经营17＋验收/完工/归档8）；本次操作中的实际G4终审与Seal仍需最后核对，当前不宣称完整R4或R5完成。#101/#57始终OPEN。

- [ ] 既有R2补缺：`PlatformController_createUser` 带非空 `initialRoleIds` 实际返回500。本批已观察并保留原始 `tmp/rust-r4def/root/api32/00011-PlatformController_createUser.json`：POST `/api/platform/users`，request ID `r4def32-00011-423e6000`，状态500。固定实现[users/service.rs#L469](https://github.com/illusion-tech/poms/blob/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b/apps/poms-api-rust/src/users/service.rs#L469)的 `has_unbound_children` / intentional Protocol 分支在生成UUID后以 `original user relation has no pre-flush user id` 拒绝并回滚，保留了旧Node/MikroORM缺陷语义。此缺陷在本批不修、未验收修复，不得因R2历史阶段完成而遗漏；后续单独冻结G1，以业务语义、正确性和合理性修复，不追Nodebug等价。

总体 #57 与R4父 #101 保持OPEN，原未完成清单全部保留；完整R4阶段验收、R5–R7、部署切流/性能和S3/真实lost-COMMIT-ACK未被本批认证。

<!-- /poms-r4def-g4-current-batch -->
