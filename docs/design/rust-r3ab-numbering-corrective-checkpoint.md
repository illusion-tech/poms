# RUST-R3A/B 原编号独立提交兼容纠偏

- 状态：G3 corrective 候选；影响范围仅 A/B 两个创建命令的编号持久化边界，当前源未变，14个操作与DTO/权限/数据模型均不扩展。由独立 C 签署此纠偏后再完成对应创建SQL。
- 原 G1 master SHA-256 `76cd99518de54967098c1c0ac720d18d07887af9a92731a134380a39ca95af85`、manifest02 `c3dd258f06e828e274ce34fea22c54fe1f91efdedc4648084d14b573dd5f6359` 与签署原件保留原字节，本文件不覆盖旧结论。
- 原 source：main `a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d` 的 `BusinessNumberService.next` 使用 `em.getConnection().execute`，没有向 driver 传事务 context。业务方虽然在 transactional 回调中调用它，编号 SQL 实际在另一物理连接独立提交。

## 实际见证与漂移分类

来源为本轮新隔离 PG15、DB `poms_r3ab_nest`、run `1f90e9b9-a535-4b71-9909-3d03afc4b478`；原 Native artifact SHA-256 `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4`，Native代码、数据库迁移与全部旧环境均未更改。

- [原始19场景](rust-r3ab/native-oracle01.json)：79509 bytes，SHA-256 `7749ebca7057926bed67419aa996053b93e6f49ce5b319a7f914d55c43e04add`。
- [6项补充与多行SQL完整提取](rust-r3ab/native-oracle02.json)：80228 bytes，SHA-256 `616230dd697330eb6ed0b0cf87ad434526d4a0c253fa3d3031fbd5b40d05825f`。两份不同origin文件以原字节保全，公开视图不含认证cookie值/SQL参数；原 trace、基线及credentials仅保留在本轮 private。
- 客户创建：业务事务 pid80；编号 upsert pid79。拒绝 alias INSERT 后 HTTP500，customer/alias均回滚，但 customer counter **4→5** 保留。
- 项目创建：业务事务 pid115；编号 upsert pid118。拒绝 project INSERT 后 HTTP500，projectCount=0，但 project counter **2→3** 保留。
- 这属于 **existing-baseline-drift**：原 G1 作者/联合说明把“代码在 transactional 回调中”误推为“编号与业务数据同一物理事务”；当前原业务行为应由实际 Native oracle 决定。不是 Rust 新增缺陷，也不在本批修复 Native 编号策略。

## 本批实施决定

1. 保留原校验与时序：operator/owner/客户有效性等原校验先完成；随后开始业务事务，在其中调用编号入口，但编号调用必须使用独立池连接/独立提交，之后写本业务实体。
2. A 的 customer+primary alias+待写session同一业务事务；B 的 project+待写session同一业务事务。业务失败回滚这些记录，但已经独立提交的编号仍消耗，保持原缺号行为。
3. 复用现有 `BusinessNumberService::next` 独立连接能力；不得在本两创建命令中改用 `next_with_connection(&mut transaction, ...)` 导致新回滚语义。R2 的借连接能力不删除、不改动，其他已冻结调用范围不变。
4. 编号失败时不继续实体写入；保持原错误信封与原校验先后，不借此增加重试、补号、锁或更强隔离。
5. 该决定优先于原 master 第4/5节，以及原 A contract第3节、A07/A08、B contract第2节/B-18等正式副本中重复的“同连接编号/编号与主实体同事务/序列回滚”静态预期。六份副本原字节、用例ID和覆盖类别不改，但上述预期一律由此纠偏覆盖：独立编号提交保留，业务行回滚。其余路由、DTO、owner/权限、来源与不相关验收预期不变。两端对照必须实际验证创建成功、alias/project故障、counter保留及业务行回滚，不再要求失败时回滚已独立提交的编号。

## 同次已确认的写入边界

- 客户/项目 no-op 不更新业务行或版本；存在 pending session 时可只flush session。真变更时实际 flush 为 session→customer/project；完整多行SQL见补充原件。
- 客户、项目同版本两个已等待更新请求实际为一200、一500；保留 generic500，不擅改409。项目显式合法 stale expectedVersion=1 为409；原 expectedVersion=0 例只认证DTO400。
- 项目 reassign 实际201，而完整 spec声明200，保留该既有分类；顺序为 history INSERT→pending session UPDATE→project CAS，同一业务事务。无primary org目标成功后 ownerOrg为null。
- 别名删除为 audit INSERT→pending session UPDATE→DELETE，同一业务事务；两个都已读到别名的并发删除可同时204、各写一次audit，零行DELETE不新增冲突。
- oracle01 的 auditCount 选择器误按 aliasId 匹配 target_id，其零值不代表无审计。oracle02 按原 `target_id=customerId` 与 `before_snapshot.aliasId` 纠正，普通删除1条、双并发删除2条；原01不改写、不冒改通过。

## 验收与状态

这25个 Native场景只见证原后端边界，不是 Rust兼容或全批G3/G4通过；当前同一run的终态清理仍待Root完整对账。临时ACL拒绝都已finally恢复；未加产品trigger或改产品DDL。PG17、旧环境、旧private、全部历史与隔离例外保留。

Root统一落实本纠偏、普通脚本与共享接线；C只需对本次受影响语义及来源做增量独立判断，无须重跑不变的联合G1。正式G3仍等待完整Rust候选和统一真实验收。本批仅#86/#87达到自身G4才可关闭，#85/#57保持Open。
