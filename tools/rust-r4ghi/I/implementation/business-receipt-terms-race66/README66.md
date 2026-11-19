# C receipt basis / 原terms防御并发CLI66

Root独占执行；作者只写提案并做离线检查。仅新增manifest列出的五个业务工具文件，不修改当前Root Source12/helper图、产品、schema或数据。此工具不恢复已停止的无父锁角色窗口复现。

## 输入与真实来源

Root为一个已有真实公开审核/激活、current scope合格的非保留合同填写 `plan66.template.json`。必须是本run真实owned的Project/Contract/Term，原terms有实际 `source_preparation_id`、payload hash、币种及四位税率；不以SQL造金融authority。Main、EO/Own/Creator UI spare、H form view、A05三边界项目均拒绝。没有合格非保留合同就先走现有正常公开R3/B准备独立小项目，不使用dummy contract/term。

工具实际重新登录已知actor，GET真实FullProject及active Contract，通过公开createReceipt产生一个新pending receipt（日期取实际DB clock，gross由Root审定，默认一分），再走公开receipt-basis preparation。只接受Root显式选择且真实ready的original term，不静默取latest；Contract GET提供实际CAS。confirm DTO只有真实refs、CAS、reason，不接收调用方净额/税额/币种/税率。

Root晋升后，按当时实际完整helper graph计算 `reviewedHelperPinsSHA256=sha(JSON.stringify(ctx.helperPins))`，并填当前source digest、binary hash、实际API process raw pin。模板null不是可执行批准。计划必须放当前private run目录，Root复核plan raw SHA后执行：

```sh
node tools/rust-r4ghi/business/run-receipt-terms-race66.mjs ACTUAL_PRIVATE_PLAN_JSON APPROVED_RAW_SHA256
```

CLI在创建context前取得独占driver.lock，绑定当前source/process/全部helper闭包与八个产品来源pin，不借旧134证书，也不自动改Source12状态/来源标签。

## 只读来源锁 + 不改值的失败SQL负控

1. 真实pending receipt/public prep/CAS全部记账后，持控制TX的 `LOCK TABLE poms.receipt_accounting_basis IN SHARE MODE`。
2. 仅一个真实confirm HTTP（canonical200）并行进入；观察它在basis INSERT的RowExclusive等待此控制PID。当前C源码已在此之前对exact original term取得FOR SHARE并校核refs/税币。
3. 另控制TX用READ COMMITTED和短本地lock_timeout，执行exact term的 `UPDATE ... SET payment_terms=payment_terms`。它只请求正常row-update锁，不修改值，不提交任何条款/税务事实。必须观察其直接等待本C应用PID，再实际返回55P03；普通CHECK错误、空命中、未观察等待或成功UPDATE均不能算通过。
4. 该TX无论结果如何ROLLBACK并关闭，再释放basis表控制锁。原C请求完整结束/账本归属后，才检查结果。没有第二个并行api.request账本，不重POST、不猜缺ACK回滚。

不创建临时trigger、业务行或DDL，不期望terms immutable23514。控制SQL成功/错误异常时同样回滚，原已发送C可能真实提交，保留其原始before/after/HTTP/ledger，记partial/blocked observation，禁止自动重试。

## 后置验证与边界

要求exact原term raw SHA/xmin未变；新receipt只确认一次且版本+1、金额日期不变；只有一个真实basis，原term ID/logicalVersion/rowVersion/innerPayloadHash与实际SourceRef完整匹配，currencyRef同原terms。使用实际原四位税率与BigInt精确cents独立检查净税守恒/HALF_UP，再核basis列与immutable frozen payload一致，绝不将检查器当producer。

basis/receipt/canonical audit必须同xmin，所有其它表行raw SHA/xmin、两库catalog/序列/对象不变，只容现有严格matcher认可的本actor认证touch。旧producer/Main/UI/A05 fixture record哈希守恒；所有新元数据只放顶层 `consumerChecks.receiptTermsRace66`。

任何已存在case（包括只有pending receipt或C已提交proof pending）都先停止，Root必须按真实原件精确恢复，不能删除marker盲跑。新pending receipt本身是真实公开业务写，后续setup失败也须保留/归属，不能当作零业务写的测试。

纯测试只覆盖exact cents/原税率期望、真实直接wait图边界与frozen basis refs/币种/净税校验；`--help`不创建context、不连PG/HTTP。作者未执行此CLI、SQL或HTTP，不授G3/G4。
