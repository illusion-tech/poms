此为审阅者编写的四文件安全/契约候选，Root epoch08 四个产品文件仍逐字匹配 base-manifest29.json。完整候选在 proposed/，精确 SHA 在 manifest29.json，统一 patch 与静态/纯回归证据在 candidate29.patch/proof29.json。必须由 Root 非作者审查、在 epoch08 清理后组合晋升；没有代写 Root Rust/DB/进程。

P1 安全纠偏：原 PATCH 只核全局 ProjectWrite，然后读取 project/customer 并另开 flush_project；缺失 Legacy/真实当前责任链门槛。新增内部 UpdateProjectMetadata，仅接受 ProjectWrite + 真实当前 OwnerWrite（有效 ownerOrg/真实 active M）。Owner metadata gate 放在 optional D 参与材料/业务 project/customer 读取之前；Legacy、creator-first-assignment、Part/EO/BA/finance、same-org、bareWrite 均不能代替当前 owner。现 UI canEdit 已消费 server allowedActions，故在 !owner_write 的正式投影同时移除 edit-project-basic-info 与 reassign-project-owner，无须让 UI 自造 owner 资格。

PATCH 复用 reassign 的既有外层 Common coordinator：一个物理事务、borrowed CommonSession/必要 auth participant、project CAS、dirty update 的真实 audit，然后 common flush 和一次 COMMIT；错误显式 ROLLBACK，commit 异常保持 unknown trace。Auth guards 的成功路径原本仅返回 pending_flush，没有额外独立成功 flush；HTTP 现把已有 RequestMetadata 传入 Actor。既有独立 raw session touch 保留并单列。

CustomersService 增加 borrowed-connection 入口，使用原 find_customer SQL；pool/borrowed 两入口共享同一个 Active 谓词和 reference 构造，保持原客户400/404语义。旧 JSString、Field missing/null/trim、date 毫秒比较、updatedBy dirty 计划逐 token 核同（只替换 actor/session/customer 访问），不改金额/阶段或请求 DTO。真 no-op 不改项目版本/时间、不追加业务 audit，仍 coflush 必要 managed auth。UUID path preflight采用当前 reassign/get 同型400；该 supporting validation 边界明确记录。

P2 契约纠偏单列：full canonical 的 ProjectController_reassignOwner 唯一成功状态200。候选使 Create201、Reassign/Update200，JSON body不变；不把断言放宽为[200,201]。旧 Native/MASK09 已提交201原件保留 failed-contract，不能重POST已提交 body。

当前验证是四文件 Rustfmt parse 与 exact extracted gate/status 的两个纯 Rust 测试通过（2个 standalone Error value adapter dead-field warnings），不是整 crate、PG 或 HTTP 证书。Root 必须先跑完整 cargo check/clippy/回归，再启动新 epoch 验证。

真实回归建议：

1. 同组织 unrelated、cross-org unrelated、Legacy missing-org owner 均具有 ProjectWrite，使用 valid 项目/客户以及不存在客户两种 body；在材料查询/写入前拒绝，无 project/audit/必要 managed-auth 业务提交。独立 raw touch 单列。
2. 有真实 active M 的当前 owner 正向 PATCH 四类既有字段；客户 active/missing/inactive 维持原契约，JSON/JsString/trim/null/date 断言，只有实际 dirty 时版本/时间进位与一条 audit。
3. 真 no-op 先确保 updatedBy 已是同 actor，复核版本/时间/audit不变，必要 auth 正常 coflush；不同 updatedBy 仍按原 dirty 语义处理。
4. 对 project UPDATE、audit INSERT、managed-auth flush 各真实单次 FI，验证同事务全回滚；同 body 无 fault retry 一次成功，原件保留。owner transfer/M 撤销竞态核真实锁/CAS。
5. FullProject 非 owner 的 allowedActions 不含 edit/reassign；UI canEdit false。Legacy GET/真实 DOM 仍是已登记最小只读 branch，不用此 fixture 冒充真实 producer。
6. 新的真实 authorized reassignment 必须HTTP200，Create201保持；MASK09 的已提交201只恢复 metadata，不重复提交。

用户8 Create 提案会触达同一个 projects/service.rs；本候选不实现该新producer，必须按 exact base 组合差异，不能用全文件覆盖已独立晋升的 Create 改动。所有作者候选仍需 Root 独立评审；整体 G3/G4 为 false。
