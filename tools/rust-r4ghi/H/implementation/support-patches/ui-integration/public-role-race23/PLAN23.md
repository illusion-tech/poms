# 正常公开 freeze / revised-create 并发：Source-only 方案23

本方案遵照Root最新边界：只竞争两个正常公开生产命令。停止的parentless participant SQL窗口、committable及constraints探测不恢复、不改写。没有执行HTTP、SQL、DB或GUI；不是实际并发证据。

复用Role UI spare在界面实际create200之后的新draft，不另造项目。该UI first-create本身仍由原18页面/observer完成。源码是commission service `f68d44bcdebcbd2bb78ce035f122fa7cbc72c55b92dcce98f6fbbebf5ac02598`：create与freeze都先 `facts::project(..., true)` / scope取得同Project锁，随后读取assignment。create明确拒绝当前frozen，code为 `commission_frozen_change_requires_dispute`；freeze校验同draft的CAS/current/verified来源。

两个session均属于当前真实manager/owner、有相同当前身份/权限的不同有效session，不新建用户或角色。Root在独立Role DOM闭包准备前通过公开login创建peer session，并分别实际GET current-auth确认二者都有效、userId相同、session token不同；不能在本轮DOM14 driver活跃时写actor state。新Role plan以明确的observer actorKey绑定第二session，collector/generator从实际auth原件将其纳入final manifest，不手写actorManifest或塞假DOM场景。

正常请求体全部来自真实界面与同一服务器版本：

- UI freeze继续使用已通过role policy的原request，assignmentId/expectedVersion及confirmed handover六项ref/version/hash均不改变。
- revised-create只发 `CommissionController_createRoleAssignment`，projectId恰为同一spare；expectedCurrentAssignmentId与expectedCurrentRowVersion取实际draft GET及本次before中相符的ID/版本；participants沿用本次合法UI create已经成功的完整原请求值，精确合计1、真实职责/零原因保持。不回放停止处的1e-7负例，不手填新人员/UUID/hash/金额。

拟定的可选observer时序：

1. UI first-create200原件/after/ledger/policy完成后，缓存这一次真实request与返回draft ID，正常把响应交给Chrome。I58是独立可选顺序证据，必须用精确58-02；不代替本并发。
2. 真UI freeze进入beforeRequest并通过原policy后，控制连接只 `BEGIN; SELECT ... FROM poms.project WHERE id=真实spare FOR UPDATE`，核owned raw SHA/xmin。启动watcher并返回，让原浏览器HTTP正常发出。没有DML/DDL/人工业务数据。
3. 先看见唯一实际freeze app PID等待该Project控制锁，再由peer session发一次合法public revised-create。必须看到第二app PID在freeze后排队；请求/headers/body/response全为真实私有原件，不能用睡眠或模拟响应代替排队事实。
4. 控制连接始终只ROLLBACK/end释放。两个公开命令自然竞争同Project锁，目标顺序是freeze200获胜，revised-create409且exact code为frozen-change-requires-dispute。二者全部settle后才捕获共同after并归账；不能并行用两个各自before/after的api.request ledger相互抢记。
5. 正常预期只归账真实UI freeze的业务事务：同draft frozen/current、版本+1、原成员值与row SHA/xmin不变；新freeze payload/必要audit/summary同事务，peer失败没有新draft/新participants/成功audit。认证写按每个真实session/Common规则单独核。
6. before/after与两HTTP原件都保留后才断言并发结果。若未看到精确排队、传输缺ACK、反向赢家或其它状态，输出partial/block并等Root按实际赢家原件归属，不重放已提交命令，不放宽状态、不改Source来迁就结果。

成功时Root仍可把原freeze200交给Chrome，原Role UI完成标记沿旧四字段写入；额外revision是Root普通公开命令负控，不算一次新的UI表单提交。证明只记独立consumerChecks并引用原UIledger，不写旧producer事实。

必要工具增量只针对未来独立Role run：一个Root-only公开命令observer helper、Role Linux before/after可选接线，以及共享actor-key收集器增加该真实observer session字段。所有Runtime14/18、helper、plan、actors、dist须在本轮DOM14结束之后一次重捕获批准；现02闭包内不改任何字节。没有Linux服务/浏览器/DB执行。

该正常命令竞争测试不能证明或排除已停止SQL窗口，不将两个合法请求的状态机结果外推为任意直接DB写安全。实际A03/G3/G4结论仍待Root运行和独立证据。
