# R4 首批 37 入口真实验收候选

日期：2026-11-04。当前为 G2 实现及实际验收完成、独立 G3 待审；六项 Issue 仍开放。仅本批 A9/B9/C19 共 37 入口可在自身 G4 后计交付；R4 #101、总体 #57 保持开放。

## 交付边界

每合同独立金额、条款和应收节点，保留真实成本、竞标、项目报价、商业基线及差异来源，不自动分摊或以项目报价限制合同合计。合同草稿准备真实条款版本，送审绑定精确准备版本和 payload hash，批准后原子生成独立有效快照，正式应收计划只消费该快照。必要业务、版本、快照、审计及到期会话写入同一外层事务；预提交必要写失败整体回滚。

合同、普通回款、发票以及本批付款/应付金额使用有限十进制，正数、最多两位并拒绝 numeric(18,2) 溢出；税额可为零。付款保留同项目 Active 合同及应付绑定规则，也保留合法的无合同项目付款。Rust 按业务正确性交付，旧 Native 缺陷不是对齐目标。

完整 R4、实际成本 40 入口、移交/经营/验收完工归档、上游 A01/A05/A04 作者 UI、财务 19 项 UI、新机制 Native 符合性、部署切流和性能不在本批。

## 实际证据

- [最终源码包](final-source53.json)：949 项生产/共享输入，递归编译资源 326 项。936 项实际构建输入与 Linux 编译目录原字节相同；固定 S3 `4f78bd486ca2118e4700bae560cb25ff08c4b47d` 为永久祖先，未 squash 或绕过来源保护。
- [最终验证索引](final-validation57.json)：Rust 310 通过、54 历史 ignored，后者不升格；Native 74 套/863 项，Angular 59 套/411 项通过。所有有 lint target 的受影响工程均通过；另两共享库无 lint target。实际生成器完整 595 schemas、586 client 文件及六道来源保护通过；单向枚举工具 14 项与 Shared Zod 43 项通过。
- 真实 API/内部 producer 联合链覆盖全部 37 操作；多合同、全容量金额、准备替代/拒绝重提/精确审核绑定、真实报价来源替换、独立快照与计划、付款归属及累计均有 HTTP 和 PG 读回。
- 必要写故障 55 项与批准链 4 项全部实测命中；逐次比较全部 113 表行数/原行文本摘要，完整回滚，解除故障后重试实际提交。另有 6 项实测 PG 锁屏障并发，以及持有外项目合同锁期间立即拒绝跨项目操作的负例。
- Linux UI 的 41/42 原始运行保持 partial 标签。41 已完成真实准备、送审和“成功 POST 后真实 SELECT 权限拒绝”的读取失败/只读恢复；43 读回同一原回执及 PG 绑定，在相同 423 文件构建上续跑，未重复 A08/submit。真实待办导航复用同一合同组件；延迟 A 响应后 B 的显示及实际审批目标正确，再完成 A 的批准、生效与 A09。Windows 在相同构建上单次完整完成该主链。两端均验证最大金额显示及真实只读用户脱敏。
- 原 1730 Native 在 Linux/Windows 的登录、合同列表和详情为历史参考，不能作为新生命周期通过证据。浏览器网络项与代理 exchange 数分别记录，不混计。
- 清理按实际 ACK、完整原 seed、会话 cookie hash 及 validated FK 注册归属：精确删除 1,004 行自有数据，恢复 3 行借用原件；两库各 113 表、529 行原 seed、全部列/约束/index/ACL 精确恢复，两次独立 no-op 复查通过。2 个对象共 86B 原字节私有保全，运行对象为零；自有 API、浏览器、两平台 Native 与 PG 均停止，端口释放，卷/private 保留。

## 漂移与原件

原 owner/app `migration-check` 都是 exit 1，未改称零漂移：精确 16 条强复合 FK 是 MikroORM 7 metadata 无法表达的 `accepted-db-specific-difference`，SQL93 约束均保留 validated；3 处 ratio CHECK 的 BETWEEN 解构、app role 看不到的 192 CHECK metadata 与独立 marker schema 是有限 `tool-noise`。建议 DROP 从未执行。真实 DOWN 对已存在生命周期数据拒绝；空库 DOWN 实际执行后外层 rollback，完整数据和列恢复。

163 项早期权限/CSRF/DTO证据保持 prefinal。四个不可变资源 pin、实际 Rustfmt 前后链、完整保留的旧 455/224 wire payload 及三个行为不变的 Clippy 修正限定其复用范围；新业务/fault/race/UI使用最终18二进制。receipt54 的一个字段名误把原 `finalAcceptance=false` 写成“未变化”字段值；原文件未修改，最终索引已单列澄清。

失败、partial、受限工具 checkpoint 与全部历史 ignored 保留原标签；没有把 source ready 或一次输入检查代替最终 G3。私有 producer stdout/stderr 原先为可逆 JSON Buffer envelope，12 份已逐字节往返验证后无损解码，原 envelope 继续保留，二者内容均不公开。

[原字节来源映射](g2-evidence56/origin-map56.json) 保全 592 文件、37,256,209B，含作者完整候选、独立预审、实际失败与修正运行。295 个本批实际 secret/credential 值已在公开复制前逐字扫描，命中为零。生命周期完成后整体归档，保留 logical-origin 到实际路径映射；生产编译资源保留原位置。

## 后续 Gate

非作者最终 G3 → 固定实现提交复核 → main 快进/远端读回 → 生命周期归档和具体 G4 方案 → 独立关闭许可 → 仅关闭 #103/#104/#105/#102 → 六 Issue/本地 tracker 实际读回及独立 G4 终审。#101/#57 持续开放。
