状态：本批实现、验收、精确清理、main及生命周期归档均已完成；按非作者G4关闭许可进行本批线上收口。Final docs/main、六Issue末次读回和独立actual G4/Seal仍按既定顺序封存，本正文不提前认证末次G4结果。

父 #106，上级 #101，总体 #57；本项只交付 F12。

F12：共享分摊4、阶段归属4、税务4。交付完整批次不可变替代、显式金额层/币种/真实证据和审计、所选金额层优先的 policy v2、精确权重与确定性尾差守恒、三项目一分钱分配及 numeric(18,2) 上限精确字符串。阶段确认在同一事务推进 registered→confirmed、阶段锁、归属和审计，保留来源链与替代历史；LABOR 及其可反推派生组执行双敏感授权。确认事实仍不自动纳入后续经营口径。

独立联合G1已Pass，输入提交 57f64d6c0aef99430acc3b4ed7d99d00074d59f4，manifest SHA256 8229d58c4319962de37ff9a153dc2c24a9b191f4a2101c3ce12558bdb0ef2147。

权威输入：[联合基线](https://github.com/illusion-tech/poms/blob/49678e7713a303156aea412fcd494d104cac0704/docs/design/rust-r4def-next30-baseline.md)、[精确30入口/DTO/DDL/来源](https://github.com/illusion-tech/poms/blob/49678e7713a303156aea412fcd494d104cac0704/docs/design/rust-r4def/joint-g1-06/manifest06.json)、[独立G1证书](https://github.com/illusion-tech/poms/blob/49678e7713a303156aea412fcd494d104cac0704/docs/design/rust-r4def/g1-independent07/g1-final06.json.bin)、[独占文件归属](https://github.com/illusion-tech/poms/blob/49678e7713a303156aea412fcd494d104cac0704/docs/design/rust-r4def/ownership04.md)。Root权限覆盖 root-projection05、root-decisions02 和 protocol01；D final01/E corrected02/F01的原始候选、03/05 Block及失败原件均保留，按manifest authorityOrder解释。

G1 历史时点：静态输入435份、设计完整目标293 operations / 624 schemas，Rust正式交付210、本批新增0，且该时点未运行本批业务 SQL/HTTP/PG/UI。上述冻结及原件不回写为后来验收结论。当前实现事实与正式交付计数分开列在下文。

已固定实现：[d6c3cff8](https://github.com/illusion-tech/poms/commit/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b)，已实际集成 main；永久 [S4 4f0ad88e](https://github.com/illusion-tech/poms/commit/4f0ad88e78622a75b88b4e3cc72aded9da67458a) 保留。独立 [G3 原件](https://github.com/illusion-tech/poms/blob/d6c3cff84dd96c981bab075d3f4aca3e98c76c4b/tools/rust-r4def/independent-final131/g3-final131.json) 为 Pass，SHA256 `5fc5301a86a2cdc0709fb43ed824da797056bfaa3910844424b4e378a9c67094`；其许可范围是固定提交/main集成及继续G4，并非关闭Issue或actual G4认证。当前技术 Rust240，完整 spec239 paths / 293 operations / 626 schemas，生成 client616文件。

已证本批验收：30入口正例、94拒绝、真实生产者/HTTP/PG/权限矩阵、必要写故障及有效并发、Linux/Windows 原生产 UI。Rust416 passed / 54历史ignored（ignored不作DB验收），Native74套863项，Admin60套417项；当前Native lint仅2条既有警告、0新增，tsc通过。既有构建/测试复用仅限独立G3按当前输入哈希审定的范围；旧Native ORM exit1保留有限、逐项审定分类，不改写为命令成功。

已实际清理和停止：Rust仅逐PK删除2673条已证明新增记录、恢复3处授权原件；Native新增0。每库均以2次新连接核对原120表/532行、catalog和guards精确恢复。62个对象共5743B先排他保全并校SHA，再逐项unlink，运行副本0；自有API/本批端口及PG15已停止，container/volume/private保留。原失败、Unknown-retain、Partial、ignored与原ACK保持原标签。

G4就绪载体：Ready治理提交 [e5f13b05](https://github.com/illusion-tech/poms/commit/e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76)；[当前状态](https://github.com/illusion-tech/poms/blob/e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76/docs/design/rust-r4def-delivery-status.json)；[原字节归档](https://github.com/illusion-tech/poms/blob/e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76/docs/design/archive/slices/rust-r4def/archive-origin-map130.json) SHA256 `34d87feaddef23ace0b5210063794798bcd1a2447b66e432b5db50ba922b3732`，以及terminal170和increment180的来源映射。本批关闭动作仅在独立审查批准此具体payload、核实上述提交已在main且父子关系无漂移后执行；许可原件单独封存，不通过正文自引用生成许可。

本批收口后，正式交付镜像将更新为Rust240、R4累计67/92、剩25（经营17＋验收/完工/归档8）；本次操作中的实际G4终审与Seal仍需最后核对，当前不宣称完整R4或R5完成。#101/#57始终OPEN。

用户裁决与边界继续有效：必要业务、版本、快照、审计和会话写共用同一外层CommonSession，任一必要写失败整体回滚；以业务语义、正确性和合理性为准，不追Node缺陷级等价。旧F25、03/05 Block、早期Failed/Partial、K78 retries12但精确请求payload11、后续116/117及121的独立有效补证、未运行的可选浏览器晚附件故障均保留各自真实标签。

本项不认证完整R4生产者阶段闭环、经营17、验收/完工/归档8、R5有效角色冻结/正式执行、R6–R7、生产部署切流或性能；不认证S3/外部presigned/WORM运行验收，也不声称做过真实网络丢失COMMIT ACK（实际deferred failure仍按Unknown-retain）。原G1/G2及G3历史评论按原时点保留；本正文只更新本批当前边界。

- [x] G0：本批父子Issue与canonical边界。
- [x] 联合G1：独立Pass、用户裁决、精确DTO/DDL/真实机制/事务/权限及文件归属。
- [x] D7/E11/F12范围内实现与作者独占交付；固定实现d6c3cff8。
- [x] 本批真实生产者/HTTP/PG/权限/必要写故障/有效并发/原UI验收及精确清理。
- [x] 独立G3、固定实现审查与main实际集成。
- [x] 生命周期原字节归档与Ready/main；独立关闭许可在执行前核实，实际线上读回由关闭事务后确认。
- [ ] Final docs/main、独立actual G4终审与Seal；实际线上收口后由Final同步交付镜像，独立actual G4与Seal完成后才补勾本项。

<!-- poms-r4def-closeout177-issue-109 -->
