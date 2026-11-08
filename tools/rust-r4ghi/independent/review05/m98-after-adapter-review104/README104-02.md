最终164 SHA2d04daff673fe36a68d33e7c11a7e677956034eb59cf38e823a38fa9cee3d0ee关闭原21498版的IR104-01/02/03。原版在Root checkpoint及本目录original原件保留为hold，不改标passed；本件仅FS/纯契约审查，没有真实M98或migrationAfter。

102顺序的具体after入口现已物化为 `R/tools/rust-r4ghi/capture-m98-after164.mjs`。其中R=`/mnt/e/projects/worktrees/poms-r3hijk-next28/poms`，P=`/home/wangzishi/.local/share/poms-r4ghi/private`，N=`/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node`。

```text
N R/tools/rust-r4ghi/capture-m98-after164.mjs --plan <真实私有164plan> --approved-plan-sha <该plan原字节SHA> --execute
```

旁边的plan-template164.json全actual输入未填，不可运行。审批freeze136另需在不含最终source digest的前提下固定 `supportingTools.migrationAfterCapture={file:R+'/tools/rust-r4ghi/capture-m98-after164.mjs',rawBytesSha256:'2d04daff673fe36a68d33e7c11a7e677956034eb59cf38e823a38fa9cee3d0ee'}`，以及 `retainedSource12.receipt` 为**真正私有139 receipt的准确pin**。164plan.retentionReceipt必须直接copy同对象，包括其真实bytes形状；不能改用公开summary。

私有139 receipt字段实际为kind=`actual-source12-candidate-and-real-data-retained-before-corrective-consumer`、producerEpoch、marker、stoppedAPI、activeExecution、before/after等。最终164核stoppedAPI.pid11616/processGone=true，activeExecution中的fd81/0598/1dde及API1351/no-relabel。公开summary才有API1351Stopped布尔，却没有after，原版同时要求这两个字段导致必然误停。最终版已改成消费真正private字段；migrationBefore继续原样copy它的after，不造新M97观察。

102 step7的表述在此明确勘误：两个136都真实成功后，先封**独立不可变命令bundle**，不能先封完整108总迁移receipt。bundle至少含 `commandProtocol:'fixed-programmatic-up-only-136'` 与两个真实commands wrapper；164的verifyFixedM98Commands136实际只读取这两部分并沿intent/execution/stdout/stderr/approval/runner/Node实核。bundle此时不引用migrationAfter。164 plan.actualCommands pin该bundle → 164产生after → 再按108模板封完整 `actual-normal-forward-M98-migration-receipt108`（before/after/databases/commands）。最终总receipt不能反过来作为164输入，否则after与receipt互引；也不能在164后改掉已pin的bundle去补after。

所以准确顺序为：真实140 → 真139停止/保留及M97 before → 最终产品/108future/H0/freeze136 → 正常136双库UP及命令bundle → 164无state只读after → 完整总receipt108 → 真实新build/API136/ready/B0 → final108plan及首次pending/fresh/R3 → B1 → 私有85 binding。H0从冻结到85不变；runtime JSON不进入business模板。所有真实13值仍null。

164实际前置固定：future context98及snapshot98，批准source/helper plain数组pin、完整source digest/count、原provision、139 private receipt/after、两真实136命令、原1351停止、两API端口无监听、无旧driver、无13state、owner文件0600。它不调用createContext/next/persist，临时ctx.state只有marker；两库以default_transaction_read_only=on连接并SHOW强核，经guard98再由capture做REPEATABLE READ READ ONLY，全139×2及objects观察只写私有wx原件。捕后重核产品源、完整H0、数组/命令/approval/plan原件、旧state原字节及13state仍不存在。实际函数body/一log/一seq/138业务和第三份fresh的完整比较仍由108执行，164的存在或语法不代表那些实际通过。
