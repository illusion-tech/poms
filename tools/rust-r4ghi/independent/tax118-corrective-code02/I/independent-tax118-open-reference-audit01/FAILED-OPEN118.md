# 冻结八源引用与 failed-open 收口审计

本件只读分析旧 b3d/f205 八源，不审 Root 正在编写的 code02。初次落盘遇到当前 proof 已变为 `39d31c7…`，旧 SHA guard 在写 capture 前拒绝；随后明确改读 `tests/sealed-code01/products`，八叶逐一与旧执行源码 SHA 相同。没有把当前工作稿重标为旧版。实际失败25449的 state、intent/partial、没有 exit 的历史仍按原标签保留；本件未重跑任何实际模式。

## 确定的两个未绑定名字

TypeScript 6.0.3 只解析八个 JS 模块（`allowJs/checkJs/noEmit/noResolve/types:[]`），未导入或执行它们。旧源的自由值名诊断只有：

| 文件 | 位置 | 未绑定值 | 最小绑定来源 |
| --- | --- | --- | --- |
| `retained-tax-proof.mjs` | 232:60 | `sha` | 已有 `business/pure.mjs` 的 `sha`，加入当前 `uuid` import 组 |
| `tax15-facts.mjs` | 577:46 | `TAX13_OPERATION` | 已有 `business/tax13-facts.mjs` 的同名 export，加入当前 import 组 |

`tax13-facts.mjs:5` 的 `TAX13_OPERATION = SHARED58_OPERATION`，来自 `shared-source-inventory58.mjs:4`，值是 **`ProjectCostController_createOperatingRestatement`**。不是新增 API，也不改变业务选择。两个实际函数全文可保持不动，只补现有导入。

单独虚拟补 sha 后只剩 operation 诊断；单独补 operation 后只剩 sha；两者均补后的虚拟源没有自由值名诊断。另注入一个故意未绑定名字仍会检出；注入 DOM 的 `document` 也会由实际 Node global 对照检出，避免默认 TS DOM 库掩盖 Node 下不存在的名字。这些是编译器内存输入的正反例，不是 Root code02 的通过结论。

`node:*` 模块、`process`、`Buffer` 的缺 Node 类型诊断被单独归为环境噪声，且和真实 Node 内置模块/全局名对应。全量 JS 类型诊断并未全部通过，不以本次有限名称审计冒充完整类型检查、业务算法验收或 CI。

## 真实 entry 返回后，cap 返回前存在关闭漏口

旧 `openInvocation118` 在 677 行调用真实 `createContext`，之后在 684/685 的 runtime/provenance、689 的 ensureRecord、后面的分支、761/762 的 helper/build import、787 之后的 currentFiles 与 artifact/journal 等处都可能抛错。函数内没有覆盖这些位置的 try/catch。

旧 runner 的 `cap = await openInvocation118(...)` 只有在 promise resolve 后才赋值。open 拒绝时，外层 cap 仍为空；catch 中 `if(cap) closeInvocation118(...)` 不会执行。即使 open 已经 `caps.set(cap,d)`，只要尚未 return，外层依然拿不到该 cap。因此不能只在 runner catch 增加“若 cap 存在”来修复。

补救应留在 open 的模块私有词法范围，保留真实 factory 返回的原 root 对象，不新增 exported signer、传入 ctx/reader/guard/callback，也不再建第二个 context：

| 实际失败阶段 | 合法收口 |
| --- | --- |
| 尚未调用 entry，或 `createContext` 自身抛错且没有返回 root | 没有可合法调用完整 native exit 的真实 root；明确记录 entry 未返回、exit 未验证，保留 unknown/partial，不能拼 ctx 或伪造已关闭 |
| entry 已返回，cap 还没注册 | open 内私有 catch 使用同一个真实 root 尝试一次完整 native exit；保存独立 failed-open 证据，不造 Tax entry-verified、cap 或 C/S/F，不修改历史实际失败 |
| cap 已注册，但 open 尚未 return | open 内调用已有 `closeInvocation118(cap,null,{failed:true})` 一次；外层无法代做。原 close 的 finally 会销毁内部 capability |
| cap 已正常交给 runner | 沿已有 runner close 路径，避免对同一 capability 重复 exit |

entry 已返回不等于完整 Tax runtime/provenance 已通过。例如本次 sha 异常发生时，不能把一次成功 native exit 写成 `entry-verified` 或 Tax 成功。若失败发生在 ensureRecord 之后，已有真实 metadata 也不能删除并伪装没发生；下一次输入仍以真实最新 state 为准。

## 现有 native ABI 足够，无需改 H3

原 `business/source15-admission.mjs:207` 的确切签名是：

```text
assertRuntimeBinding15(realRoot, actualReg, {
  codeAdmission15: p.codeAdmission15,
  candidate: p.candidate
})
```

`actualReg` 来自已批准的真实 Reg5 原件，`realRoot` 只来自本次真实 createContext 返回值，native 模块仍用固定字面量路径。该 API 内部先完整调用 `assertCodeEpochContext15(...,{liveProcess:true,sourceFiles:true})`，随后严格核实际 Reg5/B1 与 B1 plan。它已经包含完整 native exit 所需校验，不能再为了“bookend”重复调用另一次 epoch guard；也不能用该返回值或某个 bool 来授予 Tax 能力。其内部仍有 B1 plan 验证成本，不宣称一次调用等于一次所有历史数据读取。

native guard 只覆盖 native/H3 的准入；Root 八叶等外置源码、input/review/runtime 等原件仍须按批准 pin 再核。外置 pin 重核即使失败，也应独立继续尝试 native exit，分别记录错误，不能在前一个 hash 异常时短路出口。只有所有必需出口证明都成功，失败命令才可记录真实已收口的 `closed-failed`；出口失败记录 `failed-preserve`，保留真正的主错及 secondary bookend 错，不声称完成。

cap 前失败可保存独立、明确 `capabilityReturned:false` / `nativeEntryReturned` / `nativeExitAttempted` / `nativeExitVerified` 的 failed-open 证据；不要伪造原正常 invocation 的 entryGuard、HTTP、ledger、family、after 或 completion。没有 domain capability 的事实不等于旧 Main13 或税务业务的新验收。任何 activeFault、pending 或 blocked 状态仍原样保留，不能顺便撤控或清错。

## 主错误不能被收口错误覆盖

原 runner catch 会重抛主错，但 finally 的 lock 读、身份断言或 unlink 若再抛错，JavaScript 会用 finally 错覆盖主错。这是条件性风险，本件没有观察到本次真实 lock 失败。code02 应独立尝试自己的精确 lock cleanup，失败时保留 lock 与 secondary 信息；存在主错时仍抛原主错，并把 bookend/journal-write/lock-cleanup 错附在真实 partial 中。没有主错而 cleanup 本身失败时，也只能失败保留。

失败证据的写入同样不能吞主错。旧25449没有 native exit 的事实不可由新实现追补为旧成功。code02 必须另封新八源 closure/codeReview，重新冻结真实 entry-state、新 nonce 与 exact prepare G2；本件不审其工作稿，也不授任何实际执行。

建议新回归分别覆盖：两个真实绑定与原 protected span 不变；entry 返回后的每个 risky setup 位置；caps.set 后、return 前异常；真实 root 引用身份保持与 native exit 恰尝试一次；外置 pin 错仍尝试 exit；exit/journal/lock 失败保留主错；createContext 未返回时不伪造 ctx/exit。隔离模型只能证明异常顺序，不能冒充实际 native15 正向验收。
