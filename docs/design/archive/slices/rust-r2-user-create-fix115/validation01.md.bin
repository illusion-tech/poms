# #115 用户创建关联修复 G3 Checkpoint

限定用户创建命令已实现并完成实际验收，[独立 G3](../../../../tools/rust-r4ghi/independent/userfix-final/g3-review01.json) 通过，无开放 P0/P1/P2。固定提交、main 集成、归档及线上 G4 继续推进；本记录不提前宣称 G4 完成。

- 类型：`api / command` + 既有 persistence；仅三个 Rust 文件，无新公开操作。
- 生成真实用户 UUID 后写角色及主组织关联；引用在事务内锁定验证，typed UUID 去重，用户、关联、创建审计及 managed 会话刷新整体提交或回滚。
- 格式、严格 clippy、全量 Rust 测试及构建通过：26 组 416 passed / 54 ignored。四轮各 343 条输入记录、342 个唯一文件完全一致；ignored 不作为本批 DB 验收。
- 实际 HTTP/PG：19 个场景含六种成功及真实详情消费；11 个必要写故障均命中并有同请求去故障重试；角色/组织两顺序共四个实际锁等待竞态通过。
- 认证前置 raw touch 可独立提交；用户命令内 managed 会话写失败时与必要业务写整体回滚，不声称整个 HTTP 请求没有任何持久副作用。
- 新旧 runtime OpenAPI 原字节一致，240 operations / 626 schemas；完整共享契约仍 293 operations / 626 schemas。三个创建入口的原 spec 200 与实际 201 属既有声明差异，本片未改变状态或 wire schema。
- UI：`N/A`，不写浏览器通过。本片无前端、TS DTO、路由或生成 client 改动；真实 getUser 已核对 id、主组织、角色名及组织成员，覆盖关联消费风险。Node/Angular 检查对未改工程不重复执行。
- 清理：仅删除 121 个已证明新增 PK，原件改写零；两库各 120 表、532 行及逻辑 catalog/ACL/触发器/函数/序列恢复，提交后两次新连接 noop 通过。API、PG15 已实际停止，container/volume/private/空对象目录保留。
- 初始镜像缺静态 include 资产、baseline `name[]` 工具错误、smoke01 将 201 误写 200 的失败原件均保留；有效运行分别记录，原 201 只作精确归属补证，不伪造重试或创建成功。

[机器验收与终态清单](validation01.json) 绑定实际源和原件。真实丢失 COMMIT ACK、managed 会话零行 CAS 竞态未另证；完整 R4/R5、部署、切流和性能不在本片认证范围。Rust 正式操作仍 240；#57 保持开放。
