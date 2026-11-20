# 正常公开Role并发工具候选23

本runtime封件追加在原source-plan-seal23之后，不改原计划/旧18-05c/16-03。产品仅3份：新 `ui-role-public-race23.mjs`、Role Linux完整候选、actor-key收集器完整候选。只有作者工具/纯测试，没有SQL/HTTP/GUI运行。

Root在当前DOM/A06 driver结束后，真实为同一owner创建第二有效session（如manager-peer），不新增用户/角色/项目。须在Role新run的plan/actual current-auth collector闭包中明确登记；两个session都GET200、同user/role/org/permissions且token不同。新writeActions.role-forms配置见fragment。usedActorKeys只从这个实际observer字段纳peer，不能用actorProofKeys混入DOM或无关case来凑人。

UI first-create仍Chrome真实200，原observer保完整request/response/ledger。peer revised-create沿用该次已成功的participants原值，CAS取同真实draft，不改participant来制造证明、不回放pause1e-7负例。UIfreeze仍原policy准入的Chrome请求。

freeze beforeRequest只锁精确owned Project（BEGIN/SELECT FOR UPDATE/ROLLBACK）。watcher先见真freeze app waiter，才发peer合法public create；再见peer真实排在freeze后，释放控制锁。没有participant SQL、constraints、COMMIT或任何已停止窗口动作。未见真实顺序/缺ACK/异常状态均保partial并阻断，不自动重放成功写。

两个HTTP全部settle、控制连接回滚/关闭后，才原共同after/capture、单freeze赢家ledger及原policy。必须freeze200、peer409 exact `commission_frozen_change_requires_dispute`，无peer业务/audit/security写，无新draft/participants，原成员raw SHA/xmin不变，冻结payload/audit与assignment同xmin。若有auth变化，仅两真实session可匹配现有exactRawTouch；peer仅窄raw touch。其更精确归属经既有ctx.own追加peer request/proof并保原combined ledger，不改旧ledger/业务行或扩mutableTables。

通过后才记录额外consumerChecks证明并沿原worker写四个UI完成字段、向Chrome交原freeze200；peer不是UI表单通过数量。反向winner/不明效果先保全部原件/共同after，交Root精确对账，不回放。

Root须在非活图时exact晋升、重新捕获包含所有当前141/66/relay/58-02工具的完整source/helpers/dist/plan/binding，绑定新Role run后执行。不得在本轮DOM14/阶段验收过程中换字节。新候选不改Windows/browser/policy，不改backend/shared/DDL。

Node24实际6项纯回归通过、3产品语法检查通过；17文件check graph是当前真实依赖的离线导入沙箱，不能整目录晋升。先前5项日志保留，最终6项日志另存。没有实际并发结论，G3/G4保持false。
