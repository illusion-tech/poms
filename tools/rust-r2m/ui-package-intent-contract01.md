# 原 UI4 package-create 的独立提前 intent

本候选只处理真实 UI4 页面点击“创建下载包”产生的 package/item 请求。API M4.2 的
helper74cb、Max10 和 Source10 caller 原字节不改；新通道独立
module/method/admission/id/array、`m.ui4.integration`、`m.http`、原 Max64。Linux
和 Windows owner 采用相同接线，待 C 新 source review/下一 epoch，运行中的
Linux/derived96 不改。

源已精确 pin 原 UI script82a7、UI scope2024、component a396、workspace
store64f9，以及 server/repository。原页面只选实际上传行的一个
checkbox。实际请求必须原样为：

```js
{
  selectionIds: [actualOwnedSelectionId],
  expectedSelectionVersions: [{ selectionId: actualOwnedSelectionId, rowVersion: actualRowVersion }],
  confirmedSensitiveExclusion: true,
  note: '由项目移交页面创建',
}
```

ID 不能从 body/query 取得归属。selected row 必须先存在真实创建证明/独立可见的
fixture ledger 中，并与已证 handover/project 闭包相符；入口再以该已证 PK
独立读取完整当前行/xmin，逐不可变字段核对，版本严格等于原 body，状态
included、attachment 也已真 owned。完整 selected-before 行和真实 body 原样保在新
immutable reservation。

每个 owner 的真实 HTTP hook 仍先全107 before 与普通 audit/security/Max1 package
intent；只该 descriptor+POST+exact route 延后普通 item intent。分配实际全局
index 后调用：

```js
await fixture.intentForUiGeneratedPackageItems({
    caseId: "m.ui4.integration",
    index: context.index,
    op: context.op,
    sourceCapId: sourceCap.id,
    request: {
        logicalCase: "UI4",
        stepId: "package-create",
        method: "POST",
        path: actualPath,
        body: actualRawBody,
    },
    parentIntentId: uniqueOriginalPlannedParentIntent.id,
    expectedMax: 64,
}, uiPackageItemAdmission);
```

随后原 correlation/Windows Native ACK/PG.begin/实际 HTTP 顺序保留。普通缺失
parent guard、PG 原 subject 条件、allCaptured、每行原 authority/PKabsence/outer
COMMIT/独立可见/全107/cleanup 不放宽。最终 child.package_id 必须等于该
parentIntent 唯一真实 birth.id，双方 createContext 的 run/case/index/op 与 SDK
outer-COMMIT context 均严格相等；各自真实事务/COMMIT 分别验证，不假 same
XID。persisted child 重新打开 journal 时也保持该出生关联。

新 Root admission（这里是原 namespace 的候选；c01 derived 版本只做已审 literal
映射）：

```js
{
  kind: 'Root-R2M-exact-UI4-package-item-before-intent-admission', rootApproved: true,
  namespace: 'poms-r2m', marker: '1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',
  runId, backend, database: 'poms_r2m_' + backend, sourceCapId,
  logicalCase: 'UI4', stepId: 'package-create', caseId: 'm.ui4.integration', maximumItems: 64,
  sourceReview: { file: 'docs/design/rust-r2m/<C-current-UI-review>.json', rawBytesSha256 },
}
```

两 UI CLI 新增 `--ui-package-item-admission <Root-public-json>`。UI4 的已有
provider-audit admission 仍独立需要；不能互相代替。C review 需 pin 本
helper、Fixture/core/journal/profile、Linux/Windows owner 七件 current raw
source。profile 仅加本 source，32→33，62 owned-table union 不变。UI1/2/3
无此许可，不因此重跑；API 既有 Max10/其它 scope 继续原规则。

纯测试使用实际 helper 和实际两种 HTTP hook 的 Fake dependencies；不读
private/env，不起 DB/HTTP/browser/进程。API/新 UI
两通道反例、body/版本/status/身份/old-package/index/COMMIT/源 pin/Root admission
均严拒。它们不代表实际 UI4 或 G3/G4 通过。
