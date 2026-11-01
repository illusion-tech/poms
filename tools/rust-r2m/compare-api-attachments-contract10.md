# M4 Source10 原版本负例的 SQL terminal/rollback

本候选修 measured09 先验失败：原 Native M4.1.version-complete index11/status500 的两条非 auth attachment INSERT 23505 原来被 replay 的全局 phase===end 假设误拒。原 SQL/query error、HTTP500、validating v3 与未生成新 Attachment 均保留；不把非 auth error 变成 auth commit 或业务成功。

Root-only Reader 固定读取43,709B/51cd 的公开原40query metadata，补传 data/pin。A高层只为这一个Native admin-cookie原负例建立 admission：实际request76/pre74 ref+原context/window，真正typed版本session出生idx9/create-version/同当前typed user，uploaded v2→validating v3且completed null，base latesttrue，attachment/link完整前后行不变。原recipe66c64唯一version-complete空body/expected500/inherited原输入、serviceb536/ repo9bfc三源从原cap storedFile惰性读取并逐SHA/AST核实；原23auth源仍保全。无 response/queryID授own、无替换全局版本或未知错误许可。

完整40条实际start/terminal/事务记录逐字段对齐固定metadata后才构造两descriptor：BEGIN140→INSERT141 error→ROLLBACK142；BEGIN143→INSERT144 error→ROLLBACK145。parser d4d只接这个具名admission；默认仍拒error。目标auth失败、unknown terminal/target、未恢复aborted TX、COMMIT实际tag为ROLLBACK均拒；成功原SAVEPOINT机制不改，真实已autocommit的touch不被后续rollback清掉。两个失败各有实际outer ROLLBACK且auth effects=0，单列unrelatedErrors，不吞原error或改HTTP。

Source09的49原请求/58steps/116rawframes/两typedissuedcookie/900-28800-60默认/5clock毫秒网格/所有物理版本和DTO-CAS严格边界原样继承。Fake model仅补QueryWitness本来就有的resultCommands字段；没有修改生产捕获器。14个已跑测试包含entry2，另生产实际parser-call AST接口测试1个：去掉admission实参会真实拒；合15作者纯测，正常Root计auth13+原41=54，entry2不能双计。B16独立parser纯测试原件随包，不替Root完整实际比较。

仅newtmp候选未安装/无private或DB/HTTP/browser执行；Root原Source09与measured09失败保留，C必要源审后Root新窗口精确安装/新label offline实跑。SourceReady不是M4/G3/G4。
