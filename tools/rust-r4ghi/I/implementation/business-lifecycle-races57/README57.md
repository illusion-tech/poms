# A07 实际并发、双父键与必要敏感读取审计候选57

本包只新增 `manifest57.json` 列出的七个业务工具文件，不覆盖 Root 102 个必要写 FI 正在使用的 helper。完整候选在 `proposed/`，`candidate/` 只是带当前 Root 依赖的离线检查沙箱，不可整目录晋升。

作者仅作源码、语法和纯测试检查：87 个模块语法检查、85 项纯测试通过。没有执行 SQL、HTTP、服务或浏览器，没有给出 A07/G3/G4 通过结论。Root 晋升和实际执行前须比对 manifest 中六个产品来源 pin、九个直接 helper pin及七个目标文件仍不存在。

## 当前实际输入与顺序

全部命令使用 Source11/API134 已 mint 的真实 consumer epoch/run；`EPOCH RUN` 必须取该新私有 state 的实际路径参数，不得用旧 Source10 driver 或重贴旧 fixture 的 source 标签。现有 `createContext`、consumer admission、进程与来源检查继续生效。新增元数据、上传缓存和验收原件归入顶层 `state.consumerChecks.lifecycle57`，原 Own、A05、Creator、Legacy producer record 均不改。

1. 等 Root102/main lifecycle 和 UI14 的实际执行停下，确认同 run 的 `driver.lock` 已释放。主线应有真实 `fixtures.completion.id` 和 `fixtures.deliveryEvidence.attachmentLinkId`。Own UI fixture 的 A 已由 UI 关闭，B 仍 pending。
2. 先执行 `cross-parent`，对 B 实际提交错 parent UUID、真实异项目证据 link、错误责任人 manager，分别期待 404、409、403。每次完整响应后验证两库所有行、xmin、元数据、序列和对象不变，仅容确切当前 actor 的独立原始认证 touch；不关闭 B。
3. 再执行 `same-task`。unrelated 为 B 本人，通过公开 purpose 上传入口产生同 B 新证据，再以同一 actor 两次真实登录的不同 session 提交相同 parent/child CAS。控制连接仅对该真实 completion parent `BEGIN / SELECT ... FOR UPDATE / ROLLBACK`，释放前必须观察两个实际 app waiter（可由项目锁形成间接阻塞）。两次 raw HTTP 共用一个 before/after，期待恰一 200、一 409、一个 closure、parent/child 各一次递增、一个同 xmin 的必要审计。两请求不并行调用各自 `api.request`，避免 ledger 相互抢记。
4. 等 A05 `cent-max` 的真实 published snapshot/H 检查完成，执行 `prepare-two-task`。读取 `fixtures.a05Boundaries26.views['cent-max']` 的真实已发布原件与执行来源，EO 实际 GET 再核当前 execution/stage ID，然后复用现有公开 lifecycle producer 产生最终 conditional acceptance、原结论不可变的 conditional completion 和两项责任任务，严格停在首个 Own list 前。所有新 lifecycle 字段记入独立 consumer view，A05 钱、已发布证明、原 source 标签不变。
5. 执行 `different-tasks`。两真实责任人各自读取窄列表、上传本 K purpose 证据，以同一旧 parent CAS、各自 child CAS 竞争，期待一成功一 409，赢家后 aggregate 仍 pending，loser child 整行 SHA/xmin 不动。随后实际刷新 loser 的父版本，再只提交其尚未关闭的真实任务；服务器在两个 closure 都存在后才返回 closed，原 `conditional-completed` 结论不变。
6. 等 H16 真实 MASK fixture 完成后执行 `sensitive-get`。使用有 finance basic、无 operating sensitive 的真实 person，不能用全权限 manager 冒充敏感投影审计。精确 FI 命中本请求 `security_event` 的 `sensitive_field.masked` INSERT 一次，期待完整 500、无受保护成功 payload、所有业务/审计/安全写回滚，再单独作一次正常 masked GET。

```sh
node tools/rust-r4ghi/business/run-lifecycle57.mjs EPOCH RUN cross-parent
node tools/rust-r4ghi/business/run-lifecycle57.mjs EPOCH RUN same-task
node tools/rust-r4ghi/business/run-lifecycle57.mjs EPOCH RUN prepare-two-task
node tools/rust-r4ghi/business/run-lifecycle57.mjs EPOCH RUN different-tasks
node tools/rust-r4ghi/business/run-lifecycle57.mjs EPOCH RUN sensitive-get
```

`--help` 不读取私有 context，不导入 HTTP case 模块，不执行任何实际请求。真正运行的 CLI 仅允许 Linux，在已有 root lock、active FI、blocked observation 或 cleaned state 时拒绝。

## 中断与原件

并发前先持久化 race intent、共同 before、真实两个输入 hash。两次请求各有私有 request/body/headers/response 原件；公共记录不带认证 header 或完整业务 payload。控制锁无论成功或异常都回滚、关闭，并等待已发出的两请求结束，再捕获实际 after。任一传输未完成、未观察两个 waiter、状态异常或归属不全均保留 observation 并阻断，不能靠缺 ACK 推回滚或重放 race。

已有 `raceAttempt`、`preparationStarted` 或成功但 proof pending 停点须由 Root 读原件逐项对账后另作精确 metadata 恢复。本工具不清 blocked、不重贴 SHA、不重发已提交命令，不把旧133 HTTP 记为134验收。

## 仍需实际补验

85 个 pure 包含既有81项与本包4项；它们只覆盖双 UUID 保真、真实窄列表 CAS 构造、consumer view 不改旧 producer、两 waiter 间接锁图，不是数据库冻结验证。真实冻结 participant 的归属/identity/weight/零权重 reparent 23514 受控 `BEGIN/UPDATE/ROLLBACK` 反例仍须单独工具和 Root 执行；本包没有将其标为完成。
