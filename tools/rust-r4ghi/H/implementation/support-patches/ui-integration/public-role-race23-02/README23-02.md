23-02 只纠正普通公开 Role 竞态工具的认证观测，不改已封 23、Root 或任何产品。

旧 23 将成功 freeze 与失败 peer 都按一次 raw touch 核验。真实认证路径在 throttle due 时先独立 raw +1，再把 request-local SessionFlush 合入成功业务事务，因而 winner 合法增加两次版本。旧断言会在 freeze200 已提交后误停。peer409 不运行成功业务 flush。

新候选在已证明 freeze 进入 Project 锁队列后，仅 SELECT 其真实 session raw/xmin 并封私件；peer 进入第二等待位后也捕获一份。两份中间行不写入 ownership ledger。before→middle 只接受现有 exactRawTouch，或完整 SHA/xmin 不变。winner 真有 raw dirt 时，middle→after 仅允许 row_version+1 与实际 onUpdate 时间，last_seen/IP/idle/所有身份字段必须逐值等于中间行，xmin 必须等于真实 freeze parent/payload/audit 的业务 xmin。没有 raw dirt 时 winner 完全不变。peer middle→after 始终完整不变；仍只追加确实观察到的 peer raw attribution，原共同 ledger 保留。

Root 应按旧 runtime-seal23.json 先提升 23，再按 products23-02.json 的精确 beforeSHA 提升本次唯一 fullcandidate，重捕完整工具闭包、新 role plan 与同 owner 两个真实 current-auth session。不能复用旧 closed binding。两个等待点、两请求 settle、完整 before/after 与单 winner ledger 的原边界不变。时间不足、无法读取中间行或任何差异都会保原件并停止，不猜造中间版本。

本次只运行 Node24 纯回归、语法及实际 FS 依赖闭包检查。未运行 SQL、HTTP、浏览器、服务或 Root 写入，未恢复已停止的 parentless SQL 子任务。五个 raw 可变字段与两个 managed 物理变动字段依据 source-pins23-02.json；这一静态源码审查不是实际竞态认证。
