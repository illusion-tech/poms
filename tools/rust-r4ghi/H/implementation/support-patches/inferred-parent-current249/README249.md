# H249 Stage 自动 late-root 父生命周期纠偏提案

本提案只收紧 `inferred_late_roots` 自动推断 Stage 的资格。Stage 保持 `active` 还不足以代表当前可用成本：其真实 `cost_record_id` 必须在完整 Catalog 中对应 `registered`、`confirmed` 或 `included` Cost。与已有 Cost 分支共用同一个状态集合。缺父记录、无效父 ID、未知状态及 `replaced` 等退休状态均不能产生自动 Stage root；不据 Catalog 缺失伪称数据库中不存在该行。

Tax 不增加 Cost 父级限制。F 的 `manual-finance` 评估允许没有 Cost 的合法依据；Tax 原 `active`/`pending` 资格、证据校验、历史行和所有下游计算不变。本提案不变更任何行、DTO、路由、迁移或权限。

`scope_roots_with_session` 仍先取得自动 roots，再原样加入调用者显式 selected roots；其版本/hash 冲突检查也保持原字节。`impact_graph` 和 `affected_states` 完整保留，真实显式历史修正仍能遍历旧/新完整共享 batch，same-project/day 的真晚到判定未加新限制。因此不能用本提案全局剪历史 targets。本轮未执行显式历史修正 HTTP，证据限源码完整保全和纯规则测试。

回归包含当前父状态正向、active 子行配 replaced/retired 父行拒绝、精确父 ID/缺失/未知状态、非 active 子行拒绝，以及 manual/当前 Tax 原资格保持。混合候选回归保留两个当前 Tax、排除旧 Stage 自动 seed；它是规则样本，不冒充实际 Tax08 的两 terminal 重跑证明。

`checks249/result249.json` 是实际隔离 Rust 回归结果：6 passed / 0 failed。runner 从候选精确提取 helper/测试，从冻结 base 精确提取实际 Table 枚举、Catalog 声明及 all/find 方法，使用只读 Root rlibs 和 Rust 1.99.1，所有输出仅写 H 目录。未编译完整 crate，未打开 CommonSession、执行 SQL/HTTP/浏览器或读取活 state。反向还原断言覆盖完整文件，确认所有非本次改动均等于 base。

Root 应先非作者审查并纳入新的 source epoch，再统一完整 fmt、lib clippy、full tests、build 和实际 fresh preparation/Tax target 验证。当前 Source13 的 416/198 和既有 H46/Tax 原件不变。本目录不授权产品应用、不签 G3/G4。

候选只有 `proposed/apps/poms-api-rust/src/project_operating/restatement.rs` 一个产品文件；`change249.patch` 供逐行审查，产品推广仍须按 manifest 的精确 before/after bytes 核验。`prepare249.mjs` 与 `check249.mjs` 是已运行的作者工具原件，后者会格式化尚未封件的候选，因此封件后不要原地重跑；独立复跑应复制到新的独占输出目录。
