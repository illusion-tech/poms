# Fixtures-purpose actor 证明闭包最小增量

仅替换当前 Root `handoff16/binding-input16.mjs` 的 `usedActorKeys`。不新增DOM场景、不修改actorManifest、不改变auth/permission/final判断。原16和consumer54候选保持原封件。

Root准备新 fixtures plan 时，保持真实 `money-max(manager)` 与 `sensitive-mask(person)` 两个场景，在 `input.plan` 顶层明确增加：

```json
{ "actorProofKeys": ["execution", "finance", "unrelated"] }
```

沿既有 prepare16 正式流程生成 `metadata16.purpose='fixtures'` 和完整 plan/source/helper/build闭包后，collect16会对 manager/person/execution/finance/unrelated 共5人逐个执行真实 current-auth GET。generate16只从这些原件生成恰5人manifest；仍为 `actorBindingsFinal=false`。Root须保证真实当前登录有效；401或permission漂移按原流程停，不得补JSON或自动换身份。

`actorProofKeys` 只用于 fixtures-purpose metadata，DOM或未准备plan不得使用；重复、空数组、非法actorKey拒绝。所有源字节与整个plan SHA都会进入新批准闭包，旧11/旧72计划不复用。

真实Role DOM的参与者actor来自已批准 `writeActions[].participants[].actorKey`，本增量自动将它们纳入同一证明集合；Creator的targetOwner逻辑保持。它们是真实提交的角色职责，不是人为新增DOM case。Root以后为Role DOM配置正常writeActions即可，不给DOM添加actorProofKeys。

collector/generator共享这一个函数，双方对proof index和actorManifest的精确集合检查保持。未触及业务producer、Shared、SDK或HTTP；作者只运行纯回归/文件检查，实际5个auth GET与真实fixtures由Root执行。
