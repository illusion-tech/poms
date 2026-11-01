# R2M continuation01 固定部分创建补正

原 provision 实际在 `clone-nest` 的只读权限核验失败（SQLSTATE 42809）。`WHERE relkind='S'` 不能保证权限函数只对序列求值，实际错误为非序列对象被传入 `has_sequence_privilege`。这是验收工具缺陷，不是业务或 fixture 失败；原 source01、独立 SourceReady 及首轮失败回执全部保留。

首轮已创建新低权角色 `poms_r2m_c01_app` OID27136 和新 Nest 库 `poms_r2m_c01_nest` OID27137，marker/ACL 事务已提交；原资源 journal 仍记录 `clone-created-marker-pending`，不倒写历史。新 Rust 库尚未创建，env/objects/业务运行尚未开始。

Root 的实际只读回执 `tmp/rust-r2m-continuation01/partial-inspection01.json`（SHA-256 `7dd971825b15d894b7d4c5452b881eaaa4a44c78e4761eedab5593ad581481b2`）证明：新角色与新库身份符合原创建记录；新 Nest 与原 Native OID16385 的完整 107 表同为 `951d4d4c5ca3e4faa9a005d093c3714e6181c0068c94cd0bd34a75b6f118a22f`；新 marker、产品 ACL 和实际低权登录正确；旧 app 的表/序列权限为零，新 app 无 CREATE/marker 权限；原 Rust OID17085 继续隔离。该次诊断无 DDL/业务 DML，原 journal 原字节保持。

按已接受的固定设计 `tools/rust-r2m/continuation01-partial-resume-design01.json`（SHA-256 `acbd52c75a91eb6d817f4f67178f5686ed9e6e6a9550c9932d6659373cd3308f`）及独立 `continuation01-partial-design-review01.json`（SHA-256 `4b3d4800c0ea2032cdd59802679c09e135dfff1679ee605db46c6f880b2c8876`），允许一个固定补完入口。它须先重核原失败与 journal/hash、精确 OID、完整行图/marker/ACL/role settings/default ACL/新私有文件、旧库/模板、相关连接/事务/端口和尚缺资源。权限函数使用真实类型 CASE 保护；只补本 Nest 的剩余核验和 wx env，以及尚未创建的固定 Rust 库。保留新补完 journal 和回执。

原 provision 继续拒绝既有 root；不增加通用 resume/adopt，不重放已提交的 Nest marker/ACL 事务，不重生凭据，不 drop/reset/改名/换 marker，不连接或清理旧失败 Rust 图。Root 只在具体补完源完成必要非作者复核后执行。该补正沿用已在线冻结的同范围 G1 补充；G3/G4 及 #80/#67 收口仍须等待真实完整验收，#57 保持开放。
