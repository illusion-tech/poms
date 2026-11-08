85-03 是 85+02 上的三个文件窄增量，须由 Root 非作者审后组合。原 85、85-02、原失败、所有 Source12 实际原件保持；作者不写 Root 产品/helper，不执行 SQL、HTTP、浏览器或 Source13。

business/tax13-bindings.json 逐字保留为 all-null 不可执行模板，不再是运行时输入。Root 在成功的 schema3 registry 和 B1 admitted candidate 之后，把该模板填为**新 ctx.priv 内单独的私有 JSON**，审其完整原字节，并用显式参数运行：

```text
node tools/rust-r4ghi/run-tax-continuation13.mjs finish-main --phase <unique> --bindings <absolute-private-JSON> --approved-bindings-sha <actual-raw-SHA>
node tools/rust-r4ghi/run-tax-continuation13.mjs prepare-tax --phase <unique> --bindings <same-private-JSON> --approved-bindings-sha <same-raw-SHA>
```

prepare-tax 仍 STOP；之后 fi-tax 仍单独 STOP；commit-tax 仍须另一明确调用，不自动串跑。所有六个原 mode 保留。旧的只有 --phase 的调用会在创建 context 前拒绝。help/import 不读取 runtime binding、不构造 context。

`loadApprovedTax13Bindings` 核显式 SHA、唯一普通文件/realpath/非链接与 exact private-directory containment，才在模块私有 WeakMap 记此解析对象的批准来源。Root CLI 的 expected directory 固定为 FIXED.private/business/g2-business13/main01；没有 caller 可选根目录或 reader。后续每次 source guard 重读同 pin、逐值比较对象，拒绝换字节、对象变更、未批准的等值 clone 与 boolean。`tax13Record.identity` 另保该实际 pin，跨阶段不允许换路径/输入。仅这一输入身份元数据新增，旧 producer/事实不变。

helperSources 现在必须含全部 business mjs/json，包括仍 all-null 的模板；不再排除模板。运行时还逐值核 registry.consumer.helperPins 原件与 ctx.helperPins 完全相等。私有 runtime JSON 在代码图外，故 B0→plan→registry→B1→private input 可单向建立，mint 后不改任何 helper 字节，不做 H0/H1 偷换或 refreeze。root entry 的实际 SHA 仍在原 helperSources 规则中注册。原 source/process/retention/candidate/legacy proof 全部校验保留；批准输入不能替代真实 authority。

仅 provenance、CLI 和必要纯测试变更。tax13-facts/main/semantics/sweep 四文件逐字等原85，faults 候选也未改；来源解析、BigInt/unknown、全部目标闭包、必要 FI 库存、rollback/同体正常、阶段 STOP 和历史选包边界均保持。9 个原测试名称/逻辑保留，加10个私有输入/模板/图一致/阶段身份/CLI反例，Windows19/19、Linux19/19，3语法和 help 通过。正向纯例用 own TMPDIR 的合成输入，不是 Source13/M98/producer 实测。

sandbox02 组合的是只读 Root170 helper 快照、I108-02 的12候选、85+02及本增量，仅作 import/pure 输入；不是最终图。首次组合器读取了错误 manifest 字段，在测试前停止，sandbox/attempt 原件保留；02读取真实files[]后完成。所有实际13 pins仍null。

最终 Root 顺序和 pin 细节见独立目录 source13-bootstrap-contract93：B0只供108准入，B1带真实 registry供85。process pin推荐两字段；其余 deepEqual 消费的 registry/retention/source-state pins逐值 copy，保留真实 bytes 字段。Root须实际冻结最终代码、审批/M98、新 build/process/readiness/B0/plan/registry/B1，再生成并审私有 binding；不把旧 candidate 或535提案编译收据改标。

封包检查器首轮误假定TAP的# tests，而实际Node24为spec reporter的ℹ tests；只修封包器识别这两种精确结束summary。原19/19及exit0均不变，首轮seal源码/stop说明保留。
