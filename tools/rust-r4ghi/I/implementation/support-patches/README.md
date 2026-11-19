# Root 单写集成提案

这里的 `.patch` 与 `.rs.txt` 均未应用、未编译，不是产品或 SQL 验收。原始输入 SHA 在 `patch-inputs.json`。Root 需按当前固定候选复核后单写，不能直接运行本文所列旧 producer 来补历史数据。

- `01-d-handover.patch`：复用现有 D `sources::fresh`，不复制 collector；新 prepare 在旧责任 gate 后落真实 handover ledger。受控 rebaseline 调用 private prepare 的分支仍由 Root 既有 rebaseline scope 控制，不再伪造新移交阶段。
- `02-project-and-lead-origin.patch`、`03-create-stage-validation.patch` 与 `new-origin.rs.txt`：新 direct Create 仅 assessment、真实个人 owner、origin 从创建起永久 consumed；Lead 使用当前实现已有的真实 conversion operator 与继承 owner，在原 TX 紧随新项目插入写 provenance。helper 的 whitelist 必须与 Root scope 复验字节一致；不回填旧数据。Root `project_action_authorization/mod.rs` 需声明其 ownership 子模块。
- `reassign-with-session.rs.txt`：完整替换业务 helper，复用 Root 的 `ReassignCurrentOwner` / `FirstAssignOwner`。旧关系 gate 在生产新 owner 之前；目标 fresh membership，project/history/origin/audit 一次提交。现有 `ProjectsService::reassign` 外层只负责借用原有 transaction/managed auth，把本 helper 作为 outcome；禁止继续旧函数的独立 preflight + 另池 mutation。`ProjectsError` 若保留原枚举，增加 `Business(contract_support::Error)` 并原样转 `into_api_error`，保留 403/404/409，不能折成500。
- `detail-minimum-with-session.rs.txt`：完整业务读取 helper 提案。full 与 creator 分支在读取 contracts、bid、approval 和敏感 projection 之前分开；creator 只查询最小锚点。旧 `get` 的并行池读取和独立安全事件改为同一借用 session，必要 GET security audit 与 managed auth flush 失败则无载荷。根事务包装方法保持原有请求/session/CSRF/guard 规则。
- `04-timeline-conditional-stage.patch` 仅把既有 completion milestone 的 stage 指向实际 completion_result，不新增 timeline source enum。`timeline-stage-entry.rs.txt` 是可选的真实 ledger 事件读取提案，只在 full scope 读取，历史 milestone 保留原来源身份。已核明现有 timeline `sourceType` 是封闭 enum，尚无 `project-stage-record`；此附加事件代码不能直接合并，须由 Root 先裁决 supporting contract 变更并同步 frozen schema/DTO/客户端。当前最低入口可仅交付已冻结 full detail 的 `currentStageRecordId`，沿用既有 timeline 来源类型。条件全闭合不改原结论；archive 保持附属事件。

前端最低入口：Root workspace detail union 在 creator 分支只挂首次指派表单，禁止装载 G/H/R5。独立任务入口直接挂 `ProjectLifecycleAuthoring`，`ownTasksOnly=true`、`canCloseOwnConditions` 来自实际 `project:write`、`actorUserId` 为真实登录人，不经过 full workspace preload；其第一请求固定是 existing completion-list。关闭使用两个 path UUID 和原响应父子版本。Root `uploadEvidence` 适配现有 R2 真实上传→对象→完成→project link，窄任务仅获得本人上传或本任务冻结证据，不引入全项目附件 list。Root `openEvidence` 保留原附件安全等级、权限与精确任务绑定校验，不能把冻结附件元数据当下载授权。

Root full workspace 提供 `LifecycleAuthoringContext`：`projectRowVersion/currentStage/currentStageRecordId` 来自 full ProjectDetail；`executionAdmission` 仅从当前角色冻结与真实 handover getter 组装，`sourcePayloadHash` 是 handover source hash。`canWriteLifecycle/canArchive/canCreate` 依真实 scope 决定。所有 required API adapter 方法连真实 generated client；组件没有 mock transport。`changed` 回调刷新项目与手头上下文，避免继续提交旧 CAS。
