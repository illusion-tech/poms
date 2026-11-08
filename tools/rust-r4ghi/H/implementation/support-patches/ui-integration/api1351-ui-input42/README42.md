这是三个新 UI run 的字段指南，不是可直接执行的 plan。H42 没有产品补丁，不再改 cookieScope27；新 scope、actor index、binding、SourceBases 和完整 plan SHA 均由 Root 实际生成。H38、H33、Role03、Expense02 的封件和成功/失败标签不改。

当前固定元数据已逐 raw SHA 读取：新进程 `/home/wangzishi/.local/share/poms-r4ghi/private/rust-api1351-process.json`，PID11616，pin fd81b926…；新候选 `main01/007133-p1351-candidate.json`，pin1dde0fda…；新 overlay registry `main01/007134-p1351-registry.json`，pin05985940…，admittedSequence7134。完整 pin 在 known-process42.json。这里只认证这些固定文件的相互关系，不代替启动、live PID、真实新登录或 Gate 检查。Source12/406/M97 未改；旧 consumerAdmission54.registry 保留3ed7…。

prepare-input 的 sourceManifest 和 candidateReceipt 都使用本次007133 pin；apiProcess使用新fd81… pin。prepare-plan16只接受既有 schemaVersion/kind/purpose/plan/sourceManifest/candidateReceipt/apiProcess，以及可选 promotedToolClosure；不要往顶层补 processRestart1351、actorManifest 或 actorsFinal。过程 seam 由已晋升 H39 从真实 ctx 的 overlay 自动导入。

H38 五产品当前已精确等 manifest38 after SHA，已经能沿原 role18 worker运行，不需要重复提升。最初的“未提升”假设已在 first-check42.json 记为 FS 检查停点并更正。1351 prepare/admit 都要求同一冻结 currentHelperGraph，因此不可在两步中间换图；这两步 Root 已完成。接下来的新 UI prepare 要从当前完整 business/helper 图捕获，五个 H38 business 文件必须在新 sourceBases 中。cumulative20 只描述那20个原 runtime 文件，不直接代表全部 business 图；不要把历史174-helper restart 图称为新增 H38 冷开图。原工具 inventoryClosure 会重新收集 business mjs/json 及 import 闭包，无需手拼 sourceBases。

当前已收到的 cumulative20 为 `/private/ui-config/runtime14/consumer12-promoted20-restart150-01.json`，SHA c771b803fba8a054784e2262d7b369a8845802657705effa22bdcb76677d9826。Root 仍须在最终无 driver 边界验证它的20叶与实际文件一致；任何新的 runtime20 修改要新 receipt/closure。SourceBases、dist叶、metadata16、plan 和 actor index 都由新 prepare/collect/generate 产生，不能从 Role03、GH01 或先前135 plan复制。

三个片段分别替换新完整 prepare input 的 cases/writeActions；不能把本指南的 kind/requiredRootGeneratedFields 等说明键塞进实际 input。

* frozen-role42.fragment.json：新名建议 role18-source12-1351-cold01，relay workerKind=role18。只有 manager。项目389793fb-0f5b-48ea-a5f1-8515ee572d7f，assignment1817b9ae-ec3a-4910-aebd-07a2b6963975，已 frozen/v2，summary899a04d5-d27c-4fa6-aac4-3f277ce05571。采用 H38 原 kind=frozen-role-readback 和三条历史真实 freeze/ledger/public-race pin，writeActions=[]；不带 Role03 participants、existingDraftContinuation、publicRevisedDraftRace 或 I58 probe。真实新 cold-open GET current/detail和精确四成员/零权重原因是本轮要补的证据；Role03只有 prefreeze role GET，不能倒写为含 post-read。所有写保持 Chrome/Linux 双侧硬拒绝。
* gh42.fragment.json：新名建议 gh18-source12-1351-01，workerKind=gh18，只有 manager。项目f9044951-dfa3-41ec-a655-66234697c672。005103真实停在首次基线提交前，005115真实F pending已成功；GH01 metadata007127在旧 `/proc/108720` 缺失时于 createApi 之前停，无 HTTP，不需重做任何 setup。新 run按原 H33 真DOM基线→分类/capture→H质性attention→first gate tighten-block。新读侧必须确认 pending prerequisite 与实际 H08 qualitative-materiality-unassessed；不满足就停，不重编来源、成熟度、阈值或理由。
* lifecycle42.fragment.json：新名建议 lifecycle18-source12-1351-01，workerKind=lifecycle18，只有 execution。项目d2f48264-6c18-4fe7-9d96-606e3fd09b2f，旧真实 UI startExecution 已成功，stage aa02ca37-14b8-4781-b467-f4161a25552e。Expense02四项真实UI已成功，receipt e5af97c6…；不重跑 expense33，也不重跑 startExecution。保持原 eo-lifecycle片段，从新的真实交付文件开始验收/完成/归档，IDs/CAS和服务器时间均新读取。运行入口会核原 real UI start response、未存在 uiLifecycle18Receipts、EO恰project:read/write；这些仍由真实当前 ctx 验证，H不伪造消费标记。

所有 uiRun 各用九条新的 runtime paths、三条新的 relay paths。复制旧完整 input作为结构参考时，整体替换 paths，重核实际 eth0 IPv4/Windows node/Chrome/Playwright/pwsh/WSL/Linux node；不能默用旧 NAT IP、旧端口进程记录或现有目录。origin仍127.0.0.1:44551，backend31441；原 relay 纯字节语义不变。不存在补充actorProofKeys：三个 DOM run 的 expectedUsedActorKeys 分别 M/M/E，不为 metadata另塞假场景。

cookieScope27继续使用原两键输入：apiProcess=新fd81… pin，authReceipts=Root在准入后实际新 password-login HTTP receipts。不要传旧135登录、AuthCurrent作为password-login、Native登录或旧scopeproof。prepareCookieScope27本身只从成功登录的真实 raw responseHeaders 推导 Path/domain/flags，没有替 Root 验所有登录原件的1351进程stamp。因此在批准新cookie input前，Root须逐件FS核：kind=actual-business-HTTP-attempt、operationId=AuthController_createPasswordAuthSession、status/expectedStatus=200、responseComplete=true、transportFailure=false；顶层 processBinding1351严格等 `{registry:007134 pin,apiProcess:fd81 pin,generation:'API1351'}`，序号大于7134；每个实际参与actor都是真新1351 session。原件 responseHeaders pin需与该 receipt链接，Cookie值不得输出或写入本指南。新scopeproof仅记录属性不记录值，其 apiProcess 必须与新 binding精确相等。保持显式真实 `/api` Path和 duplicate guard，不改后端Cookie策略。若新真实headers不一致就停。

Root后续按现有实际调用顺序串行运行：新真实 login →审核 cookie input/scopeproof →新 prepare-input → prepare-plan16 → collect-actor-proof16真实AuthCurrent → make-generation-input16 → generate-binding16 →审完整 plan/binding →Windows relay。collect/generator会把新registry、新apiProcess、新actualActorIndex写入index/actorManifest/binding，并逐条核准入后AuthCurrent200的1351 processBinding。不能仅因同用户/角色/组织/权限而复用旧index或旧cookie。所有 new current-auth 必须是本轮真实记录，最终值不能预置。

以下仅是 Root 填实际文件与 raw SHA 后的调用格式，H没有运行这些入口：

```text
LINUX_NODE ROOT/tools/rust-r4ghi/business/prepare-ui-cookie-scope27.mjs --input ACTUAL_COOKIE_INPUT --approved-input-sha ACTUAL_COOKIE_INPUT_SHA --output NEW_SCOPE_PROOF
LINUX_NODE ROOT/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/prepare-plan16.mjs --input ACTUAL_PREPARE_INPUT --approved-input-sha ACTUAL_PREPARE_INPUT_SHA --execute
LINUX_NODE ROOT/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/collect-actor-proof16.mjs --input ACTUAL_COLLECT_INPUT --approved-input-sha ACTUAL_COLLECT_INPUT_SHA --execute
LINUX_NODE ROOT/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/make-generation-input16.mjs --collect-input ACTUAL_COLLECT_INPUT --approved-collect-input-sha ACTUAL_COLLECT_INPUT_SHA --actor-index ACTUAL_NEW_INDEX --actor-index-sha ACTUAL_NEW_INDEX_SHA --execute
LINUX_NODE ROOT/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/generate-binding16.mjs --input ACTUAL_GENERATE_INPUT --approved-input-sha ACTUAL_GENERATE_INPUT_SHA --execute
WINDOWS_NODE ROOT/tools/rust-r4ghi/business/ui-relay-run24.mjs --plan ACTUAL_NEW_WINDOWS_PLAN --approved-plan-sha ACTUAL_NEW_RAW_PLAN_SHA --approved-binding-sha ACTUAL_NEW_BINDING_SHA --execute
```

Linux ROOT是 `/mnt/e/projects/worktrees/poms-r3hijk-next28/poms`；Windows ROOT是 `E:/projects/worktrees/poms-r3hijk-next28/poms`。实际node与其它库存字节仍由Root本轮核。H42只做固定原件/源码FS核和5个H38纯例，未读活动state、未产生Root私件、未SQL/HTTP/浏览器/进程操作，不认证新cold-open、GH、lifecycle或G3/G4。
