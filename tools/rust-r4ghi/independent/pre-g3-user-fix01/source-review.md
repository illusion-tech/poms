# #115 源码预审 01

**Needs-correction，最终 G3 Pending。** 3 个受审文件和 diff 原件已固定；本轮不认证编译或运行结果。

P2：`users/service.rs:562–568` 以整个事务的 SQLSTATE 23505 统一返回“用户名已存在”409，会误标关联、审计或会话必要写的其他唯一故障。最小修正是在用户 INSERT 仍保留 SQLx 约束元数据时，只识别 `platform_user_username_unique`；其余错误保留 Database/500。Root 已确认修正并计划真实注入其他 23505，验证 500、整体回滚和无故障重试。

UUID 物化、typed UUID 去重、FOR SHARE 锁内有效引用、真实角色/主组织写入，以及序列化、审计、会话与业务同事务，静态方向符合已冻结基线。改写后的 ignored W01 仍需受控 harness，不能替代本批真实验收。最终结论等待修正来源绑定及实际 HTTP/PG、故障、并发、回归与 UI 证据。

机器判断见 `source-review.json`；源码和 diff 的原字节清单见 `source-inputs.json`。审查者未实现产品、未修改 Git/GitHub、未读取凭证或启动运行态。
