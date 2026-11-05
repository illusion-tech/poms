# K56 附件支持纠偏交付

本包只交三文件支持纠偏，依据 Root `g2-attachment-freeze62.json`（SHA `31f93f67f235d4bc1ae88e7d5913119e07aa6ba6948d836dd75dbb0d5c054fd6`）、K55 manifest `a0c6d57f…` 和独立 review56 `ba8b946a…`。精确 before/after、实际检查命令/日志及完整可导入源码以 `delivery56.json` 为准。没有 Git 操作或正式docs/共享层修改。

## 实现

- `attachment_storage/registry.rs`：先持有原 runtime 的私有 attempt，再有界读取实际 Body 计算长度和 SHA；同buffer写入新附件UUID/attempt nonce专属 final。attempt 在PUT失败时仍由调用者持有，才能安全补偿；Session仍为staging。source/destination路由证明仅含非秘密ID/version，锁内用同一SQL连接重查，不按当前default换provider/bucket。
- `attachments/service.rs`：complete只规划一次，取消validating预提交与failed catch reflush；实际checksum/size、Attachment/links、Session completed、必要audit及pending auth一次提交。metadata/flag/link/session-create必要audit合并，abort终态audit成功后才独立探测/清理staging。请求的首次source/links proof不会因identity-map刷新而重base；已知rollback恢复完整checkpoint，未知提交的ctx不可继续对象控制或flush。
- `attachments/store.rs`：统一Session→有序canonical group→Attachment→Link锁；锁内重验Session状态/expiry、首次CAS真源、完整active links、历史max版本号和runtime routing。旧latest/final/active槽early严格CAS释放后再INSERT，已early写的实体从ordinary UPDATE排除。Attachment/Session严格每行CAS，非versioned Link原tuple guard；同事务包含audit/auth，只有COMMIT ACK才发布baseline并消费pending。未知提交不删final；已知rollback且新连接无任何引用才清理本次owned key。

旧active/final在普通新nonfinal版本后仍保留；voided历史版本号不会重用。真实旧validating会话已过期，本实现不续期、不绕过expiry，也不把SQL故障写成新failed中间状态。

## 检查与边界

检查运行真实 application lib，WSL Debian Rust/Cargo1.99.1 offline、独立target-F/jobs2，借Root既有真实E模块编译脚手架，不复制或伪造E生产者。只格式化三产品文件且skip_children，F46六源/F44与K55均复核封存hash。

新增纯测试针对实际有界reader（同size异内容、双checksum、超限立刻停止poll余流、短读/流错/size边界）、唯一槽撤位、完整link proof、all-history版本号、expiry/terminal、timestamp语义、first-CAS proof及raw/json/pending checkpoint/poison。另跑既有附件helper/manifest/zip/identity-map纯回归。具体命令计数存在重叠，不把多次跑的同一test相加冒称独立测试数。

`author-checks01`是保留的日志runner失败：formatter零输出使Tee未建文件，记录脚本提前退出，不是产品检查失败。修正后在新目录记录全部检查；没有覆盖该载体。

作者没有运行实际PG/HTTP/对象provider/并发/故障注入或S3。K55的32条实际向量全部待Root统一执行；旧52历史保留。final命名是应用不可覆写绑定，不是S3 WORM；既有legacy已绑定staging及已签外部URL不自动迁移/撤销。提交后管理员runtime迁移与完整handover/package多阶段原子性不由此支持纠偏认证。G3/G4仍未认证。

Root导入只消费`product/`中的三完整文件或同hash的WT源码。`replace-*.py`是已执行的一次性作者编辑载体，不是部署/重放步骤；不要在Root运行。`check56.ps1 -Attempt NN`仅创建新的检查目录，已有证据目录拒绝覆盖。
