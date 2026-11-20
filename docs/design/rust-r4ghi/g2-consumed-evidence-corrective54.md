# R4 GHI 消费版本与纠正证据迁移纠偏 Checkpoint 54

- Checkpoint Status: `Block`
- Parent: #110；直接修复 #111，联合验收 #114；#57 保持开放
- Owner: Root
- Slice Type: `cross-layer-high-risk`，既有 G2 纠偏
- G3 Reviewer: 修复作者以外的 Root / I；最终联合 G3 另行记录
- Checkpoint Date: 2026-11-08（Asia/Tokyo）
- Tracker: rust-r4ghi-delivery-status.json；不是新的业务切片或新 G1

## 1. 触发背景与范围

API133/source10 的真实非空更正准备发现两个项目、三个 live 终端、102
类必要写入。前21类故障实际命中一次且完整回滚；下一 G-share-consumption 故障请求
`002340` 在命中前返回409
`operating_classification_evidence_changed`，primary/fallback均0。本轮保持
partial，没有成功重述。

成本及份额首次纳入会消耗真实版本。当前不可变 decision 保存纳入后的
sourceRef，却保留原始输入及其纳入前 self evidence。合法纠正的 exact before-ref
是纳入后版本，原 self evidence 不能直接匹配。完整分摊替代还缺少 SourceSnapshot
的 before/after 映射，且把响应的锚点 result proof 当作 basis proof，并向每项目
decision 自动追加其他项目的 proof。

本次修复消费桥、完整分摊来源迁移和每项目分类证据选择。后续静态复核还发现 primary
context 复用 producer 前的
knowledge_cutoff，会排除本事务真实新建的成本；其他终端重新取窗口则会看到它，造成来源闭包不一致。最终写入必须在
producer 和分类完成后取真实 knowledge_cutoff；原业务窗口、business
cutoff、pre-effect expectedInputHash 校验不变。

保留真实来源校验、完整反向影响范围、原子事务和不可变历史。公共路由、DTO、S6、政策阈值、金额及日期口径不变。

## 2. 正式输入

- 既有联合
  G1：9e010077e3010ff09447e9d77cb1bf1f7adbf68d，g1-online01.json、acceptance-plan01.json、operation-map01.json。
- 既有实现纠偏：g2-corrective01.md，尤其分类来源、完整 prepare/write
  闭包与物理锁覆盖。
- 用户决定：业务正确性优先；必要写入整体提交或回滚；user-decision-period05.json；user-decision-period-retention06.json。
- 真实来源：source10 原 candidate、实际HTTP/PG原件及
  retained-source10-before-correction53.json。原源码404文件、binary、双数据库备份、对象、state和volume保留。
- 数据模型：现有 M97 / 139表；不新增 migration，不回填或改写旧事实。原 DDL / ORM
  差异分类继续适用。

## 3. Drift 与本次 SSOT

分类为 `new-real-drift`。以不可变 prior decision 的完整 input.target、最终
sourceRef、当前已验证 producer transition 及同一真实 source catalog 为准。

消费桥只允许已封输入引用到该 decision 最终 sourceRef，再到 exact before/after
transition。不能按相同ID忽略版本/hash，不能把任意旧引用刷成当前引用。完整 batch
的 SourceSnapshot 必须按真实 basis 与 cost successor 关系映射；歧义拒绝。

basis proof 与每份 result proof 必须来自实际生产者记录。完整跨项目因果证据保留在
transition 中；自动追加到某项目分类的证据必须真实存在于该项目 after
catalog。显式或旧证据不盲目删除，最终成员校验继续执行。

## 4. 当前阻断结论

当前仍是
G2，G3/G4未通过。API133原21项回滚不能升级为102项通过，也不能作为后续候选已验收的证据。父Issue和期末项保持开放。

## 5. 纠偏与来源保留

Root先完成53封存并停API133。原source10、原失败、原成功来源和原始验收记录不改。后续候选必须建立独立源码和二进制绑定，通过明确的保留数据准入记录消费既有事实；不能静默重绑定旧epoch，也不能把旧producer改称新consumer的交付。

三文件消费与证据修复及 collector 的 knowledge_cutoff
补缺均已由Root非作者复核并提升。统一候选的
fmt07、clippy09、完整test08和build08实际通过；26个测试套件共511通过、54项历史忽略、0失败。该结果是构建与测试通过，真实验收尚待完成。

新 API134 已实际启动并通过 readiness200；binary SHA256为
`c73fcaa6cc9063e9a6b7dc481a51f9f52d4ed3f9855c55201d1ab46f0695bee4`。runtime-openapi12读回222路径、272操作、690
schemas，与原公开表面字节相同。后续以显式 source11
准入消费留存数据；旧数据库及文件不清理，业务表不为迁移测试夹具而更新。

## 6. 测试与校验

- Rust fmt、严格 clippy、相关回归、完整测试和新 binary build：修复后必跑。
- 消费前/后 exact桥、伪造hash/版本/项目、完整 SourceSnapshot
  映射及跨项目proof边界：8项应用回归已通过；知识截止另补4项回归，覆盖producer后晚创建、业务窗口不变、只读不推进及primary/其他终端一致性，随test08实际通过。
- 统一新候选重新执行完整非空纠正FI；原partial系列保留，新轮从头验证102类，不拼凑认证。
- 验证旧行金额、来源、窗口、载荷及未参与行/xmin不变；真实current及四阶段binding沿正确链移动；PG十进制文本核金额与未知税务。
- 实际A05边界、真实UI写、权限、并发和阶段验收继续完成。单测、只读准备、工具静态预检不替代这些证据。
- 无公共变更，canonical spec /
  SDK字节保持；新runtime再次核对当前公开表面。无DDL变化，不重跑迁移或执行owner
  dump。

## 7. 残余阻断

本修复已落地，仍待统一候选的真实验收。另有A05真实商业基线重新准入、UI费用与其他表单闭环、独立G3/G4，以及自然跨期后的期末正向验收。期末最早为香港2026-11-09零点、东京同日01:00，不改时钟或伪造历史资格。

## 8. 例外与风险

用户已批准保留真实来源跨期验收；该决定不豁免实现、数据准入或验收。53数据库归档已检查TOC但没有执行restore，不声称restore保留xmin；原volume和原数据仍在。

## 9. G3 Checkpoint 结论

`Block`。等待修复、统一新候选实际验收和非作者复核。正式Rust仍240，本批新增交付认证0；runtime272与正式交付分列。#110/#111/#114/#57不因此关闭。
