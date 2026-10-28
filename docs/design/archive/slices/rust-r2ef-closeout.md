# RUST-R2E＋R2F 联合收口

实现 `9b3086f6957dfed318a7a53d10cf245394d5282f` 已集成并推送main。联合独立G3 **Pass**，未闭合P0/P1/P2均0。G4随本归档提交推送和#72/#73在线核对生效，归档提交自身SHA由最终GitHub G4评论登记。

## 范围与完成边界

本批交付E字典3、设置3和F审计/安全事件4，共10个既有HTTP操作及9scope编号内部机制。R2A–F累计 **40/108**，余 **68操作及R2M阶段验收**；仅关闭[#72](https://github.com/illusion-tech/poms/issues/72)/[#73](https://github.com/illusion-tech/poms/issues/73)，父#67/#57保持Open，G–M与#61依赖不变。无部署、产品DDL、原TS契约变更或性能结论。

## 实际验收

- candidate01：双端各393 HTTP严格比较通过；并发各4场景/5请求/4阻塞证明，原Nest SQL11，9scope事务消号与1默认路径，显式PG4。
- candidate02：仅E两项传输纠偏；18完整响应及E54完整响应比较通过，最终Rust149 passed/0 failed/54 ignored，显式PG4与其它历史ignored分列。
- 原Angular Windows/Linux×Nest/Rust各2条，合计8 passed/0 skip；基础认证13/端共26，原API/admin lint/test与admin production build、类型检查通过。admin368显式UTC通过，初始时区失败保留。
- 579客户端零diff；原完整291操作/585schema和92migration未改；Rust47操作递归metadata证明通过。schema两库check1/dump0保留既有CHECK可见性与comment差异，catalog不变，未执行提议DDL。
- 40个登记run各两次独立0/0，含缺行设置的精确恢复；5个owner均停止且source/binary不变，5500/5501/5600释放。PG17仅服务元数据Running/Automatic，实例和数据保留。

原Zod长度、编号的独立事务、两项E兼容差异及各失败轮次见[纠偏记录](rust-r2ef-corrective-checkpoint.md)。原页面已有“Invalid PrimeUI License”提示保留；未更改授权、隐藏提示或伪造审计页面。F读取由同浏览器HTTP验证，原前端permissionGuard实际记录拒绝事件。

## 不可变原件与集成

[冻结机器验收](../../rust-r2ef-validation.json)原字节334655，SHA256 `e72173e3916ad4e66c52552a3d5ee2dff90f130efd220a169606a47e8f2011f4`；[唯一独审原件](../../rust-r2ef-review.json)原字节28111，SHA256 `e8b4bd406db3ae2686db641dbeb3996c464a4c1710505ffd6ab59c15373ccdf8`。G1原件与受审输入没有追加或改写closure字段，当前收口另记为[机器收口](../../rust-r2ef-closeout.json)。

实现集成后996来源按声明CRLF→LF归一核等，Git blob中的冻结JSON原字节未变；普通归档仅元数据/链接回写，原runtime结果不重命名为集成后新实跑。Linux164原件先在本地逐文件manifest/打包，再一次批量转移并核全部原字节；Windows原件增量保全。原失败/未初始化、有限Unicode/URI覆盖和两个候选epoch保留原标签，不累加成新总数。

[归档基线](rust-r2ef-foundation-audit-baseline.md)与本纠偏记录的路径及前后hash映射见机器收口；实现提交保留归档前版本，原字节另存本地。Linux checkout/state/旧二进制与PG15副本、PG17及旧环境均保留。
