119/H1/B2 输入约定（候选尚未发表；供 Root 先准备只读原件）

Root 可读目录：`E:/projects/worktrees/poms-r4h-signals/poms/tools/rust-r4ghi/H/implementation/support-patches/resource-tool-admission119/`。实际 null 模板为 `proposed/tools/rust-r4ghi/business/resource-tool-admission119.template.json`；不得填入 business 模板。Root 在当前13私有目录另建完整输入，批准其 raw SHA 后交外部 publisher。

顶层恰为模板列出的字段，不接受未知字段。固定 kind/schemaVersion/namespace/epoch/run/registryPath 保持。其余 actual 全须提供：

| 字段 | 值与来源 |
| --- | --- |
| entryState | 当前13 state.json 的 **immutable copy** pin `{file,rawBytesSha256}`，不允许直接 pin 可变 state.json。必须包含 period204 等最近真实auth后已对账的完整state；publish时 live state rawSHA须恰等它。 |
| beforeSnapshot / afterSnapshot | 两个不同新文件的完整139×2 capture manifest pin。namespace/marker/epoch13/run一致，raw rows、xmin、meta/seq、objects全等，并分别通过该 entryState 的既有 `assertRecorded`。源码不捕DB，Root提供真实只读观察；观察适配器先 nonce lock，再读原state，read-only事务、不persist、不HTTP。entry copy的counter应是观察完成后实际保持的current值。 |
| baseRegistry | 原 R3 `state.consumerAdmission54.registry` 原 pin，不改23cc。 |
| baseB0 | 原 R3.consumer.candidateReceipt 的原 pin。 |
| baseB1 | 原实际 B1 pin，不覆盖原4c4f候选。 |
| sourcePins | 原 R3.consumer.sourcePins 原 pin，416/plain数组保持5e467及每叶不变。 |
| H0 | 原 R3.consumer.helperPins pin，全部195。 |
| H0Copies | 完整195数组，每项恰 `{file:'tools/rust-r4ghi/business/原名', pin:{file:'私有原字节副本绝对路径',rawBytesSha256:'恰H0该叶sha'}}`。副本须在本任务private目录，regular/no-symlink/nlink1；不得只存manifest而没有原字节。 |
| H1 | 新实际完整 helper 数组 pin，数组仍是 `[{file,sha256},...]`，按context的文件名字典序排序，包含所有mjs/json/test/template；数量动态，不硬197。 |
| deltaManifests | `[{manifest:pin,review:pin},...]`。包括最终H119作者manifest/独审与Root **period205-04 f2ec3a… / review119-04 2b24ff…**。支持恰一种已知格式：作者 `products[{file,beforeSHA256,afterSHA256,candidate}]` 或Root `changes[{file,operation,before:{file,rawBytesSha256}|null,after:{file,rawBytesSha256}}]`。所有实际变化必须恰由这些pin展开，无多/少/删/重复冲突；冲突要Root另封精确组合manifest。 |
| apiProcess | 原 R3.consumer.apiProcess pin；完整实际record还须与current state.apiProcess.record相等，并核/proc/PID start/exe/binary。API136原身份不改。 |
| schemaBinding | **内联对象**：原current state.schemaComparison108完整值，含原verificationReceipt/comparisonBaseline等原pins，不是新M98，也不是任意新receipt pin。 |
| resource | 下文 exact58 结构。 |
| independentReview | 本119最终非作者复核的真实JSON pin（另保留每delta的review）。 |
| executionTool | Root复制后的外部 `admit-resource-tool119.mjs` 自身准确pin，必须就是当前入口；不入business/416。 |
| nodeExecutable | 实际Root Node24 `{file,rawBytesSha256}`，可带真实bytes/version；必须当前process.execPath原字节。 |

resource 恰为：

```json
{
  "registryPath": "/fixtures/sharedSourceFollowup58",
  "recordProducerSource": "从原R3.sourceHistory选epoch12的完整source tuple对象，含sourceState原pin",
  "recordSHA256": "整个retained139 /fixtures/sharedSourceFollowup58 JSON摘要",
  "projectIds": ["4d9e57ad-4890-4f53-80da-c6d224ce576b", "51d60c76-6de2-432a-8714-10e3ed3234f3"],
  "projectBirths": [
    {
      "projectId": "一个上述真实项目",
      "source": "从原R3.sourceHistory选实际epoch10完整source tuple对象",
      "beforeSnapshot": "该owned.proof.beforeSnapshot的原pin",
      "afterSnapshot": "该owned.proof.afterSnapshot的原pin",
      "httpReceipt": "对应真实Source10 public HTTP receipt的file/rawSHA pin"
    }
  ],
  "receipts": ["whole old58 record内所有绝对file/rawBytesSha256 pin的去重列表，保11/12/失败原件，不能裁剪"]
}
```

`projectBirths` 必须恰2项、无重复/外项目。每个项目沿真实10→11→12 frame核各自 owned.firstSHA/原proof继承及该frame retained latestSHA/xmin自洽；允许不同frame合法更新，不能要求跨期latest恒等。Source10 before无PK、after一行firstSHA、实际HTTP请求/响应/状态/路径/marker/source epoch须相符。Source12 record完整hash与当前record恒等；后续业务更新允许currentOwned.latest正常前进，但原first/proof及119、基线、source、API、原58恒定。

外部发布器三模式（最终封件后再用准确SHA）：

```text
<Node24> <external>/admit-resource-tool119.mjs --plan <private actual.json> --approved-plan-sha <rawSHA> --inspect
<Node24> <external>/admit-resource-tool119.mjs --plan <private actual.json> --approved-plan-sha <rawSHA> --publish
<Node24> <external>/admit-resource-tool119.mjs --plan <private actual.json> --approved-plan-sha <rawSHA> --make-b2 <new private B2 file>
```

publisher先wx nonce锁，不调用createContext；完整验证并wx保存 verified119 receipt 后，只CAS追加 `state.toolAdmission119={registry:pin119,approvedPlan:pin}` 和sequence+1。原consumerAdmission54/schema108/R3/B0/B1不改；无pending普通API旁路。所有校验在原子state rename前；rename是完整metadata提交点，后续ACK文件失败标published-ack-partial，不当未提交/不重发。Root应另捕实际发表后全量观察并封守恒回执，旧partial保留。

B2只复制B1全部旧字段，新增 `toolRevision119:{baseCandidate:oldB1pin,registry:pin119,helperPins:H1pin,metadataOnly:true,originalReadinessInherited:true}`；不声称新的HTTP readiness观测，实时PID仍强核。119不反指B2。新Tax private current 和H46 private plan均显式 `toolAdmission119:pin119`，candidate/candidateReceipt取B2；H47委托新H46绑定，不改业务null模板。Scope/完整server period targets不由本协议放宽或裁减。

同步读者接口：`assertToolAdmission119(ctx,baseR3)`、`effectiveHelperPins119(ctx,baseR3)`、`assertRuntimeBinding119(ctx,baseR3,{toolAdmission119:pin119,candidate:pinB2})`。无119且真正完整旧H0时保原H0；新H1没有发表119则拒普通入口。新文件和原195都不能伪称旧H0已验新图。
