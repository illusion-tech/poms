# RUST-R3C–G 验证例外与可信边界

本文件不豁免真实实现偏差。五项实际偏差必须修复并由当前候选实际复验；当前 G3/G4 仍由非作者签署。

## E1：客户端冻结校验位置

- 范围：新增本批治理/原件保存用 `.gitattributes` 规则，使原active CLI严格保护按预期失败。原输出保留为client-active-check01；不改六项guard或基线，不忽略它的失败。
- 替代证据：独立冻结校验checkout使用原baseline/sourceHead和原attributes，复制当前五输入/579输出原字节；全585相关路径Git attributes逐项相同，以原generator/JAR/guard实际校验通过并核before/after不变。真实source和输出均来自本候选。
- 批准范围：Root在用户授权的本批G0–G4内提供E1替代证据，非作者C在G3复核；清理负责人Root，截止2026-11-02 G4。无需删改治理规则或削弱guard。

## 已有基线差异

无forwarded header时，原Native `app.listen(port)`给出IPv4-mapped IPv6 loopback，未改Rust `HOST=127.0.0.1`给出IPv4；原R3AB `ip-context-original.json`已明确接受并保留两者。本批保留实际IP字符串，不作全局重写、不用生成时间/ID规则抹除；模块继续沿原请求上下文机制。此项是 `existing-baseline-drift`，并非新认证任意IP相等。

原admin时区一项失败保留，UTC复核通过；schema check提出已有CHECK/comment及QA marker差异，逐项分类且无DDL执行。原生C/D/G第二版唯一约束500和F后置audit500的已提交业务面仍为原行为，本片保留。API全局框架的既有ETag/运行时header差异不在本批改写，新增业务response的JSON/HTML类型和错误顺序已实际核验。

## E1：历史未认证产物可用性

早期未通过G3的46acb0候选保留hash、构建/运行日志和真实HTTP/PG原件，但其二进制原字节此前已被后续构建替换，不能称为可重播保全产物。Root明确承认此历史限制；不以它支撑当前验收，非作者C据当前完整来源/产物与实际重验决定G3。ca128ec、1346892、e782b242及最终ec988ff完整二进制已按hash留存本轮private外的专属artifact目录；后续保全不覆盖。

负责人Root，当前截止2026-11-02；处置是保留真实非认证标签和不可恢复缺口、当前候选重新完整实测，禁止用重建或新结果伪装旧原件。本E1不减少当前16操作、资源终态、独立G3/G4要求。

## 验收计数与不做声明

219是作者静态风险组，包含复合排列、共享背景、DB约束不可构造事实及范围外Lead/完整阶段；1124中1011为原Zod拒绝样本，不计作1011业务成功。真实API/PG/SQL/四UI平台及补片各按实际事件和关系断言记，source-only、prepared、not-constructible、历史failed/partial保持各自标签，不凭数量相加认证完整R3。

实际E2E由本轮原Native/Rust真实HTTP、PG故障/并发和原Angular四平台及补片承担；未改原Native/admin产品源码，未将原完整Native其它未来域的测试冒成Rust145操作完成。原54 ignored维持原标签。未部署/切流、未接管真实租户、未认证性能；未交付Lead14、情报余10、讨论2/综合workspace2及完整审批/阶段处理器，#85/#57仍开放。
