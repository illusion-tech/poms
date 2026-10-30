# RUST-R2L / BUSINESS-LOOKUP 收口记录

- 当前状态：G4 Pending；实现3b154bf447df9897a934e95cb218fbdb0beaba47与固定复核后缀7b6f5e1ac896b29e2d623533d1a2b5f876e30462已实际干净快进并推送main；生命周期归档与在线回写待完成。
- 工作项：L [#79](https://github.com/illusion-tech/poms/issues/79) 与 lookup [#84](https://github.com/illusion-tech/poms/issues/84)，后者父项 [#61](https://github.com/illusion-tech/poms/issues/61)。
- [联合 G1](rust-r2l-lookup-baseline.md)、[实施校准](rust-r2l-lookup-corrective-checkpoint.md)、[联合 G3](rust-r2l-g3-checkpoint.md)、[机器验收](../../rust-r2l-validation.json)、[保全记录](rust-r2l-preservation.md)。

L 交付审批读取、批准、驳回、当前用户待办四个既有操作，以及 Contract/Payout/Adjustment 的实际处理、final/retention 的中途 flush 与双快照链、共享事务和待办关联事实。业务域其余命令仍由后续 R3–R5 单独验收。

两 lookup 直接切换为 `GET /api/projects:lookup?projectNo=…` 和 `GET /api/contracts:lookup?contractNo=…`；UUID item identity、精确查询、原 DTO / 404 / 权限和敏感访问审计不变，旧 URI 移除。原永久 S3 输入、生成器保护、完整 spec/client 与实际消费者同步有独立证据，本片新增 Rust R3/R4 业务操作为 0。

原失败、partial、uncertified、自然 308 差异、PG 08P01、schema 既有漂移、旧 54 ignored 及晚补来源均按各自时点保留。仅在所列输入和验收范围内评价等价，不将旧 source epoch、prepared facts 或推导的 SQL 构造当作新的实际生产者/最终 ELF/wire 运行。

只有本片实际 G4 后才更新 R2 104→108/108 与关闭 #79/#84；#61 尚需全部自身条件和原生子项最终复核。#80 / #67 / #57 继续 Open，保留旧环境、PG17 和本轮独立 PG15 数据卷；无部署或性能结论。


## 实际集成与保全

[独立 G3](../../rust-r2l-g3-review01.json)、[固定提交复核](../../rust-r2l-integration-review01.json)与[实际主区集成](../../rust-r2l-main-integration01.json)分列；S2 `ee0f4847cae292fe5cee1d1eec065b7194607683` / S3 `1a941e8047c6269b52ef4ae8174e5f450f1db2f6`均保留为祖先。主区前后干净，无force、reset、部署或旧环境变更。

[完整保全锚点](../../rust-r2l-preservation.json)固定123837文件/8212458261 bytes，主区正确tar为`E:/projects/poms/tmp/rust-r2l/final02-evidence.tar.gz`，SHA-256 `bd191c1626e5b0bb7cbcaa793ebd9f826337bd5f2dbe4aa5686ed1fca648220f`。原始tar只生成一次，首次复制失败文件、后续正确流式传输及Windows逐成员/提取复核分别保留。

当前尚未关闭Issue或计108/108；在归档准备固定版本实际推送main、独立收口复核后，按在线G4事实补充最终状态。
