# Root 当前支持整合候选06

活动补丁：上一级 `support-integration06.patch`。完整机器清单：上一级 `support-integration06-manifest.json`。八个目标文件均从清单中的 Root 当前原字节生成；`base-bytes/` 保留这些输入，`candidate/` 是八个完整候选。生成结束重新逐字节核验 Root 目标及 Scope/public delta/ownership 依赖均未变化；没有写 Root 产品文件。

本候选合并 D01 service 的旧责任 gate 与真实 handover stage 调用，以及 fixed-evidence03 的 Sources/两个现有 bridge/GET phase hash。只在当前文件上做局部变换，保留 Root 已存在的 participant/confirmed bridge，不用早期 mod.rs 整体覆盖，也不触碰 receipt/contract_finance。draft fresh 仍比较 live 全量；confirmed 授权 intrinsic 与业务 fixed-material 模式按03方案分开。

直接 create 在验证和业务内均仅允许 assessment，保持既有号码预留与原有事务规则；插入项目后同 TX 调用 Root 当前 ownership helper，personal 从创建起 consumed。Lead 转换沿用实际 operator 和继承 owner，在成功保存转换事实后、同 TX 写 origin，不回填历史、不使用 seed、不另造 creator。

Project reassign 保留其现有单一 service-owned outer transaction，内部借 CommonSession：认证 Actor 由原 session/metadata 构造，先核旧 OwnerWrite/一次 CreatorBootstrap，再校验目标 fresh membership与 project CAS，写 history/project/永久 origin consumption/audit，最后同 TX coflush managed auth。expectedVersion 强制正 int4；业务错误通过 ProjectsError::Business 保留403/404/409，不折成500。HTTP 路径及既有201参考分支保持原样，仅传递 metadata。

Project get 改为一个 coherent outer TX，Scope 和数据/必要敏感 GET audit/auth coflush 共用连接。详情严格按 proof.scope_kind 三分支：Full 才读合同/审批/投影；Creator 仅最小首次指派锚点；LegacyOwnerAnchor 仅最新 public delta 的精确基础字段、literal null ownerOrg、legacy-unverified、恒定空 actions 和固定说明。未知分支不降级成 Full/Creator。各分支都经过当前 ProjectDetailView public registry 校验；敏感 audit 或 auth flush 失败不交付载荷。Full 的当前 confirmation summary 读取真实 current D/c/cp，不用不存在的固定任务值覆盖实际确认。

八个候选均已 rustfmt 解析/格式检查通过；没有编译、SQL/HTTP/UI、Git、服务启动或产品应用。请 Root 首先逐目标核对 baseSha256，一次应用后直接做统一编译及实际闭环验收，勿把这些静态检查升格为验收。

明确排除：Scope/ownership 实现、shared/public schema、canonical inventory、timeline 及其闭合 source enum、receipt、stage provider05、`project_lifecycle/mod.rs`。Root 最后单独应用05的 reader/export/provider；不要再用旧 I worktree 的 mod.rs 覆盖其3行导出。此次无需同步或重拷 I 产品目录。
