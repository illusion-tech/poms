# R2M continuation01 受控继续方案（DesignCandidate）

本方案只给出资源与来源边界，尚无可执行资源准入、SourceReady 或实际通过。Root 执行全部维护连接、provision、env 与验收；A 只读公开材料及编写纯源码。

旧 Rust 图保留原名 poms_r2m_rust/OID17085、marker1a6、卷/行/原证。audit xmin9302 与 auth9303 是分别提交的事务；未获 audit birth 不得 query-adopt、删除、回填事件或借用 auth 证书。仅在全证据保全、原 observer 已恢复、0 app/prepared/other connection 与精确身份核对后，单一维护动作可把旧库 ALLOW_CONNECTIONS 设 false。禁止 rename/drop/terminate/旧业务 DML。

新 pair 固定 poms_r2m_c01_nest / poms_r2m_c01_rust；lowrole 固定 poms_r2m_c01_app；新 marker abd093b8-c584-45b3-9c62-6357ad6dfa5d，新 owner-only schema r2m_c01_control。state 固定 /home/wangzishi/.local/share/poms-r2m-continuation01，private0700、文件0600；两端 objects 各自新根。复用原 PG15/Native0ef/Rust957；由正常收尾并全107回到 seed 的原 Native Nest 库 clone，不从失败 Rust 图 clone。Root 逐次绑定实际 source/new OID、before absence、完整107/ACL、clone前0连接和 clone后一致性。

新库才撤销原 cloned app 的权限，并赋新低权限角色；旧两库 ACL 不变。生成新密钥和 env，不复制旧 private/env。保留新库内旧 marker 的 owner-only 来源记录，但新 guard 只认新 marker/schema。部分创建一律原样保留并记录，不能自动 drop/reset。

采用 tools/rust-r2m-continuation01 的有限入口依赖闭包。原 tools/rust-r2m、旧 caps/journals/reviews 与 recovery 全不改。工具复制必须逐文件记录原/新 hash 与 exact diff，环境 literal 和相应来源 hash 的有限映射外每一字节可逆相等；产品、业务输入、权限、归属/清理、NULL 与协议语义保持原来源。任务业务 namespace 仍 poms-r2m，environmentId/profile 独立固定，拒绝任何 ambient/CLI 可变数据库或根路径。先做必要 Design/C 审再写有限 executable，不生成大泛框架。

完整顺序、禁止映射、实际待决及公开原件 raw pins 见 continuation01-plan.json。本输入不把旧 partial 变成功，也不把新环境尚未执行的 M4/M5/UI/Windows/G3/G4 写 Done。
