# F46 主金额层优先作者交付

准入是Root `g2-allocation-freeze51.json`（SHA256 `76b159d40f528f9735041f286cbc5f8d22f1e686a3955ba94f635a8b5703817f`），引用明确用户decision48、独立审核零P0–P2的proposal45。仅修改 `project_cost_governance/logic.rs`、`service.rs`；另四源保持F25原字节。source-before46保存六份完整F25原件；旧delivery25、author-checks25和既有实际证据不覆盖。

## 结果与数学边界

measurementBasis现在是主金额层。gross先按既有精确整数最大余数分配；net在gross容量下按精确剩余配额补分，已知tax为gross-net。net/tax为主层时，各自与已知另一component按精确权重分；完整已知gross=sum。所选主金额、全部已知层和每行已知identity均再次核验。未知仍null；部分已知gross与主component用容量/下界分配，不能补造未知税或净额。

有界分配用商余对比较，不以f64或展示ratio反算金额；heap按确定性UUID处理补 / 减分，至多项目数次修正，O(n log n)，不按金额总分循环。gross cap情形的net floor总在容量内，剩余容量总和始终不小于剩余目标，所以有效派生输入不会因尾分耗尽被拒绝。源已知component超过gross或完整三层不一致属于无效事实，明确拒绝。

0.11净+0.01税=0.12、1:1的gross主结果固定0.06/0.06，net0.06/0.05、tax0.00/0.01；选net/tax主层则仍组件独立、gross0.07/0.05。新增六项目[1500,1500,900,500,500,200]、25净/1税/26gross分币见证证明容量重定向：gross[8,8,5,2,2,1]，net[8,7,5,2,2,1]，tax[0,1,0,0,0,0]，不能使用独立net[7,7,4,3,3,1]超出两个gross容量。

residualMinorUnits在新policy中只记主层相对floor的0/1分；旧F25组件叠加出现的2保留不重解释。DB原0..2检查可用，不改DDL。

## 私有政策与历史

物理allocation_algorithm及既有私有algorithm仍是整数舍入family `largest-remainder-cents-v1`，不能单独代表层优先政策。新confirm、每次完整batch replace都会在basis证据和每个result证据的frozen_payload加相同server-owned allocationPolicy：id=`selected-measurement-first`、version=2、实际measurementBasis、grossComponents、tieBreak、secondaryQuota，全部进入原canonical hash。

helper不从旧basis复制旧policy，也不从客户端取policy。新结果同basis共享同一个值；旧证据无新标记不补写、不重算。GET仍读取持久化金额，源CAS、占用、替代链、排序锁、双敏感投影、审计及pending-auth同事务保持原机制。无新增路由、公共DTO/response字段、数据库列/约束或依赖。

## 实跑检查与待实跑

author-checks46使用Root已分配的Rust1.99.1/offline/独立F target/jobs2，真实应用crate及真实E04模块编译：32项F纯测试全部通过，0failed/ignored；rustfmt通过，Clippy `-D warnings`零警告。原始stdout、receipt及输入前后rawsha留在build/author-checks46，Source hash在运行期间不变。

新增8项测试包含新主层反例、6项目gross容量冲突、所有unknown mask、MAX18,2、0权重、权重输入逆序稳定、1980小域可行分配的独立穷举配额偏差比较及新private policy/hash绑定/旧payload不改写。它们是实际生产纯逻辑检查，不是实际PG/HTTP验收。

F44单次request-only driver另封存于acceptance44/delivery44.json，11case覆盖F12，包括真实E生产、D日期/版本reclass、税务及LABOR全组保护、完整分摊替代、MAX真实C→E→F与F46反例；所有运行状态not-run。静态检查没有调用request或模拟成功。Root导入两新源后需统一实际编译、绑定部署source hash，再跑F44/private policy PG读回/fault32及独立G3/G4。未commit/push、未碰Root/shared/环境或凭据。
