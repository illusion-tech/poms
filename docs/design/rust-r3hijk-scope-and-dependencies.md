# R3H–K 最后28项范围与依赖

用户授权本批完成联合G1、三线实现、实际验收及独立G3/G4。父[#85](https://github.com/illusion-tech/poms/issues/85)和总体[#57](https://github.com/illusion-tech/poms/issues/57)保持Open。

- A：[#93](https://github.com/illusion-tech/poms/issues/93)，线索管理/评分14项。
- B：[#94](https://github.com/illusion-tech/poms/issues/94)，销售情报10项，联系人3已在#90交付，不重复计数。
- D：[#95](https://github.com/illusion-tech/poms/issues/95)讨论2项及[#96](https://github.com/illusion-tech/poms/issues/96)项目综合工作区2项。

三线只在联合G1独审Pass及线上冻结后实现。A/B互用只读事实接口，D消费A/B真实产物；实现可并行，集成验收必须按客户→Lead/情报→转换/讨论/项目工作区的真实生产者顺序。Root独占公共HTTP/桥和全部实际运行，C保持非作者审查，独审占用空闲并发席位。

当前已交付30/58，本批28待交付。现有Rust145操作/116路径；本批预期173操作/138路径/585schemas。原Native237路径/291操作、client579、migrations92不变。即使本批四子项G4后HTTP58/58，完整非HTTP/审批/阶段集成验收仍未完成，不关闭#85/#57。

冻结输入见[联合基线](rust-r3hijk-next28-baseline.md)、[原字节映射](rust-r3hijk/g1-original-origin-map01.json)、[共享边界](rust-r3hijk/shared-boundaries01.json)和[当前交付状态](rust-r3hijk-delivery-status.json)。
