# 18-04：Expense17的四个真实UI写闭环

候选仅H独占目录；Root102FI结束后再审/提升6个新增business工具。它们消费Root已真实build/lint/66套463测试通过的17产品；未改Root/backend/Shared/SDK/任何旧封件，也未执行浏览器、HTTP、DB或producer。

顺序须为：14 EO独立spare真实UI进入execution→本18-04（实际manager作为当前owner填写E/F费用）→18-03 EO继续验收/完成/归档。不能先把EO归档再冒执行期费用；不消费MainFI、Own、MAX/MASK或GH spare。依赖18-03的`ui-lifecycle18-fixtures.mjs`原SHA（可先提升18-03六文件但不运行）；它只用于证明之前实际EO UI start原件及I54 provenance，不把manager变成EO、不修改ctx/producer record/f.execution。所有新请求仍严格使用真实manager cookie、实际Full owner和当前DB scope。

实际表单动作：选择Root核过且server active的expense category，明确项目级contractId=null、CNY及5650.00/5000.00/650.00；发生日取真实Full GET的backend Date在HK的日期。真实input/select/click登记费用→从返回和detail取得真实ID/version→允许confirm才真实确认→再读实际confirmed版本→只用expenseId/version+说明调用E生产成本→实际cost detail/history→正式manual F阶段归属。日期取该cost真实occurredOn，expectedVersion取真实cost版本，不填技术UUID/hash，不编I阶段事实；没有UI JSON文本框或API代发。

Root template的expenseCategory为null，须Root从实际字典原件/DOM选项绑定，不是自动第一个/猜测值。币种和净税数是已明确的本隔离fixture输入，不是服务器推算税率。若Root改金额，仍必须18,2精确字符串；policy用BigInt校验。snapshot raw numeric读取JSON.parse第三参context.source的原始token再算cents，MAX不会先用已舍入的JS金额值判断。未知/零区别由17真实产品支持；本case正向known split，不冒未知场景通过。

严格observer共4个写族：createExpenseRecord、confirmExpenseRecord、createProjectActualCostRecord、confirmCostStageAttribution。校当前actor/owner/org/project、真实类别、backend日、精确gross/net/tax/currency、来源ID/version、只发source-only成本body、F manual证据/发生日/CAS；raw兼容键仍null、projection full与DB exact钱逐项相等。拒未登记detail、Role/项目listing/其他会计视图或其他项目。E post前复用Root allowNumberCounter('cost-expense')，再capture并沿原rowSource业务号证明；不会让任意POST新增number scope。相同允许表其他PK变化另行拒绝；丢ACK/失败保留effects，不自动重发。

使用与18-03相同的现装Windows Node24/Chrome新headless profile、Linux真实44551→31441代理、完整before/after/Root ledger、UNC私有IPC。Root提升本6工具和其精确dependency后，再用新uiRun/purpose=dom做16/54 prepare/actual-current-auth/generate，业务目录全部实际helpers/6本工具+products/source+actualdist进新sourceBases。旧plan和binding不得复用。Windows实际入口：

```powershell
& 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe' `
  'E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/ui-expense18-run-dom.mjs' `
  --plan '//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui-config/runtime14/ACTUAL_NEW_UI_RUN.json' `
  --approved-binding-sha 'ROOT_REVIEWED_ACTUAL_RAW_SHA' --execute
```

完成只在顶层state.uiExpense18Receipts新增真实消费者observer记录；原producer source/数据不改，便于后续18-03复用EO。case allA08FormsPassed仍false，Role/GH等是其他独立组。中途失败不能重放已提交write，Root须据原件精确处理。

作者实际15项synthetic body/scope/CAS/number/exact-MAX-token/4步sequence控制与6模块node --check通过；这不是actual DOM/HTTP/DB/G3。Root实际业务见证仍pending新134/admission/FI完成。
