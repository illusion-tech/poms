# A03 冻结参与者移到真实 draft 的受控负例58

本包只新增三个文件，不改变现有角色 producer、Root driver、SQL schema 或旧验收原件。作者仅离线检查；实际 SQL 只能由 Root 执行。当前11 state 只读观察到 Main 有真实 `business-admin`、`weightExact=0.000000`、非空 zero reason，且角色包 frozen；运行时仍从完整真实 snapshot 与 `state.owned` 重新确认，绝不按此观察猜 participant UUID。

入口：

```js
const { probeFrozenReparent58 } = await import('./frozen-reparent58.mjs');
const proof = await probeFrozenReparent58(ctx, {
  draftAssignmentId: (body?.data ?? body).id,
  projectId: activePolicy.scene.projectId,
  createReceipt: originals,
  createLedger: ledger,
});
```

`ctx` 必须为当前实际 Linux UI observer 的原 context，driver.lock 的 PID 必须等于当前进程。`createReceipt` 是 H afterResponse 既有的私有 `originals` pin（JSON 含真实 attempt/bodyBase64），`createLedger` 是同请求真实 ownership-complete ledger pin；不能传 JSON 声明或虚拟 context。两 pin 必须为当前 `ctx.priv` 下常规文件、canonical path、raw hash 一致，create 必须 canonical `CommissionController_createRoleAssignment`、真实完整201、无 transport failure，request path、返回 assignment ID 和全新 owned birth 全相符。

H 的独立18-05b hook 已采用本签名：真实 create 响应已完成、after snapshot / ledger / UI policy observeWrite 已校核，尚未转发响应给 Chrome，串行 `await` 本工具。仅真实 create 一次触发，完成后才让浏览器继续 detail/freeze。H 的 plan 必须显式批准 hook，并把运行模块和 `frozen-reparent-sources58.json` 一起纳入 exact sourceBases；本包不代写 H 或 Root 文件。

## 实际验证

Main assignment、参与者、freeze payload 与目标 draft 均必须存在、属于真实 owned 集合且当前 raw SHA/xmin 与 ledger 一致。目标必须为本次 UI create 的新版本原行、`producer_version=1`、`is_current=true`、`status=draft`、不同真实项目、有实际参与者；不能改用另一个 frozen 目标。actual enabled trigger/function 的 catalog raw hash随证明保留。

每项用新的完整 before snapshot，控制连接开启事务，按 UUID 顺序锁 exact 两个真实 parent、核 exact participant raw SHA/xmin，然后尝试一条受控 UPDATE：

1. frozen 零权重成员 `assignment_id` → 本次真实 draft；
2. frozen 正权重成员 `assignment_id` → 本次真实 draft；
3. 零权重成员 `user_id` → 同真实 frozen 包中另一真实人员；
4. 零权重成员 `role_type` → 同真实包中另一真实角色，并排除已有同人员同角色重复；
5. 零权重成员 `weight_units` 0 → 1，保持值域合法。

要求每项实际立即得到23514及精确 frozen/reparent guard 消息；唯一约束、deferred sum、连接异常或测试主动回滚都不能代替。控制事务无论结果如何都 ROLLBACK 并关闭，从不提交 DML。既有 `capture` 的只读快照事务保持原行为。

每项回滚后捕获两库139表、全部行 raw SHA/xmin、catalog/序列及对象，与 before 严格相等；此处没有 HTTP，因此不容认证 touch。观察 pin、before/after pin、输入、真实错误与最终证明只记顶层 `state.consumerChecks.frozenReparent58`，旧 fixtures/source 标签不改。

若目标过早 freeze、Main 无真实零权重、来源 pin 改变、真实拒绝/回滚/全量相等任一不满足，本工具不补数据、不 retry SQL 造事实。已开始的 probe 中断后须 Root 按 exact 原件对账；不得删除 marker 盲跑。callback 异常时真实 create201 可能已提交，必须保留该事实，不重 POST。

作者检查为现有 Root81 pure + 本包3 pure =84通过；它们仅验证 case 选取/必须真实 draft/精确23514识别，不认证真实数据库触发器。只有 Root 实际执行后才能增加对应 A03 运行证据，仍不自行授予整批 G3/G4。
