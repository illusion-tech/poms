# R3 收口 G2 故障工具纠偏 03：精确必要写入故障

- 状态：待有界独立复核及实际执行，不是事务故障已经命中的报告。
- 范围：#98/#100/#97；不修改产品代码、公开接口、原迁移或原 G1。当前候选仍为 `final01` / `f6a9fdeddebcc6c3453c329ba5dbe6ba38f725e9577df006189b91bfff685747`。
- 原件：`acceptance-rust-final01-18/report01.json` 是 partial。前七组实际观察完成；第八组在 override CAS 等待后撤回 snapshot INSERT 权限，实际审批仍 200。本轮不能证明第二张快照故障，也不能计为全阶段通过。原来源、结果和已提交的正确审批保留。

## 问题与最小替代

实测中途 REVOKE 未阻断该事务后续 INSERT，不把未知内部原因当作已证明的 PostgreSQL 机制。Lead 的 FOR UPDATE 本身先校验 UPDATE 权限，因此同类晚撤权也不能单靠 500 证明实际评分 UPDATE 失败。

改用明确登记的 QA-only 故障触发器，仅在本批新 PG15 的 `poms_r3m_rust`，且 marker/base 与 G1 实际 authority 精确相符时安装。函数与测试对象命名在 `r3m_control` / 独占 `r3m_qa_*` 前缀，拒绝已有同名对象；条件同时限定 DB app role、一个本批真实 HTTP 创建并登记的 Lead UUID，以及必要写种类。

- `lead_score_snapshot` 的 BEFORE INSERT 只对该 Lead 的 `manual-override` 或单独声明的 `override-revoked` 写入抛出具名测试 SQLSTATE `P0001`。system INSERT 不命中，用来证明后续决策快照失败会连同先前系统补算回滚。
- `lead` 的 BEFORE UPDATE 只对该 Lead 的真实 UPDATE 抛同类错误。SELECT/FOR UPDATE 不触发；历史 fallback 应失败并整体回滚，已有匹配 tuple 的正常人工决策应成功且 Lead 行不变。

这是临时验收 fixture DDL，不是产品 schema/migration 的修改。Root 串行运行，整个业务图和必要审计采用已补齐的非空 required scope 守卫；故障后恢复重试，并用正常路径作对照。HTTP 500 必须关联实际具名数据库测试错误，不能把任意内部异常当故障命中。

## 恢复与证据

Root 在 finally 中按精确已登记名称 DROP trigger/function，不能 DROP CASCADE 或改写已有对象；检查对应目录、触发器与函数集合恢复为安装前原状，权限仍完整，必要时先恢复再继续。标记未移除时不得 G3/G4 或收口。所有 DDL、实际 request/response、数据库错误原件、前后业务图、source/candidate、恢复和重试都保留；不读旧 private，不触及 PG17，不在 Native/primary/远程库安装。

同一候选的新完整执行另存新 phase，partial18 不拼成通过。本纠偏需独立复核其测试隔离解释，最终命中、全图回滚、正常对照和恢复仍由实际 G3/G4 核验。
