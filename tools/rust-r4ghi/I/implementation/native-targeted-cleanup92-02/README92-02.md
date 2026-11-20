92-02 是固定 Native phase/source12-native01、固定新session 24a89525-deff-4fe1-a871-2df3ab1b203e 的独立 cleanup-only 候选，不修改旧92 runner、旧plan885660…、164源图、17证据fd95…或snapshot44。作者未执行SQL/HTTP/进程操作/Root写入。

真实登录body不含session UUID。原owned proof的kind=HTTP-real-response-ID、responsePointer字面=HTTP-real-cookie-token-hash，是通用ledger先把真实cookie hash当anchor，再第二遍重分类形成的元数据。此处不顺手改ledger、不宣称JSON返回session ID。新工具仅接受此精确tuple且重新核实际login200/完整ACK、原request/前后快照/ledger、唯一Set-Cookie→SHA→beforeAbsent唯一Native row、真实用户、出生SHA/xmin；任意/id或其它response-ID证明都拒绝。

plan-template92-02.json 已有实际原件pin、固定目标/4393/latestSHA，currentGraph留null，必须Root精确提升单一新工具后捕获完整当前helper图并审核新plan。代码逐叶核旧164仍原封；当前business图只能比旧图多这一个cleanup helper。旧Native17 planSHA在state保持原值，新cleanup用独立plan/currentGraph说明，不把改过的代码套旧plan。

Root新plan/currentGraph应放在phase根或其它受控私有路径，**不要预建cleanup92-02输出目录**。CLI只在Root晋升路径运行：`native-targeted-cleanup92-02.mjs --plan PRIVATE_PLAN --plan-sha RAW_SHA --execute`。无HTTP、无后端命令或登录重放、无process start/stop。

执行先把现state43实际bytes保存到新私有输出目录，保f103aab7…；核snapshot44所有原件与S0相比只多该精确cookie-born session，显式metadata-only消费sequence43→44并新增cleanup92_02说明。原plan/proof/owned/actor字段不改，旧44目录和manifest不覆盖。之后另取000045及以后fresh标签，全双库row SHA/xmin/meta/sequence/object必须等于44；再次fresh核唯一owned session/latestSHA/4393与无入向FK，确认原Native PID237076/start6534358已消失。

只有上述全部通过才写独立intent，借原namespace/provision/OID/角色/M97 guard连接owned Native DB，事务内FOR UPDATE再次核同SHA/xmin，再以该固定PK+xmin DELETE一次。提交后全量after必须等S0，两次fresh noop仍相等。只把该owned行标deleted并更新独立cleanup overlay/sequence，绝不改Rust state，不把Native17旧源重标，不恢复/改写任何原用户行或xmin。

失败/unknown COMMIT后保partial且不可重跑；输出目录wx、state原pin/sequence和新overlay都会阻止盲DELETE重试。需要Root根据真实后置快照另做metadata-only对账，不推断回滚。现Root原失败cleanup无DELETE，snapshot44仅是已落盘观察，不重新当成成功清理。

验证：FS-only实际Set-Cookie/birth/ledger与44原件重核通过，cookie值未输出；7项独立纯例、语法与无副作用help通过。纯例用合成事实参数验证证明规则；实际CLI目标常量固定，不能借参数清理其它行。真实删除、Root现图plan及最终S0守恒仍待Root执行与非作者实核。
