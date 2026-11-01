# M4.2 generated package items：有限提前 intent

本候选只补 `M4.2/package` 在发 HTTP 之前 package UUID 尚未生成的预约，等待 C
对最终源码及 caller 接线复核。它不授予身份，不创建 parent 占位行，不改变普通
`Fixture.intent`、`projectParentEdges`、PG 条件或原 `allCaptured` 认证闭包。

调用顺序：scenario 仍按原 source 建立 Max1 的 package intent（不可变 selector
三键 `handover_id/project_id/created_by`）。只把该步 package-item intent
延后；`runtime.perform` 分配真实单调 index 后、PG `beginCase` 前调用：

```js
await fixture.intentForGeneratedPackageItems({
    caseId: "m4.integration",
    index: context.index,
    op: context.op,
    sourceCapId: sourceCap.id,
    request: {
        logicalCase: "M4.2",
        stepId: "package",
        method: "POST",
        path: "/api/project-handovers/" + ownedHandoverId +
            "/attachment-download-packages",
        body: { confirmedSensitiveExclusion: true },
    },
    parentIntentId: packageIntent.id,
    expectedMax: 10,
}, packageItemAdmission);
```

`op` 只准原实际 `m.http`，UI4/producer 或其他步骤不在此许可内。原 selector 中
handover/project/admin 都必须已获真正创建证明和独立可见，handover 的不可变
project 关系必须相等。parent 必须 `planned/beforeObserved/Max1` 且未被另一 index
绑定。child 保留原 `{handover_id}` selector 与原 beforeIds，全 107 preflight
及现有行不可变身份检查照常；上限沿原 step 的 10，不虚构未来 package ID。

Root 的具名新公开 admission 形状：

```js
{
  kind: 'Root-R2M-exact-package-item-before-intent-admission', rootApproved: true,
  namespace: 'poms-r2m', marker: '1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5',
  runId, backend, database: 'poms_r2m_' + backend, sourceCapId,
  logicalCase: 'M4.2', stepId: 'package', caseId: 'm4.integration', maximumItems: 10,
  sourceReview: { file: 'docs/design/rust-r2m/<C-final-review>.json', rawBytesSha256 },
}
```

实际 source review 必须精确 pin 本 helper、Fixture、core、journal 和 profile
五件。Root 在新 matching cap 下执行；旧 cap、旧正常恢复、原 6d9/31
来源记录不替换。continuation01 将另做 literal
环境映射及来源复核，不由此入口接受可变 DB/marker。

普通 `assertCreationProof` 的 SDK/PG authority、before-absence、实际
INSERT、outer COMMIT、独立可见和所有身份规则保留；额外约束 parent 与 items 的
`run/case/index/op`，SDK outer-COMMIT context 也完全相等。最终 adopt
前，child.package_id 必须等于该 **parentIntentId 唯一真实创建证书 ID**，并联验
parent 的独立完整行及 handover/project/actor，不能借旧 owned package。parent
与各 child 分别保留自己的原事务及 COMMIT，不能假定同 xid。新 reservation 及
child before 快照不可变，重新打开 journal 也复核已经登记 child 的精确出生关联。

原 TS `AttachmentService.createProjectHandoverAttachmentDownloadPackage` 在构造
package/items 和实际 ZIP I/O 后一次
`saveHandoverEntities([package,...items])`；repository 是一次
persist/flush。之后 audit 另保存。Rust 也先 `save(ctx)` 再 `k_audit`。原 PG
rule121 以同请求真实 package INSERT event 或事前已证 package 验
handover/project/actor；本次不修改它，不假 audit 同事务。

纯测试用 Fake
owner/approval/reader/proof，无实际环境、private、DB、HTTP、进程或产品调用。它们验证有限预约和错误拒绝，不是实际
INSERT 或验收通过；actual/G3/G4 均待 Root/C。
