# R4 DEF G2 必要补缺与纠偏记录

状态：G2 实施中，G3 Pending。原 G1 final06、03/05 Block 和全部原件不回写；本记录不认证运行验收。

## 1. 可操作移交材料

实现核对发现：原 D detail 只公开安全依据 ID/版本，R2L 没有公共 summary snapshot GET，历史 R3 items 也无 item-read 入口。参与人只看 ID 无法审核实际工作范围，因此在已授权可操作闭环内补[精确材料字段](material-delta19.json)。既有 D detail 增 required nullable `frozenMaterials`，新增两种命名 schema，HTTP 仍293/本批30，完整 schema 目标626。

材料只包含已经由 R3 `project:read` 公开的 `ProjectTechnicalScopeItemView` / `ProjectTechnicalRiskItemView` typed allowlist和真实版本引用；不放出 sourceFacts、costItems、金额、个人费率或审批意见。不依靠猜测自由文本中的数字增加一套权限；原有结构化财务字段仍按其投影。准备时冻结历史行并绑定原合同/条款/技术包版本及 hash，GET 不取当前内容冒充，旧行 null 明示。正式 G3 必须验证历史/当前两个版本和真实页面。

## 2. 来源版本与必要授权

- E 人力 create/replace 在计算前除原 finance:manage 外要求 labor-cost-rate:sensitive:read，防隐藏费率校验探测；单一人力输出不额外索要 operating。F 派生治理按 Root05 双敏感执行。
- 客户端 cost/source CAS 不放宽。既存注册成本只允许具名非实质上游变化：应付 open→partially-paid→paid 的真实进度，以及同版本费率 active→superseded / 有效期截短但仍完整覆盖原劳动期间；金额三层、币种、身份、归属、业务日或费率实质变化均拒绝。每次锁内重验，F 新 evidence 记录 captured/previous-certified/current version 和原因/哈希；不覆盖 E immutable basis，也不把旧证明自动外推到下一版。
- E 所引用附件验证去重 UUID、真实有效版本及该 project 直接有效 link，保存版本/checksum；没有引用不伪造附件，也不把 length 当有效性。LABOR 无合同锚点，不扩大到任意同项目合同附件。
- 受控变更所需商业参考允许合法同项目 Active 合同只读引用；不改其 Active 事实，不绕 R3/差异/精确审核和激活。
- 发票币种证明沿真实 snapshot.source_preparation_id→contract_term_preparation.currency_code，不读取不存在的 snapshot.currency_code。历史无证明拒映射，显式 currency-only 修正必须能操作。

## 3. 审计与认证共同提交

实现发现仅投影 SecurityEvent 的 GET 没有业务 trace 插入，不能靠 trace 决定是否 coflush 认证；Root 公共适配成功路径无条件完成最终 common flush，提交后才返回。

RuntimeAudit 原读模型包含 before/after/reason/metadata，会绕过本批敏感投影。E/D 敏感审计携带 `requiredSensitivePackages`；原始必要历史仍保存。F 完整不可变 evidence 已保存原件时，audit仅存安全server-owned引用。Root补审计读侧包权限保护及安全事件，实际 audit-read 矩阵和故障回滚必须覆盖。这是本批新增敏感事实的必要保护，不代表完整 R6 已交付。

## 4. Native 参考与生成保护

新业务由 Rust 实现。Native 保留从 G1 原始 Shared 派生的显式 frozen reference adapter，移除其 schema 注册 metadata，防影响公共 DTO；拒绝新形状，绝不补假 ID/投影/业务结果。新两入口 Native 明确501，不能作为 Rust 失败对照目标。原 Native服务/mock测试、类型构建与新 Rust真实验收分别标记。

原完整 OpenAPI exporter 已在隔离静态公开环境成功输出293操作/624schemas；新材料字段后须重跑至626，保留原输出。有限67请求验证输入保留旧37原件，新支持 strict、六类固定 pattern、五来源判别联合与费用 at-least-one；不引入通用任意正则解释器。生成客户端继续经过受审永久输入 checkpoint 与原 write/check 保护，不降低完整契约保护。

## 5. G3 条件

当前作者纯测/静态检查不等于 DB/HTTP/UI 验收。独立 G3 应核本记录全部增量、原 G1、统一候选当前源与实际回执，任何未解决 P1/P2、来源漂移、必要事务或原 UI 缺口都阻断收口。仅最终完成本批四项后可关闭 #106–109，#101/#57仍Open。
