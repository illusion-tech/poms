# F25 / E04 故障与并发验收候选 32

本目录仅为 Root 可审查工具候选。作者没有连接 PG、读取凭据、安装 trigger、调用实际 HTTP、操作环境或改 Root；没有执行任何故障 / 并发验收。matrix32.json / MATRIX32.md 的35个故障与7个并发场景全部 planned-not-run，不能据静态渲染检查宣布实际 Pass。

## 接线与真实事实

`root-callback32.mjs` 导出 runFault32、runContendedRace32、runSortedFamilyRace32。它们不含 CLI 自动入口、HTTP客户端、数据库驱动或环境读取。Root 注入现有真实连接 / HTTP harness 的回调；不得用成功响应替身调用后再标记生产验收。

| Root 回调                                  | 必须实现的约定                                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| request(request)                           | 按 method/path/body/clientKey 发一次真实 HTTP，带脚本提供的 x-request-id、真实会话/CSRF；禁止自动 retry/登录刷新；返回真实 status/body、realHttp=true 和 Root 原始回执引用        |
| readOnlyQuery({text,values,readonly:true}) | 绑定参数执行提供的只读 SELECT/WITH；返回 rows、realPostgres=true；不读任何 token / csrf hash / credential 列                                                                      |
| openController()                           | 独占实际 PG session，返回 query/close；session-level advisory lock 不能用每次随机池连接，close须释放本控制会话                                                                    |
| installDDL({plan,statements})              | Root 审阅实际 owned IDs 后，在独立管理事务原子执行两条 CREATE 并 COMMIT，再允许开始 HTTP；失败全部回滚，不留下半个 function                                                       |
| cleanupDDL({plan,statements})              | 仅 DROP 此唯一 trigger/function，无 CASCADE，有限 lock_timeout；实际读回 pg_trigger/pg_proc 无该名字；不改业务表、不杀其他请求                                                    |
| withSerialFaultLease(fn)                   | 所有注入逐个执行，禁止多个故障 trigger 互相干扰；并发测试只并发所列两个真实业务请求                                                                                               |
| assertOwned(context)                       | 核对 Root 保存的真实 API producer回执 + 只读PG：每个项目/成本/来源/旧basis/目标/actor-session均受本验收独占，selectedCost/Project确属请求集合；业务数号scope/period与实际调用一致 |
| preparePendingAuth(context)                | 如场景要求dirty pending，仅靠真实时间到达throttle或Root既有已授权时钟能力；禁止SQL回写session时间或业务状态。若条件不可满足，标为未跑/受阻                                        |
| assertSuccess(context)                     | 真实重试后，根据matrix逐项检查业务版本、完整份额、继任链、原证据hash、来源真实性、audit/event计数及业务数号；必须执行独立PG断言，没有默认成功stub                                 |
| assertRace / assertFamilyRace(context)     | 根据实际两响应和PG快照断言唯一赢家/两笔独立成功，具体要求见matrix；不能只看HTTP状态                                                                                               |
| record(receipt)                            | 保存排序的Root实际请求/响应原回执、PG快照/lock读回、DDL原文、server版本和hash；工具只给摘要hash，原敏感快照由Root控制保存，不记录Cookie/CSRF/数据库凭据                           |

fixture.scope 至少提供 actorId/sessionId、独占 projectIds、唯一 r4f32_ requestId、冻结 operationId；按场景补真实 costIds、expenseIds、targetProjectIds、oldBasisId、selectedCostId、selectedProjectId、rateIds 和实际 numberScopes / numberPeriods。request包含真实 method/path/body/clientKey，路径和状态受冻结operation-map06核对。所有来源事实经 C/D/E/F 正式API产生；不插造成本、付款、费率、移交、阶段或任意会计状态。每个故障场景使用新fixture；整批替代注入使用同一双目标身份集合但改变权重/说明，选最大UUID触发第二个来源/结果，保证已有前置未提交写入。

```js
// Root 接入示意；rootHarness为Root已有真实实现，此处没有成功替身。
const scenario = matrix.faults.find(item => item.id === 'F20-replace-final-audit');
const fixture = await rootHarness.produceRealFixture(scenario);
await runFault32(rootHarness.callbacks, scenario, fixture);
```

## 触发器与全回滚

`fault-plans32.mjs` 返回实际 owned IDs 绑定后的可审查 DDL。PostgreSQL没有 permanent业务表上的CREATE TEMP TRIGGER语法；本方案使用唯一 r4f32_<随机技术nonce>_trg / _fn，短期安装并在finally逐名移除。Root必须用实际隔离验收库并先审阅完整计划。CREATE FUNCTION/TRIGGER 只做受控匹配、advisory barrier、固定P0032异常；没有业务 INSERT / UPDATE / DELETE / 状态伪造，也不禁用正式约束。

故障匹配同时用实际请求ID/actor与真实gov evidence关联，或严格已知 owned成本/来源/旧basis/项目；audit使用准确opId+actor+请求，auth使用独占真实session+当前请求未提交audit/security。跨项目basis的project_id=null时，必须能从真实sourceVersionTransitions识别owned成本，不能单凭null误伤所有批次。只租用一条故障点；不在全表无条件抛错。

Root控制连接先取两整数session advisory lock；HTTP在真实行trigger内请求相同xact lock而暂停。只读pg_locks/pg_stat_activity确认该唯一gate等待PID，说明真实请求确实到达该写点。此时取READ-ONLY32.sql的单语句一致性快照，再放行使trigger抛异常。真实HTTP必须500且错误不回显内部异常/金额；再读PG，所有owned业务行、来源snapshot、evidence、audit、security与pending-auth均应等于gate时刻可见快照，旧证据hash/说明/权重/金额不变。中途若HTTP已结束或gate无实际等待者，判为失败/未命中，不能算注入成功。

正向移除故障后只重试一次相同业务body/CAS，使用新requestId。重试必须为正式成功状态并验证仅一套完整结果。作者无法替Root提供真实fixture，所以case-specific assertSuccess是强制回调；matrix给出逐项断言，不能用“返回201”代替它。E成本映射/劳动替代还必须只读核对business_number_sequence，失败不耗号，成功只耗一个；该数号行是共享定义，绝不对其安装故障trigger。执行计数断言期间需Root隔离同scope/period其他写入，避免外部活动污染证明。

## pending auth 的准确边界

现有auth resolve到throttle时先通过独立连接touch_last_seen_if_due并提交lastSeen / idle / version；随后请求的SessionFlush用after.row_version参与业务事务。故障不能抹掉已提交eager touch，不能错误要求失败后等于请求前auth版本。

因此在业务故障gate处读实际auth行，作为post-eager/pre-coflush基线。pending-auth专用trigger只有当前业务audit或projection security在同事务已存在时才匹配，不会在eager touch阶段命中。dirty场景还须实证gate版本高于请求前版本。失败后等于gate基线；唯一成功重试再用只暂停不抛错的pending-auth trigger，PG观察更新前基线，提交后version须恰加1。User-Agent变化本身不会制造dirty SessionFlush；禁止SQL回写last_seen_at、伪造pending状态或悄改服务throttle。

## 受控并发

C01-C06先让A在真实写trigger暂停，已持有实际project/source锁；看到A的唯一gate PID后再发B。通过pg_blocking_pids确认B在实际project FOR UPDATE上等A，且只有一个候选PID；确认后才释放A。两个worker必须有独立真实会话，避免auth CAS噪声；项目fixture独占且不能有第三个请求，若PG观察歧义就失败。25ms轮询仅减轻观察压力，20秒是失败deadline，都不决定请求顺序。没有pg_sleep/随机延迟/未提交NOTIFY作为屏障。

A成功、B409后核对只有一个完整继任/源占用，B再用同旧CAS/同已占用源只重试一次，仍409且不增加业务/evidence/audit。不能把语义冲突的retry虚称成功。C07使用真实E poms:cost-rate family锁：控制器先持排序最后family；A拿第一family后等最后，B在第一family排A之后，PG逐段证实后释放。项目/成本集合彼此独立，两个真实HTTP均201、守恒且源版本不变；本例无失败者不额外retry。family key必须从实际rate/person source事实和E预锁算法导出，不从虚构费率或伪造SQL状态得出。

## 只读SQL、证据与清理

READ-ONLY32.sql给出实际参数化statement：完整owned快照、安全session字段、真实Payable及confirmed payment净SUM、唯一归属/继任/占用计数、gate及project锁观察。固定numeric金额/率/ratio/weight在PG生成JSON前::text，避免JSON/f64破坏尾分。快照是一个WITH SELECT，所有表同一statement snapshot；不要拆成多个无事务SELECT后称其一致。原始snapshot和HTTP响应必须保存为Root新证据并hash，不能覆盖旧作者01/03/25。

finally先解开控制gate、等已发HTTP收束，再逐名DROP trigger/function和关闭控制连接。未收束请求/未知COMMIT确认不能自动retry或判Pass；Root按已识别owned backend实际排查，工具不自行终止进程、删业务表或放宽约束。另保存清理读回：唯一trigger/function不存在、控制gate已释放、无owned请求仍等待，fixture按Root既有授权清理流程处理。本候选不实现业务SQL清理。

本次自检仅Node语法 / 纯DDL字符串渲染 / 源hash / Markdown，未向PG prepare语法。实际PG DDL、真实HTTP故障、并发、清理和独审均由Root执行，尚未Pass；未commit/push或GitHub写入。
