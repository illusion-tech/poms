原36封件不改。本增量只修36的一个policy P2：组件freeze成功后会自动reload current/detail，原continuation读断言仍要求draft/v1，可能真实commit后误报。applyAfter36，before/after严格见products36-02.json。

新规则按实际观察状态分开：未收到并验证freeze成功前，仍只接受同一born draft、current=true、version1/verified-producer；frozen不能提前通过。只有原observeWrite已经核实真实row frozen/版本递增/actor/payload及command hash/summary一致，才存明确frozenRead36期望。之后current严格同id/project/current/version/source/Handover/合同/基线/冻结summary/hash/actor及原精确参与者；detail的nested summary与顶层payload refs/hash也必须等该实际期望，且不能再提供freeze动作。不是允许draft|frozen任选；freeze后旧draft也拒绝。

fresh流程没有existingDraftContinuation36，保持原行为；旧18的12项纯控制仍通过。新4项状态流回归执行实际policy的draft读取→admit→模拟真实after rows/payload的observeWrite成功→自动frozen current/detail读，并验证提前frozen、后退draft、错id/version/current/source/hash/ref/actor和detail再给freeze动作均拒绝。纯例不算HTTP/UI/DB验收。

其它36工具、I58五项完成proof门、原006937/006938 create pair、正常23公共竞态、Root producer/四UI字段更新规则全不变；Root继续用实际006965 aggregate pin填fragment后重新捕获新Role03闭包。原Role02仍failed/create不重发。作者未写Root或发SQL/HTTP/浏览器。
