# R4 GHI：Source13 联合 G2 纠偏边界

本检查点冻结后续纠偏输入，不表示已应用产品、已执行 M98、已形成 Source13 运行候选或已通过 G3/G4。原始验收属于 Source12/API135/M97；原始成功、失败、partial 与元数据恢复分别保留。原135进程退出后，原容器和数据卷已恢复；经两次启动后完整数据核对，实际新进程1351仍使用相同406份产品输入、二进制及M97。007133新候选和007134进程准入单独保留，旧135证据不改标为1351。

交付边界仍为联合 G1 的 G9、H8、I11、R5 最小角色4，共32项。公开路由、DTO、canonical operation 与交付分母不增加。正式 Rust 仍240，本批新增认证0；#57保持开放。Rust 按业务语义、正确性及已确认的事务边界实现，必要领域写入、快照、授权复核和审计整体提交或整体回滚。

## 冻结的四项产品纠偏

组合原件为 `tools/rust-r4ghi/corrective-composed106/manifest106.json`，raw SHA256 为 `5adc6d8b0179b5d2505e318d24101d400fde725dfcd48384c4d8189143d97b27`。十份完整候选及逐文件 before/after 是实际复制的唯一输入；不得以其它工作树的同名文件静默替换。

1. 65-02：冻结参与人守卫先按 UUID 顺序锁定实际 OLD/NEW 父。I/U 必须锁到全部非空实际父；重定父仍优先拒绝23514，缺实际父拒绝23503，NULL 仍由原 NOT NULL 拒绝23502。冻结后身份、职责和权重仍不可变，零权重同样受保护。保留原 DELETE 缺父行为，不增加表、列、触发器或业务数据回填。
2. 90：首次历史期末核验当前选定基线的真实技术估算、条款/准备/批准、移交/再基线化等业务及知识时间。允许现在封存当期已经合格的真实事实；G 封存包现在创建的时间不替代底层事实时间。未来来源、历史采用链不明或不能证明资格时返回复核阻断。既有期间重述根不变；本纠偏不批准自动重选历史预算，历史选包策略仍待用户裁决。
3. 83：TaxRef-only 更正从已验证的实际 F 税务证据，经同一个只读 F 关系解析器发现真实 Cost IDs，再复用完整分摊批次、全部受影响项目和终端的发现、锁及授权。客户端不补造 roots，来源项目税务不变成接收项目的本地税务依据。
4. 84/84-02：006224真实 Main G 因跨项目费用父来源未加载而409，之前成功的 Expense/E/F/Receiver G 不重发。内部 catalog 及同 family 锁仅沿真实 share→slot→Cost 的 source_type/id 载入明确 Expense/Invoice/Payment/Payable 父；两个本项目事实循环排除导入的外部父，避免重复投影或新增本项目未映射事实。金额、税务覆盖、权限和必要写入算法保持。

84-02仅把新增测试模块移到文件末尾。组合106对共享 context 的两处修正均保留。隔离完整 Rust crate 已实际完成 fmt、严格 Clippy、test、build：535通过、54历史忽略、26套、0失败；证据为 `tools/rust-r4ghi/evidence/composed118/manifest125.json`。这些检查绑定未应用候选，不能代替新候选的真实业务验收。

## M98 正常前向执行及规范准入

唯一批准的 SQL 为 `docs/design/rust-r4ghi/g2-frozen-participant-parent-lock65.sql`，raw SHA256 `90b091eb36a7f58ae0cf3a9504b2426ea6de868a4bab9af5a2c1e6bd89e0106e`。注册迁移为 `Migration20261108090000_rust_frozen_assignment_parent_lock.ts`，raw SHA256 `daf3656ec2a726c30ebaba8b0ba91945404f9b7a5848d8d293546bc3c7fa4916`。

正常入口固定为 `tools/rust-r4ghi/migrate-frozen-parent98-136.mjs`，raw SHA256 `29e195b4e80c6089387d66e384eb7b7eef28f5c58cf047a7ce87726e6cc0e5e1`。真实 argv 必须绑定实际 Node24、该入口、唯一目标数据库及 `--execute`；仅执行 `orm.migrator.up({ migrations: [唯一M98名] })`。不得用自述 direction 或彼此一致的伪 argv 代替真实前向调用。逐库保存实际 intent、execution、退出码、stdout、stderr，并由 wrapper 原件互相核对。两个数据库之间不宣称原子事务。

正式审批入口为 `docs/design/rust-r4ghi/source13-g2-freeze136.json`；它必须绑定完整98份迁移输入、SQL/TS/runner/Node原字节、两库与97→98的唯一范围。审批尚未物化前，136不可执行。审批及runner同时进入新 context 的直接来源 pin；新 source count 以实际完整数组计算，不猜测或沿用406。

使用 I108-02最终组合，保持原108及其已发现的命令证据P2原件。schema3必须分别证明 retained Source12→migrationBefore 无变化、before→after仅批准 M98 差异、after→fresh无额外变化。逐库只准：同 OID 守卫的批准 body、唯一真实新增迁移登记行、该实际登记所用 sequence 的一次推进；所有原行及 xmin、其它函数/目录/OID/owner/ACL/角色/约束/触发器和对象均保持。

`state.baseline` 永久保留原 M97 pin，并与冻结 producer 及 prior registry 的原基线一致。派生 comparison baseline 只替换已核准的规范 metadata 和 poms_migrations 指针；138份业务表与 objects 仍用原基线指针。M98登记是 canonical schema advancement，不作为 HTTP owned/borrowed fixture，不得进入清理删除清单。旧54 schema1/2全目录等价语义不改，不将新准入称为 retainedSnapshotEquivalent。

## 实际执行与验收顺序

- 先完成 Source12 真实界面及其已提交动作的精确续验；无 activeFault、blockedObservation、未知提交或未清理 Native 影响。角色原 create200、已完成的负控和失败浏览器应答不重放或改标。
- 私有保全最终 Source12 state、406份原产品输入、实际工具、二进制、双库 archive 和对象；先生成并验真当前1351对应的完整406份来源包，再仅停止 PID/start/exe 匹配的实际 API1351。新旧进程、候选、原schema2及进程准入链分别保存。原数据库卷保持，archive TOC 检查不冒称实际 restore 或 xmin 恢复。
- 按 exact beforeSHA 应用产品组合和 I108-02工具，正常执行唯一 M98，保存完整双库 before/after 及逐对象差异。任何未知提交或额外 sequence 消耗均另行精确对账，不能放宽此准入。
- 完成相关 Rust/Native/lint/migration/OpenAPI/client 检查或明确复用的逐文件影响证据。最终工具图H0一次冻结，1351未来组合以当前consumer的6fe5字节为before，完整应用已封5e670/4e87组合，跨epoch归档旧active1351 overlay。
- 先用实际新二进制、物理 PID/start/exe、readiness200和动态产品来源数组生成独立B0启动候选；以B0进行schema3准入R3，再生成引用真实R3的独立B1。R3的原B0指针不可倒写为B1。Tax13通过私有外置审批binding消费B1/R3和未改H0，不再改business JSON或重冻H1，避免候选与registry、helper图自引用。未绑定模板、静态编译回执均不得冒充实际 candidate。
- 当前prepare16/generate16的M97约束仅服务Source12界面补验；不得直接把常量97改成98并宣称Source13界面通过。Source13如需界面实测，另冻结并复核对应版本。
- fresh preparation 后仅补 Main G；再保存 TaxRef-only 的完整受影响范围、逐项分类及动态必要写入库存供独立复核。全部目标必须保留，能力不满足的期间目标不得剪裁后执行。FI 与正常提交分开批准的确切工具阶段，不自动串跑或复用旧失败 preparation hash。
- 补齐 H 真实规则边界、权限和劳动成本传递遮罩等必要验收。已完成的旧版本证据仅按明确影响引用，不重标为 Source13实测。
- 按用户决定保留真实来源。最早香港2026-11-09零点、日本01:00自然跨期后，才验本周期末正向；实时 current 与独立期间历史分离，不调时钟、不回填或伪造来源。
- 统一候选完成阶段验收及独立 G3/G4 后才更新正式交付和关闭满足条件的子项。#115维持独立已关闭事实；#57与未完成父项继续开放。本检查点不授权 main 合并、部署或切流。
