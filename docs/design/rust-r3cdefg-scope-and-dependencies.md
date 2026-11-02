# RUST-R3C–G 下一批16项范围与依赖

用户已授权本批完整 G0–G4。当前来源为 main `0fced204c917a37b84a2ad50838e722e764b8f78`，R3A/B已交付14/58；本批五个子项已在父#85下原生登记，联合G1已独立冻结且五子项读回，当前进入G2实现与实际验收。父#85及总体#57保持Open。

- R3C #88：技术成本3项，作者1；版本列表、成本包创建、技术成本工作区。
- R3D #89：商务竞标3项，作者2；版本列表、竞标过程创建、竞标工作区。
- R3E #90：客户联系人3项，作者3；列表、创建、修改。仅从原情报/联系人13项拆出这3项，其余10项不重复计数。
- R3F #91：销售跟进4项，作者3；列表、创建、替换、作废，并完整迁移真实Todo提醒生产者。
- R3G #92：报价评审3项，作者1接续；版本列表、创建、报价工作区。集成消费本批真实成本及适用竞标有效基线。

首波范围13项；报价3项在真实上游可消费后接续。全批各片完成独立G3/G4、主线集成和实际收口后，才能由14/58计30/58。当前仍未完成44项，其中本批16项，后续28项为线索14、情报其余10、讨论2、综合工作区2；完整非HTTP/审批/阶段验收仍另计其范围。

## 调度与文件边界

G2用主代理+3作者，独立审查在Gate使用空闲席位，审查者不参与被审实现。作者1仅 `project_technical_cost/**` 与 `project_pricing_margin/**` 的非HTTP模块文件；作者2仅 `project_bid_commercial/**` 非HTTP模块文件；作者3仅 `customer_contacts/**`、`sales_follow_up/**` 非HTTP模块文件。五模块的 `http.rs`、Cargo/lib/root HTTP、公共桥/生成保护与所有实际环境/构建/测试/DB/HTTP/browser/fixture/回归/保全均归Root。

先统一冻结 DTO/错误/权限/UTF-16与code point适用边界、money binary64/原toFixed、日期/UUID/版本、事务/审计/提醒及共享读取接口。cost/bid的current必须沿原project+isCurrent+effective谓词，by-id沿原历史读取，不新增锁或原文UUID归一。不得把已有公共Todo/审批机制当作本片真实业务生产者已完成。

G1前仅核定有争议的原Native语义和纯schema oracle；Root实际Rust集成、四平台组合UI、故障并发及完整终态属于G2后/G3证据，不倒置成G1循环前置。所有实际结果必须绑定本轮源码/产物/新namespace；作者静态矩阵、mock和声明不计实际通过。原DDL/NOT NULL/CHECK/unique约束不拆除来制造历史行。

## 当前实际核验与保留

Root已建立新的 `rust-r3cdefg` PG15容器/volume，host22432→15432，原92迁移及两库种子完成，原Native新构建来源核验通过。实际语义报告仍是G1输入候选，不是Rust验收或G1签署。既有Native事务/错误与业务描述的差异将明确分类，不在迁移中静默改变。

PG17、旧环境/private、全部旧失败/partial/ignored及quarantine例外保留；本轮使用新worktree、Linux checkout、数据库、marker、端口和fixture。无产品DDL、部署/切流、真实云租户接管或性能认证。公共回归按同一候选集中一次；新变化只补受影响检查。五子项只有各自实际G4后关闭，父#85/#57继续Open。
