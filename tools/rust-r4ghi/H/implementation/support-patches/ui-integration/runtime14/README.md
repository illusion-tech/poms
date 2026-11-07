另封的受控真实UI写闭环提案；13/10及所有08/09历史原件不改。当前不执行，不绑定即将清理的09/API132。最终10/API133/source/tax修正、actual actor/process/build pins由Root给定后，才允许Root审核closed binding执行。作者没有HTTP/DB/WSL/Chrome或真实UI动作。

13确实只允许GET/HEAD，只展示按钮不满足最终验收。14使用同Windows Node24.19/现装Chrome新profile、Linux真实44551→31441代理、实际dist hash/nonce、串行before/after capture/ledger。不同在于 **只有具体case的精确写授权** 可转发；不是允许任意POST。closed binding另外必填 `writeActionsSHA256=sha256(JSON.stringify(plan.writeActions))`，Root审核动作/actor/实际父锚/qualitative输入与source/candidate/actor/process同一闭包。

执行入口仍单一Windows：`windows14.mjs --plan <严格同namespace UNC-plan> --approved-binding-sha <Root-reviewed-sha> --execute`。plan14.template.json只给结构，epoch/run、Linux Node、最终source/actor/candidate/process等仍须Root实际绑定。旧09 file/hash只作历史，不能复用。actor manifest在EO权限收窄、MASK加三权限后重新实际冻结；不默改审批。

只允许三类写，且整个scene只能完成一次：

- Creator：只有 `ProjectController_reassignOwner`。同真实Creator GET的creator/owner=null/project version；目标是reviewed actor manifest中的真实M，并出现在实际OwnerReference；fresh before snapshot实际active membership；exact actor/project/body四键、原因与CAS。UI点击真实读取人员/组织，select实际server选项，填写说明并点“确认首次指派”；实际200+新record+project owner/version后置验证。
- EO：只有 `ProjectController_startExecution`。真实Full GET/current handover/六项server executionAdmissionContext逐字段相等，project before.version与UI CAS相等，exact reason/tag；UI textarea+提交按钮真实发一次，实际200、enteredBy本人、新project_stage_record与project execution/version后置验证。不会读Role GET、不消费主线FI K/stage。
- Own：真实DOM首个completion-list返回唯一pending本人TaskRow，才动态获得child ID/CAS。manifest只有I23/24真实parentCompletionRecordId；不伪造K。仅这对project/parent/child/actor允许新create-session→target→PUT精确文件bytes→complete→close；每步fresh snapshot核 `project_scope_context_version=1 / completion_record_id / completion_condition_id`、createdBy、实际session ID与状态。文件由批准的明确验收文字+真实Project/Parent/Task/Responsible构造，client实际选input file并上传；不将其叫外部审批。

Own没有泛化附件权限：create-attachment/project/actual projectId/context双UUID、acceptance分类、evidence relation、真实sha/size/name/type逐项一致，禁止baseAttachmentId/旧version链接。只允许本次session路径，local/proxy目标必须Root返回的同session object URI。新attachment仅同project active link。close只引用该真实新link、同父/子/version/本人/qualitative说明；实际OwnClose DTO+closure row/condition closed/版本+1/parent版本+1后置核验。现R2 UI target body={}、complete仅checksum时，按正式optional CAS合同如实记录session锁定检查，不虚加客户端版本或伪称发了CAS。真实pending/uploading/uploaded/completed状态已按实际SDK/Rust源核。

每个写都保存实际incoming/configured headers、body bytes/JSON、真实upstream response，再capture after并使用该operation专属responseBirths/mutableTables/updatedAnchors调和；对象PUT沿原精确session/storage-key/bytes proof登记。额外逐行检查允许表里的changed PK，别的project/session/condition即使同表也拒绝；检测越界会移除该表宽泛mutation授权，让原ledger阻断，绝不泛化证明。失败或丢ACK保留真实effects与partial，不推断rollback，不自动重POST。成功码始终原canonical（如Creator200、session201），不把201失败转PASS。

I23/24真实spare绑定：`creatorOwnership23.uiSpareProjectId`；`uiFixtureViews23[eo|own].pause.result.{projectId,parentCompletionRecordId,commandActor,commandActorId}`。EO/Own独立真实项目，必须createApi(openFixtureView(ctx,key).ctx)，准备普通真实链无FI。Observer不复制ctx/owned、不替换根fixtures，也不自己重建stage模型；只有实际UI响应、完整ledger和DB后置核过后，直接在Root持久化record上写 `UICommandObserved=true`、真实observer/response receipt/operation，再调用Root原persist闭包。Root主线fixtures、FI项目/stage、sourcePins保持逐值不变；只剔除这四个明确UI receipt元数据做invariant。已消费spare不可再拿旧“执行前/未关闭”HTTP重复证明。

browser-cases14先保留13的真实read/scope/敏感/无RoleGET/own-first/精确下载检查，再通过locator/input/button发实际写；没有page API手发business请求、route.fulfill、DOM注入或假command response。Creator/EO/Own在14没有writeAction就拒绝运行；仅readonly按钮展示不能得passed。UI完成后result含实际operation/status/新record与observer writes。Legacy仍独立controlled兼容负例，不冒生产来源；MAX/MASK仍真实source/string/null显示。

Root最终需要真实Windows↔WSL、完整DOM、HTTP/DB/ledger原件才能验收。当前作者只有模块语法与26项 **synthetic admission/control** 单元（含错actor目标/父子/版本/bytes/link/顺序/同表错PK拒绝），不是已执行真实producer、UI写或闭环通过。禁止把这些或旧HTTP计入当前DOM/G3/G4。所有public输出无cookie/password/body；raw/private与新Chrome profile保留原权限边界。
