# #115 修正后源码预审 02

静态复核未留待修问题；**最终 G3 仍 Pending**。

已确认 P2 `UF-PRE-G3-01` 在本轮源码中修正：仅用户 INSERT 的 `23505 + platform_user_username_unique` 转成用户名 409，其他必要写的错误保留 Database。专用 outcome 进入正常整体回滚，外层宽泛映射已移除。修前输入与结论保留于 `../pre-g3-user-fix01/`。

3 个文件及 diff 已固定，`users/service.rs` SHA-256 为 `8824ec1de378c413dffc1a9f0912c3c78c923502ebbed171e591ba8d405fd7a2`。锁内引用、typed UUID、真实关联、序列化/审计/待刷新会话同事务的静态方向符合 G1。

本轮未执行运行验收，不能替代实际 500/409、回滚重试和屏障并发。最终证书仍需匹配修正后的实际受测来源/二进制、工程检查、HTTP/PG、故障、并发和 UI 原件；后续格式化或代码变动须重新比对来源。机器记录见 `source-review.json` 与 `source-inputs.json`。
