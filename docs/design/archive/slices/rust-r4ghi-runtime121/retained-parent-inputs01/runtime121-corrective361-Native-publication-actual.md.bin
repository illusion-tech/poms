# Runtime121 纠正361状态续接与实际文件读回

本记录承接[真实v2计划与FS审批](runtime121-corrective361-Native-FS-input.md)。状态续接和独立文件读回已完成，实际构造器与业务验收尚未完成。

Root只执行一次FS发布：`2026-11-12T17:21:22.321Z` 至 `17:29:10.933Z`，退出0、stderr0，未创建Native业务ctx，未执行SQL/HTTP。

- complete1522 B：`bd7d2a242ed2d2ca15d329a8ba1f9a59efcba004fa5532d43497a4047e8e5811`。
- registry134136 B：`3f7a1365d57755671fdefcaf5e5edd0ea9c78a85a9cf6656cd20b78f3f2808a8`。
- candidate126007 B：`a0521865327f9fe3a164f7d43ddd1fb1bbac6dcf76d0c22738a487b908ba655a`。
- 新状态和私有异inode快照14253205 B：`76ad68ccf87565192f6089294ede52ab77d977f423a364c9d1b1ebb5d3d3263d`。保全记录1329 B/`499115e2a54aa508d2165e38872670819cb49b584b2d57154d9f7cb6668b310c`，Root保全命令退出0。

独立文件读回共尝试两次，状态发布仍只有一次。首个auditor326e因局部数组变量遮蔽同名函数而触发TDZ，首spec和失败事实完整保留，原代码资格结论补充撤回。code02/a82仅改三处变量名，保持wire key `sources`；逆变换逐字节还原原件。作者7项完整函数调用及独立4项完整函数ledger检查覆盖旧错误、新完整返回和末段负例。

第二次实际只读审计退出0。审件73104 B/`91fb810b4c56274070efb4de73eddf28fa2eaeef24339446983dfded5c0c49f8`，结论为 `approved-actual-exact-successor-FS-publication-readback`：

- 仅 `runtimeAdmission121`、`runtimeHistory121`、`taxContinuation121` 三个顶层字段变化；完整旧history前缀后追加一项，活动失败Tax槽为null。
- 14 actors、counter、823失败journal及全部其他字段保持；13/14、ownership、API record和原Main13一次201保持。
- Root12、peer7、实际scope、284当前源、registry/candidate完整原字节及私有快照不同inode均通过。

原字节metadata位于 `tools/rust-r4ghi/runtime-recovery121/Native361-publication-actual01/` 的十二项映射，没有公开私有state或env正文。

在该读回通过后，Root已生成全新prepare-only metadata，退出0，用时61.187秒。nonce为 `1899fb63-42e3-4bd5-94d2-f1fbd8c57d57`；complete3507 B/`9f17f59a762da2719359cac7bbcfea6a798bf5ef4394931e5259cc7ba05774e1`，input7040 B/`ae6879930c58bf6be0da322b048ec25f45b175084649b16a1586508eec019a9b`。九项原字节副本位于 `Tax361-prepare-metadata-actual01/`；该步未构造ctx、认证、执行prepare或授予G2。预期Root9的1140 B/`000eab1f722b07e62c871aed4f43fb252ef1fafc2f14b43da48a6c0e06d96a19` 仍须独立具体输入审查后签署。

实际prepare、全67项FI、另审唯一Tax正常命令及后续阶段验收仍未完成。新增认证0，业务G3/G4为false；#57/#116保持开放，#119历史技术G4/CLOSED不变。
