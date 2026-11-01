# R2M B 验收驱动协议

本文件是 G1 后工具实现接口，不新增产品 API、fixture 权限或验收范围。Root 单一持有环境、进程、HTTP/PG/浏览器执行与完整 source cap；B 的模块不读取任何 private、不启动进程、不直接 import HTTP/PG/Podman/Playwright。

## 文件与入口

- `acceptance-source.mjs`：`new SourceReader({root,pins,sourceEpoch})`，只读具名 raw-byte pin；`read/text/json` 拒绝未 pin 路径、private、默认env、tmp runtime tree、symlink/逃逸；`receipt/assertUnchanged` 给最小来源回执。`verifySourceCap(cap,{candidate,files})` 验 Root 在最后产品补缺/构建后统一生成的当前 capsule。旧 cap 不冒充当前。
- `scenario-input.mjs`：`buildScenarioPlans(input)` / `buildSurfaceProbes(input,bindings)` / `buildUriProbes(bindings)` / `nativeProducerRoutes`；全部为纯请求/副作用输入。
- `acceptance-dispatch.mjs`：`createDispatch({surface,nativeOnly})` 返回固定 `resolve({method,path,purpose})`。115 method/path 永远到候选；只具名 producer/read-model 到 Native；未知拒绝。收到404/错误不得重新 dispatch。
- `acceptance-compare.mjs`：完整事实与原始响应比较，显式 identity/clock/opaque cell 证明才可映射，其他字段不删除、不宽松忽略。
- `acceptance.mjs`：Root 传入下列 deps 后执行；模块本身没有服务地址/环境/凭据发现或进程所有权。

## Root 需要提供的 deps

`runAcceptance({backend,candidate,sourceCap,input,fixture,bindings,deps,selection})` 中 `backend` 为 `nest|rust`，`candidate` 为40位SHA，sourceCap见下。`selection` 只能是已冻结case ID子集；报告把未选择项列为未运行，不能称整个矩阵通过。

1. `deps.request({executionBackend,method,path,session,body,headers,caseId,requestId,purpose})`：向已拥有的固定后端执行一次请求，`session` 是 Root 保管的不透明会话句柄，永不序列化。返回 `{status,body,bodyBytesSha256,bodyBytesLength,headers,executionBackend,window:{startedAt,finishedAt},transportComplete}`。headers只允许公开 `content-type/content-length/content-disposition/location/x-request-id`；Cookie/token经Root内部会话管理，返回公开cookie flags而非值。`location`含OAuth state时只提供经验证脱敏摘要。
2. `deps.facts({caseId,phase,tables,scope})`：使用本run受控连接只读快照，返回 `{readOnly:true,complete:true,catalogDigest,columns,rows,scope,window}`。`columns` 是每表完整物理列名，`rows` 为每表全部本run/明确借用目标行；Root还提供完整107表outside-scope diff，不能只查预计写表而漏副作用。事实原件按Root既定private/public脱敏策略保全；B报告只给摘要/hash/差异字段路径，绝不输出凭据列原值。
3. `deps.prepare({caseId,backend,requirements,fixture,bindings})`：只创建该场景明确源输入或实际Native生产者前置，返回 `{bindings,prepared,certificates,sourceCapId}`。`prepared[]` 每条含原源码file/hash/函数/参数/列投影/PK映射和actual INSERT/outer-COMMIT/visibility证明，标作prepared而非生产者。实际生产者只能经冻结的具名方法/路由与SDK7.0.11 afterCreate+outerCommit、原始before-absence和PG证书；不能凭response/query ID adopt。
4. `deps.certify({caseId,before,after,requests,fixture})`：把Root实际SDK/PG/直接INSERT证书与fixture已批准ledger闭合，返回 `{complete:true,traceComplete:true,registeredRows,creationCertificates,mutationCertificates,unknownCreates:[],unknownMutations:[],sourceCapId}`。B只能使用已经fixture验证/登记的证书；不得给出boolean作为创造ownership的替代。证书保留原对象、外层transaction事件、原PK/row identity、独立可见性/COMMIT ACK和case/run/sourcecap关系。
5. `deps.internal({operation,caseId,fixture,bindings,sourceCapId})`：只允许 `numbers-nine-scopes` 与 `common-shared-uow` 两个具名内部服务probe。返回 `{operation,backend,complete:true,calls,observations,certificates,sourceCapId}`；Rust probe ELF和Native入口同cap绑定，不新增HTTP API。Native independent EM/Rust borrowed connection语义分别输出，不能统一伪造rollback结果。
6. `deps.supplier({operation,caseId,fixture,bindings})`：只允许本轮合成Feishu/OBS的具名mode/restore/read-byte证据，不接受任意URL/key。真实supplier HTTP由Root owner执行；结果不含keys/token。
7. `deps.finishCase({caseId,fixture,result})`：只停止/restore该case已登记worker/fault；返回已完成的关闭证据，不能自己推断全run清理完成。最终 `deps.closeout({fixture,caseIds})` 返回所有writer已drain、完整107引用扫描、borrowed不变、两次cleanup和ports released的实际回执。任何未知writer/COMMIT/引用都保留状态并fail。

`prepare` 现分固定phase：`bindings-only`/`step-scope-only`只分配名称、计划ID、原来源参数/metadata及opaque会话，不执行隐含业务请求或INSERT（返回businessProducerRequests=0/businessRowsInserted=0）；`insert-exact-source-plan`只执行B所产逐source投影；`exact-owned-mutation`只执行具名已owned row字段操作。实际Native生产链由ordered `original-source-request` 逐method/path/body执行，不在prepare里藏整链。单例设置另用具名`baseline-setting-lease` phase，见下。

Root可以把上述函数绑定到单一新的 fixture/owner，不需要给B私钥或env。证书和snapshot的规范适配可在Root单一wrapper中完成；禁止改旧helper的guard来满足新接口。

## 具名前置与所需表

M1/M2基础：本run admin/viewer及新org/role/user/member、local credential、auth_session、role/permission/user_role/user_org；dictionary/settings、business_number_sequence、audit_log/security_event。M3 Contract是原prepared draft source+Native submit；Payout/Adjustment为本轮原Native生产链，不能仅造approval row。所需合同/提成/摘要/确认/todo表由A的frozen identity table集合逐项准入；B的case给明确requires，不自行widen到107表可写。M4 provider/upload/attachment/version/link/handover selection/package/item与真实最小facts；M5 provider/grant/ticket/binding/source/mapping/run/diff及平台实际副作用。实际表名以原catalog为权威，未知表使运行前失败。

M2 setting来自92 migration已插入的`attachment.max-upload-size-mb`，绝不pretend-create/own/delete。仅Root corrective + C exact-source review后的 `environmentBaselineSettingAdmission` 可建立新M库单例lease。每run使用Root固定scope `m2-ui2.attachment-max-upload-size`；M2/UI2真实GET/PATCH的requestId/SDK证书caseId都映射到此scope，另保留logicalCase/stepId。`executionCaseId`导出此精确映射。`admitBaselineSetting`→每请求`recordBaselineSettingAfter`→所有writer最终`drain`→`restoreBaselineSetting`→cleanup。B recipe不在HTTP仍活跃时中途restore；`validateCloseout`要求原完整行精确还原且owned/deleted均false。不同UI run单独admission。

`facts` wrapper必须给 `primaryKeys`（包括system_setting的key）和 `outsideScope:{complete:true,tablesScanned:107,unexpectedChanges:[]}`；`columns`/`rows`每所列物理表包含所有真实列。rawCases只交Root的`retain`回调私有保全，公开report只给hash/计数/脱敏路径。跨端比较的semantic cells必须按stepId和before/after/response精确绑定，clock仍保留zone/fraction digits，不以全局UUID/timestamp regex删字段。

## 当前统一 source cap

Root统一冻结 `{kind:'r2m-source-cap',id,candidate,complete:true,privateCopied:false,files:[{file,bytes,rawBytesSha256}],manifestSha256,artifacts:[{kind,bytes,rawBytesSha256}]}`，`manifestSha256` 使用 `sourceCapDigest(files)` 的稳定JSON公式。artifact kind为 `native-main|rust-release|rust-internal-probe|ui-build`，原字节在Root owned新namespace保全；B只引用同cap ID，不逐run复制运行树。acceptance源文件也必须在执行前入cap。出现产品或工具delta后新cap/new epoch，不回写旧G1或旧运行。

## 公开失败与清理回执

错误报告仅保留固定error category、case/request ID与缺失的证据字段路径；不得序列化 `Error.message/stack/cause`、环境、会话、child stderr或任意服务器错误payload。原始受控证据由Root保全，公开记录只给file/hash。最终closeout必须包含每一attempted writer ACK、exact ledger cleanup、独立after-COMMIT zero、第二次 `matched=0/changed=0/objects=0`、borrowed完整行不变；B不会从进程退出或HTTP200独立宣称清理通过。
