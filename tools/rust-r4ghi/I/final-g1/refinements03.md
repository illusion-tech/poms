# refinements03：named keys 与可执行 Project scope v1

**仅联合 G1 增补，未产品编码/未运行 SQL。** 本文件只覆盖 Root 指定的参数映射和授权补点。旧 `contract.md / contracts.json / ddl-proposal.sql / sources.json` 原件保留；本 delta 生效须 Root 联合冻结。精确事实查询见 `refinements03.sql`，机器规则/源码SHA见 `refinements03.json`。

采用Root本轮转达的用户裁决：真实创建人仅可组织org-owned项目首次个人指派；此后按真实责任链授权，不能因重回org-owned复活创建人权力。Root会登记原问答 `user-decision-scope03.json`，本代理没有把尚未读到的Root回执冒充已核文件。

## 1. 三个 canonical 参数 delta

| operationId（保持） | Root最终候选 canonical（不含运行时/api） | named ResourceKeys → typed target |
| --- | --- | --- |
| `ProjectController_startExecution` | `POST /projects/{id}:startExecution` | `id → ProjectId` |
| `ProjectController_startAcceptance` | `POST /projects/{id}:startAcceptance` | `id → ProjectId` |
| `ProjectCompletionRecordController_closeCompletionCondition` | `POST /project-completion-records/{completionRecordId}/conditions/{id}:close` | `completionRecordId → CompletionRecordId`，末级 `id → CompletionConditionId` |

替代旧 proposal 中 `{projectId}`、旧条件路径 `{id}/conditions/{conditionId}` 的**参数名及映射**；operationId、请求DTO、状态码、15目标计数不变。dispatcher 使用 named map；条件关闭必须保存两个UUID并验证 parent-child-project 三者一致，不以“最后一个id”推断父项目。旧 ABCDEF 的 single-id 入口保持兼容，不能通过本次重命名扩改旧路径。

## 2. 当前不存在可消费的 data-scope / manager 配置 producer

这是本次源码结论，不是猜测部署值：

- `system-setting.registry.ts:26–39`、shared-contracts.ts:200–204、Rust `system_settings/mod.rs:33–40` 消费的 `tools/rust-r2ef/e-authority.json`：唯一 setting 是 `attachment.max-upload-size-mb`。没有项目/组织范围、管理员业务豁免、管理层范围或部门主管设置。
- `role-permission-design.md:45–50,77–81,190–198` 明确 Role 是权限集合，不承载组织/数据范围。当前 role/user_role_assignment/role_permission_assignment 实体没有scope字段；`roleKey`、`is_system_role` 不能变成范围来源。
- 当前 `org_unit` 只有parent_id/is_active等组织结构字段，没有manager_user_id/leader_user_id。父组织关系只能证明组织结构，不能证明某人是主管，更不能给祖先组织成员下级项目权限。
- Auth 当前可用：`Actor.id / session.user.user_id / user.permissions / user_snapshot / role_snapshots`。`auth/store.rs:451–515` 权限来源是active用户角色关系、active角色和active角色权限；不计算Project scope。`auth/store.rs:518` 明示profile组织读取仅按membership status过滤，inactive组织/未知membership type可透出，不能直接拿 `/auth/me.orgUnits` 当业务范围。

因此不新增任意 `admin` 字符串分支、全局权限、配置key或seed。v1用已经有正式producer的**具体项目关系**做范围；未建模的主管/管理层全范围例外一律不放行。管理者如果恰好是当前owner/真实项目职责承担人，则以该真实关系动作，不能以“管理者身份”绕门。

## 3. 精确定义（policy version：project-scope-v1-direct-relations）

`A`：`actor.id == actor.session.user.user_id == actor.session.user_snapshot.id`，guard已成功，当前DB platform_user仍active。权限使用本次guard解析出的 `actor.session.user.permissions`，按精确PermissionKey匹配，不把缺失的read自动由write补出；不根据role名称再加权限。

`M(A)`：同outer TX查询 user_org_membership JOIN org_unit；membership.status=active、revoked_at IS NULL、membership_type∈{primary,secondary}，org.is_active=true。使用fresh行，不仅用cached primary_org_unit_id指针。普通同组织、上下级组织、财务或平台角色身份本身都**不是项目grant**。

`OwnerRead(P,A)`：P.owner_user_id=A.id。历史缺组织上下文时只保留本人非敏感项目锚点读取，不认证新业务推进。

`OwnerWrite(P,A)`：OwnerRead，且P.owner_org_id非空、该org active，且M(A)精确包含P.owner_org_id。目标owner的组织也必须来自真实有效membership；不能把任意ownerOrgId写入后反过来当授权证据。

`CreatorBootstrap(P,A)`：P.owner_user_id IS NULL且P.owner_org_id非空（org-owned）；存在**新生产时同TX**写入的verified project_ownership_origin，initial_kind=org-owned、initial_owner_user_id=NULL、initial_owner_org_id=P.owner_org_id、bootstrap_state=available、first_personal_owner_user_id/first_personal_assigned_at均NULL；P.created_by=origin.creator_user_id=A；origin真实source与P一致、payload/hash有效；无任何reassignment history曾出现非NULL previous/new个人owner；M(A)精确含ownerOrg且该orgactive；请求有project:write和必填expectedVersion精确CAS。**查不到history或只有createdBy相等都不够**。Bootstrap只允许首次指派一个active个人，该个人有目标ownerOrg有效membership，不能顺带跨组织转项目。

首派成功时project owner CAS、真实reassignment record、origin→consumed/firstPersonal/消费记录、audit/auth-flush同outer TX提交；任何点失败全回滚。initial personal 的项目从创建起consumed，org-owned首派后永远consumed；任何后续return-to-org路径都不得重置。首次改派后创建者若不是当前owner/真实指派职责/本人条件责任人，即失去访问/动作依据；不保留createdBy特权。

`H(P)`：唯一 `project_handover.project_id=P.id AND is_current=true AND producer_version=1`；只认draft/confirmed。**不采用**当前sources.current的“无current则按version/latest兜底”。basis.project_id=P.id、basis.id=h.basis_snapshot_id、basis.source_payload.projectId=P.id、basis.source_payload.salesOwnerUserId=P.owner_user_id，canonical_hash(payload)=payload_hash，basis.source_hash=h.source_payload_hash；否则不产生参与者授权。完整当前合同/应收freshness仍由业务service校验，不能用scope证明代替执行准入。

`Part(P,A)`：H中角色行r与confirmation_record/participant真实连接：r.participant_user_id=A、r.confirmation_record_id=h.confirmation_record_id、r.confirmation_participant_id=cp.id、cp.participant_id=A、c.target_type=project-handover、c.target_id=h.id、c.project_id=P.id；r.role_key只认5个既有职责，cp状态pending/confirmed、c状态pending/confirmed。draft准备一旦由合法owner生产，实际被指派者可读取本次确认材料、本人确认；body participants不是当前授权事实。

`ConfirmedDuty(role)`：Part，并且h.status=confirmed、cp.status=confirmed、c.status=confirmed。`EO` 还要求 r.role_key=execution-owner **且** h.execution_owner_user_id=A；两者必须一致。`BA` 是真实business-admin职责行，不是平台role名称。

`DelegatedWrite(P,A)`：P.owner_org_id所指组织active，M(A)至少有一条有效当前组织关系，且存在所需ConfirmedDuty。允许技术/商务/执行人员跨部门参与：显式项目指派本身是project-bound委托，不要求其组织等于销售主责组织；仅仅同组织则永远不能替代该指派。project owner/org改变使basis中的salesOwnerUserId陈旧时，旧handover不再产生新写授权，须真实重新确认/受控承接，不能保留旧授权暗门。

`OwnCondition(P,A,C)`：路径父completion与condition真实匹配同项目；父completion.producer_version=1、原结论conditional-completed；condition.responsible_user_id=A，父与条件真实来源链完整。该binding只产生**本人条件任务范围**，不是整个项目经营/提成明细范围。关闭还需M(A)有效、项目ownerOrg active、condition.pending、双CAS版本匹配；不因平台管理员/项目owner/同组织管理者放宽actor等式。

## 4. 精确动作表

所有行先满足本次有效session；POST还需现行CSRF。权限和关系是AND，不是OR。

| Action | 当前精确permission | 必须的项目关系 / 明确拒绝 |
| --- | --- | --- |
| 读取项目基础锚点、I验收/归档列表、D项目材料 | project:read | OwnerRead 或 Part；没有关系的同组织人拒绝。字段仍走现有敏感投影，scope不授予敏感精确值。 |
| 读取completion列表供本人条件任务 | project:read | 完整关系同上一行；若只有OwnCondition，SQL只返回本人相关completion及本人条件，parent.conditionStatus按**全体条件**服务器计算，不能因隐藏他人条件假称全closed。只给必要项目/完成摘要，不开放别的经营/提成对象。 |
| org-owned首次指派的最小项目锚点 | project:read | 满足CreatorBootstrap的来源/关系条件（写权限不是read替代）；仅给首次指派所需锚点/allowedActions，不因此给G/H经营或R5明细范围。 |
| org-owned首次个人指派（复用既有reassignOwner） | project:write | CreatorBootstrap + 必填expectedVersion；新owner active且是同一ownerOrg真实成员。首派消费origin不可逆；历史creator/source未知拒绝。 |
| D prepare / 产生新的项目职责grant | project:write | **OwnerWrite**；当前body拟指派的BA/EO不能授权本次prepare。待scope producer存在前不开放manager代准备。 |
| D participant本人确认 | **project:read**（现D7 map原值） | Part且cp.participant_id=A；draft current；只能确认本人全部职责。不能偷偷改成要求project:write，也不因写权限代替read。 |
| D finalize确认移交事实 | project:write | OwnerWrite，或DelegatedWrite+BA；最终全部本人确认/固定材料精确集合由domain校验；最终操作者不能代填各人确认。 |
| D rebaseline | project:write | OwnerWrite，或DelegatedWrite+BA；另需真实合同变更/再基线来源和CAS，不能靠关系直接改源事实。 |
| R5读取current/detail及角色结构 | commission:assignments:manage | OwnerRead，或Part。scope只证明项目关联；精确敏感字段仍受既有commission-compensation投影及 `commission:amount:sensitive:read` 控制，不能把范围proof当全员金额可见。 |
| R5 create/replace draft | commission:assignments:manage | **OwnerWrite**；仅current draft可替换。当前sales-owner作为最小可执行v1，见正式差异说明；不存在manager scope兜底。 |
| R5 freeze | commission:assignments:manage | OwnerWrite，或DelegatedWrite+BA；必须真实current confirmed handover本人确认链+同链receipt freeze+当前draft，冻结不自动execution。 |
| startExecution | project:write | DelegatedWrite+EO；真实current frozen角色与同链handover另行验证。销售owner若不兼EO不能代执行人准入。 |
| startAcceptance / createAcceptance / createCompletion | project:write | DelegatedWrite+EO，且与本次真实execution stage source中的执行负责人一致；证据/最终验收/结果映射/阶段CAS仍由domain校验。 |
| create/replace/void archive | project:write | OwnerWrite，或DelegatedWrite+(EO或BA)；另核真实终态、单current、版本链、无pending条件。关系不能重开项目或抹掉完成事实。 |
| closeCompletionCondition | project:write | **OwnCondition + 本人A.id严格相等**；condition-only关系不能关闭其他条件；最后全closed仅服务器更新conditionStatus。 |
| 修复必要的既有reassignOwner producer gate | project:write | **变更前OwnerWrite**；新owner active且确有目标ownerOrg有效membership；先锁旧project再核旧owner，不能读body.newOwner给本次授权。管理层例外无producer，v1不执行。 |

reassignOwner的完整授权分支只有：有个人主责时OwnerWrite；无个人主责时严格CreatorBootstrap。不能把第二分支泛化为“createdBy可随时reassign”。currentOwner可改派和prepare；EO/BA等按各动作真实职责执行，一人可以兼任多个已验证职责。

经理/管理层/平台管理员例外：当前没有可执行的身份→职责→组织范围producer；v1明确拒绝。`user:manage`、`role:manage`、`is_system_role=true`、任意roleKey、同组织或ancestor都不进入任何上述OR分支。本人条件代关闭也不开放：若将来另冻代闭合，必须真实closedBy、独立授权及理由，不能伪装responsibleUserId。

## 5. 具体签名与事务责任

```rust
// proposal only; no product implementation in this delta
pub async fn require(
    session: &mut CommonSession<'_, '_>,
    actor: &Actor,
    action: ProjectAction,       // server enum; exact permission table above
    target: ProjectActionTarget // Project/Handover/Assignment/Archive/Condition
) -> Result<ProjectAccessProof, contract_support::Error>;
```

Actor现字段：id、request_id、session:ResolvedSession、request_context。ResolvedSession现字段：session、user、user_snapshot、role_snapshots、pending_flush；没有dataScope。CommonSession现字段：connection:&mut PgConnection、state:&mut CommonState、participant:Option<CommonFlushParticipant>、request_id。不能凭空从Actor读取orgScopes/managerScopes，不能为了授权另开pool连接。

Target必须typed：Project{id}；Handover{id}；Assignment{id}；Archive{id}；Condition{completion_record_id,condition_id}。服务端先用真实资源FK解析projectId；Condition两key严格match。输入不得是body构造的 owner/duties/org JSON。ProjectAccessProof私有构造、不可序列化/不可缓存，持有actor/project/policy、当前owner/org/当前membership ID、handover/basis/confirmation/role IDs及versions、授权分支、condition-only过滤边界；G/H可复用同一事实proof，不能把它传到另一个项目或事务。

Proof分为FullProject、CreatorFirstAssignmentOnly、OwnConditionOnly，后两类不能被G/H当成FullProject。require可增加server-only Target::OwnerReassignment{project_id,expected_version,new_owner_user_id,new_owner_org_id}，这些body目标值只用于校验，绝不产生当前授权来源。

顺序：现有guard（认证/CSRF/route permission）→outer TX→target最小FK解析→写操作project FOR UPDATE→fresh账号/组织/membership（稳定UUID序FOR SHARE）→当前handover/confirmation或本人condition查询并验证固定payload→动作关系决定→调用domain→同TX业务/summary/audit/auth-flush。不得为helper自行BEGIN/COMMIT/flush或清CommonState。真实scope事实变化与业务写同锁保护；平台RBAC沿用既有request-local权限快照，不另建第二套role缓存。

没有project范围时返回与不存在相同的404（不泄露记录存在）；已在范围内但动作/本人关系不允许才403；source/version改变为409；DB错误仍500，不伪装无权限。列表必须SQL先按相同关系predicate过滤，再字段投影；不能取全表后在UI过滤。H/G可使用Owner/CurrentDuty/ConditionOnly等typed branches，但必须各自冻结动作permission与业务责任表；finance permission本身不变成全项目范围。全局成本率等无project的对象继续走自己的全局模块guard，不虚构projectId调用此helper。

## 6. 必须关闭的授权事实 producer 缺口

静态源码证据：Rust projects/service.rs:462–565的reassign只验项目状态、目标用户/组织和CAS，没有校验调用者是原owner；project_handover/service.rs:86–90仅require_write，prepare:266–315并未核调用者与项目的关系。若只给新I/R5加scope，持有project:write的无关用户可先把owner改成自己、或在合法合同项目prepare里指派自己，再拿新scope proof。

因此**Root联合G1必须包含这两个既有producer的前置scope gate**，不新增公开操作或全局权限；一次bootstrap另需下述最小origin事实表。通过受控owner变更/prepare生产真实关系，是现有必要上游，不准seed或改库假造scope。历史手工/seed职责只读兼容，不升级成新生产授权证据。

用户已批准同步收紧这两个producer。另须同TX补最小ownership-origin初始化事实：直接CreateProject的createdBy来源可靠（projects/service.rs:162–166从operator写入，store.rs:299用同owner参数写createdBy），但它也从一开始把actor设为个人owner，所以该origin初始化为personal/consumed。不能误给直接创建人一个日后可复活的bootstrap。

`LeadController_convertToProject`是已有org-owned来源：leads/service.rs:1470–1473继承lead.owner（可能无个人owner），createdBy是**实际conversion operator**，不是原lead创建者；insert_conversion_project同TX真实写入。该已有producer也应同TX建立origin（initial org-owned则available，initial personal则consumed）。当前只有可空createdBy和reassignment历史，**没有可靠的初始ownership/是否曾个人主责事实**；必须在这两个真实Project插入producer补origin。历史记录不回填origin、不猜source；无origin的org-owned首派fail-closed。没有新增CreateProject ownership模式、return-to-org操作或导入producer。

## 7. 正式文档差异与Root裁定点（不新增用户问题）

1. 正式矩阵允许销售负责人/管理层、主管团队范围；当前没有主管/manager范围producer。用户已采纳直接责任链safe v1，补充创建人一次bootstrap；管理例外fail-closed。把有C权限的当前销售主责作为draft维护人，是明确的可执行最小映射，不宣称“owner天然等于销售主管”；Root按本轮用户裁决登记design-change-required，不凭空补manager范围。
2. 正式矩阵“Project主责组织”在v1具体为OwnerWrite的精确membership；跨职能handover职责以合法owner生产的项目内指派授权，actor仍须当前有效组织关系。部门层级不隐含扩大；该可执行细化由Root冻结。
3. 仅OwnCondition得到本人任务最小读/写范围，不给同人全项目经营与提成范围。currentOwner/manager也不能代关。用户已批准本人关闭，此处不扩大授权。
4. 旧R3/ABCDEF全局范围行为、历史主管访问不因此宣称已整体修复。Root只对本批触及的G/H/I/R5及两个必要scope-fact producer应用此policy；若同步调整项目列表/详情scope，属于显式既有读侧语义收紧，必须列在G1与真实回归中，不静默重做所有旧路由。

## 8. 必要真实验收

同组织无关用户即便有project:read/write或C也不得访问/推进；跨部门但真实current handover指派且M(A)有效者可按职责行动；owner无其ownerOrg有效membership写拒绝；停用组织/撤销membership后不能靠cached primaryOrg继续写；primaryOrg相同但无真实membership不放行；roleKey任意改名/is_system_role不改scope；主管ancestor只读组织树不产生项目grant；owner转移/旧handover basis owner陈旧不得保留旧写授权。

无关用户不能通过reassignOwner/prepare先自授scope；本人确认保持R+CSRF而非W；owner不兼EO不能startExecution；EO不因EO可维护R5草稿；BA在同链确认后可freeze/finalize但不能代本人确认；condition责任人只能关闭自己且scope过滤不能把隐藏条件算closed。并发撤销membership/owner重派/prepare新版本/两条件关闭须稳定锁顺序、CAS可解释、audit与业务同outer TX。新路径名映射三个操作、两个UUID parent-child mismatch、URL编码UUID、旧ABCDEF single-key行为均需实际HTTP回归。本delta只给计划，未跑运行验收。

首派另测：真实org-owned creator首派成功；同组织他人/不同creator/无ProjectWrite/无真实origin/历史source不明/已有任何个人历史/initial personal/consumed后owner回NULL均拒绝；首派指定别人后creator退出特别权力；actor恰好被首派为owner时后续因OwnerWrite而放行，审计不能仍记bootstrap。双首派一成功一409；project/history/origin/audit任一写点故障全回滚。初始origin不是种子事实，由真实HTTP创建/转换事务产生。
