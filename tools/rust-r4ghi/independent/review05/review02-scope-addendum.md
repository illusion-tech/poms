# review05 新增范围发现 IR05-03

**P1，整体G3/G4继续阻断。** 本页是`review01`后追加发现；保留初次报告不改写。此项为精确静态可达反例，尚未执行PG/HTTP，不能称漏洞已实际远程复现。

`apps/poms-api-rust/src/lifecycle_evidence/mod.rs:179-185`（SHA256 `b40ee3a8091d233e90737a693f4a27f060d9aa41df7b1f1a37fd3c332a83e5fb`）在`EvidenceAccess::OwnCondition(K)`时，仅检查“操作者自己上传 OR 已冻结到K”。自己上传的分支未核附件10新增的真实purpose session，也没有精确父/子用途。

静态场景：A以前有FullProject权限并普通上传X到P，随后真实职责撤销，只剩本人条件K。X当前无task-frozen ref、无purpose1 session，普通附件读取已被附件10正确拒绝。A保留旧link L，把L提交close(K)。K授权和版本均真实；因`uploadedBy==A`，现校验放行。`persist:224`将L合法写成closure evidence，产生正确payload/hash；附件10的`project_scope.rs:419-453`再经closure→K→A把它视作本人精确引用，读取/下载权限随之成立。未伪造来源事实，只利用一个过宽的producer校验把原全项目材料提升为本人任务authority。

修复应在**同一真实外层事务**内，对OwnConditionOnly选择的每个附件核“精确K原冻结引用”或“精确completion+condition+project+actor已completed create-attachment purpose session及对应文件/链接身份”。检查版本、checksum、link/relation、原版本身份与当前密级；不能只依uploaded_by，也不能复用会匹配任意其他本人条件的泛own辅助函数。若业务允许FullProject本人另选材料，应由独立FullProject proof授予，不从上传者身份推导。

至少补真实拒绝：同项目ordinary purpose0旧本人文件、另一条件的本人purpose文件、未完成/过期/wrong actor/wrong parent或文件身份变动；真实允许：K对应completed purpose及K原冻结证据（含他人上传）。失败须无closure/ref/condition/completion aggregate业务残留；必要写FI及same-body retry另外核验。

精确结构化记录见`finding03.json`、`scope-counterexample01.json`。截至本追加捕获，review05已发现1项P1及2项P2，均未以本报告签关闭；作者后续修复另增新字节输入和独立复核。
