# R2A 导航与审计验收及收口

- 切片：`RUST-R2A` / [#68](https://github.com/illusion-tech/poms/issues/68)；父 [R2 #67](https://github.com/illusion-tech/poms/issues/67)，总体 [#57](https://github.com/illusion-tech/poms/issues/57)。
- 类型：`cross-layer-high-risk`；执行方式：独立 managed worktree + Linux checkout，solo worktree checkpoint。
- 起点：`19f837c9e33fe9cdeb7ca94f3c932c9621cb91d3`。Owner 主代理；A/B 分工实现与互审，C 为非产品作者独立审查。
- 正式输入：[冻结基线](rust-r2a-navigation-baseline.md)、[R2 范围与依赖](rust-r2-scope-and-dependencies.md)、[108 操作归属](rust-r2-operation-slices.json)、原 TypeScript 导航/契约及 canonical 三行。差异与失败见[纠偏记录](rust-r2a-corrective-checkpoint.md)。
- 当前 gate：G1/G3 Pass；G4 待实现提交推送、合入后检查与归档。

## 1. 交付边界

Rust 新增 `GET /api/me/navigation`、`GET /api/platform/navigation` 和 `POST /api/platform/navigation:sync`，累计公开操作为10。前两者返回权限过滤树和完整管理树；同步操作返回现行摘要并写一条真实审计，不更改静态导航配置。

树仍由原 Nest `NAVIGATION_TREE` 单向拥有编辑权；机械导出与实际 TypeScript 方法产生固定见证，覆盖13字段、null/空数组、AND权限、隐藏/禁用、稳定排序与原序 checksum。源检查同时约束工作树、暂存区和相关未跟踪文件，只有CRLF到LF规范化。原Angular产品、完整OpenAPI及579个生成客户端文件、Cargo依赖、原92份产品迁移均不变。

写审计复用会话、CSRF与权限守卫。真实Nest SQL先证实前置raw touch独立提交，再接受Rust显式事务：只将audit INSERT与同请求pending session CAS共同提交/回滚。过长requestId的22001和late CAS失败不会伪称回滚前置raw touch。GET权限检查与认证副作用保持原状。

不包含导航在线编辑、其他105个R2操作、角色/组织/用户业务、provider/todo/附件、业务审批处理器、产品DDL、部署、性能基准或迁移接管。R2B–M各自开工前冻结G1；#61的五个R2K参数差异及四个R3/R4路由事项继续打开。

## 2. 实际验证

| 检查            | 实际结果与证据边界                                                                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust            | 固定Rust1.99.1，fmt/clippy all-targets -D warnings、locked/offline测试与release通过；87普通测试通过，24 ignored不算通过。新3项真实PG15测试另行显式通过。旧20项PG目标绑定旧库未重跑；另1个ignored是进程child fixture。 |
| 单向事实源      | 43组原树权限、6组合成边界与1组完整快照共50数据案例；由golden测试消费，不重复计成50个测试函数。R1B原来源检查通过，导航metadata三操作/五schema与累计10操作核验通过。                                                    |
| 原Nest运行见证  | 四场景均通过：非due同步audit+1/version+0；due同步audit+1/version+2；22001失败audit+0/version+1；GET due audit+0/version+1。40条SQL记录含20配对，失败原始轮次保留。                                                    |
| HTTP/数据库     | Nest与Rust各38相同场景通过；38逐项对照与19个完整错误体一致。逐次校验审计12字段、身份/请求头、权限、CSRF、过期、parser、method与session变化。                                                                          |
| 基础认证回归    | Linux/Windows × Nest/Rust四组各13通过，共52；Windows Rust由独立Linux owner管理。                                                                                                                                      |
| 原Nest单测      | 精确五个navigation/platform spec共101通过；首次选择器0测试exit0不算通过，调用错误原件保留。                                                                                                                           |
| 纯工具          | Linux98通过；Windows97通过、1个symlink权限条件跳过，后者已在Linux覆盖。最终清理审计辅助另Linux6通过/Windows5通过1跳过，不与产品HTTP混算。                                                                             |
| 构建与静态      | Nest lint零warning、Nest build、原Angular production及依赖build通过；正式browser-tsconfig通过，33个受影响工具/E2E文件lint零warning、38文件格式检查通过。后两次仅定位变更的TS/lint/格式检查分别通过。                  |
| 完整契约        | 原237 paths / 291 operations / 585 schemas不变；完整spec加579个client共580文件生成前后与当前指纹一致。                                                                                                                |
| 数据结构        | 两个新PG15副本各执行原92迁移；审计12列/相关session与完整catalog核验。原migration:check两库均失败且已分类，绝不记成schema clean；仅dump，没有执行建议DDL。                                                             |
| 原Angular浏览器 | Linux/Windows × Nest/Rust四组合各3项、共12项通过，零skip/flaky/retry；无bridge、无route mock，真实表单、菜单、搜索、刷新、同步和权限重载。首两轮失败保留各自来源副本与计数。                                          |
| 治理与独立复核  | 98当前源码/82权威源指纹吻合；26个成功/失败run逐项重查均0/0，journal与source不变；最终C审查与提交归档仍单独判断。                                                                                                      |

两个新副本的schema差异分类为低权MikroORM对已有CHECK的introspection可见性限制，以及一处既有注释差异；168个同名约束实际存在，不声称逐项表达式已等价。完整catalog前后不变。本片不创建重复约束或提升运行角色权限。

## 3. 失败、继承证据与环境边界

所有首次失败保留：两个登录前失败的Nest witness、错误测试调用/0测试、手工tower请求长度遗漏导致的Rust单测失败，以及两次各1通过/2失败的完整Linux Nest浏览器轮次。修正限测试工具，最终完整运行另存。G0补录ConfirmationService的规划遗漏已独立复核，不改变首片范围。

原R1的72 API、36 legacy UI、64 stage与20个旧PG目标仅引用历史记录，不冒充本轮重跑。未迁移页面目标与provider/todo的响应只作为观察，不能从导航成功推导业务已迁移。桌面1280×900和窄屏390×844截图保留原PrimeUI许可提示和页面旧说明；不宣称全站视觉修复。

本机PG17仅观测服务元数据，前后均Running / Auto / PID6996；没有连接其SQL或修改实例/数据。只使用专用PG15.12容器中的新`poms_r2a_nest`、`poms_r2a_rust`及无高权/无成员/无CREATE的运行角色。旧R0/R1环境保留。fixture逐run记录并按精确身份清理，禁止全库清空或按共享targetId扩大删除。

Windows external Rust在基础13项及导航3项退出后，由独立owner再次确认同一PID存活，然后由owner停止。其余managed服务各自退出回收；最终全run审计已在所有服务结束、三个owned ports在Windows/Linux均无listener后执行；26/26通过，matched/changed全0。没有TEST/PROD操作。

## 4. Gate 决策

G3 Pass。C于2026-10-26T09:51:34.268Z完成非作者最终审查，无剩余P1/P2；受审候选SHA-256为`31cf8814103dc5c20cf46d0da2d5b6a16a99f4c987322b2af66bf3423a6fc6f5`，审查记录SHA-256为`915bab8c6ba41d208484554b989bffc23a9295e57132726cd9291125434fe9f3`。审查实际核12附件/8图/26清理、98当前/82权威来源、原始失败和schema分类，证据聚合的唯一P2已关闭。可以提交并按solo worktree方式集成，仍不得提前标记G4完成；G4另需实现提交推送、合入后检查、在线状态回写及本片生命周期归档。

完整数据与审查指纹见[机器验收记录](rust-r2a-validation.json)。
