# RUST-R3 范围、依赖与本批边界

- 状态（2026-11-03）：A–K共58/58 HTTP已完成各自G4，#86–96 Closed；收口批#97及#98–100联合G1准备中；完整阶段尚未验收，父#85/#57保持Open。
- 父项：[R3 #85](https://github.com/illusion-tech/poms/issues/85)；总体 [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。
- 当前来源：main `5041275d7ad82af4becbb4462e7213ffe465bc7a`；R2 #67/#80 和路由 #61/#84 已 Closed。早期范围拆分起点为 `a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d`。
- 当前清单：[58 个操作的当前 controller/spec/canonical 复核](rust-r3-operation-slices.json)。旧 R0 只作历史映射，不照抄其中已切换的 lookup 路径。

## 首批 A/B 切片及后续互斥归属

1. RUST-R3A [#86](https://github.com/illusion-tech/poms/issues/86)：客户/别名 8 操作；包括客户工作区原有完整只读返回，不含联系人命令。
2. RUST-R3B [#87](https://github.com/illusion-tech/poms/issues/87)：项目基础 6 操作；列表、直接创建、UUID 详情、基础修改、主责调整、业务号 lookup。

58项互斥分配：A8+B6交付14；C成本3+D竞标3+E联系人3+F跟进4+G报价3交付16；H线索14、I情报10、J讨论2、K项目综合工作区2交付28。全部完成各自独立G3/G4、main集成和原生子Issue关闭，不遗漏或重复计数。联系人3从原情报13拆分。

当前Rust R3累计 **58/58 HTTP**；旧30/58、剩余28是前批时点。完整阶段验收仍未完成。#84/#61只完成Native路径与参数治理，不重复计Rust交付。当前[联合收口G1候选](rust-r3-closeout-baseline.md)与[机器状态](rust-r3-closeout-status.json)承接内部机制、审批归属、E1退出及阶段验收。

## 依赖与并行

- A 复用已交付的编号、用户/组织、审计及认证/权限基础。工作区消费的 Lead/Project/Contract/FollowUp/Discussion 事实按真实只读投影冻结，不伪造这些域的写入成功。
- A 向 B 提供唯一客户有效性读取：原 `requireActiveCustomer` 的 missing404、非 active400，无锁、不追随 mergedInto、不解析别名、不追加 owner/scope 限制。
- 先冻结共同接口，再由 A/B 独占模块并行编写。B 完整集成验收必须先由 A Rust HTTP 创建真实客户，再用该 ID 调用 B Rust 项目创建/修改，并验证真实持久化与回滚。
- Native 项目创建的 operator→activeCustomer→项目编号事务次序保持；不把客户读取强行挪进项目事务，也不擅自增强隔离或锁。
- Root 独占公共路由、Cargo/lib、schema/类型/日期裁决、生成保护、实际隔离环境/运行、回归与保全。C 不参与实现，独立审查联合 G1/G3、固定提交和实际 G4。

## 后续真实依赖

- 项目基础后，技术成本包与商务竞标可分作者并行；报价评审消费当前有效成本和适用竞标基线后收口。
- 线索转换的同事务项目创建、附件复制、评分快照及必要审计已由#93交付；本批核验完整性与统一候选集成。独立编号预留按既有明确决定允许失败空洞。
- 销售跟进是实际 Todo 提醒生产者；评分消费情报/跟进/附件事实，讨论还核对联系人/竞品/跟进关联。
- R3审批归属是Lead人工评分覆盖；通用合同handler属R4，佣金payout/adjustment属R5，不虚构R3通用生产者。收口批#97完成全部内部链、阶段验收和独立G3/G4才可关闭#85；#57保持Open，R4–R7各自仍待交付。

## 环境与验收边界

独立 Windows worktree 与 Linux checkout；新建 PG15 容器、独立 `poms_r3ab_nest/poms_r3ab_rust`、marker/fixture namespace。PG17 与全部旧环境、private journals、QA volumes、失败和隔离图保留。客户/项目端口、构建输出与运行 ID 独立；Root 执行真实双端 HTTP/PG、受控并发、原 UI 四组合及适用公共回归。精确门槛见[联合基线](archive/slices/rust-r3ab-customer-project-baseline.md)。本批不执行产品 DDL、正式部署/切流、真实云租户接管或性能认证。

首批A/B的非作者实际G4已[独立终审Pass](archive/slices/rust-r3ab/evidence/C/g4-independent-actual-review01.json)，仅本批14条；全R3和父项仍未完成。


当前新增16的[收口索引](archive/slices/rust-r3cdefg-closeout.md)、[原件映射](archive/slices/rust-r3cdefg/archive-origin-map.json)与[独立当前状态](rust-r3cdefg-delivery-status.json)已完成本批G4；首批历史环境与G4事实保留，不认领完整R3阶段。


最新H–K的28项已按独立许可实际G4关闭，当前HTTP58/58，详见[H–K收口](archive/slices/rust-r3hijk-closeout.md)。上方首批环境及C–G证据保持历史范围，不能冒称当前阶段新运行。当前#97使用全新环境；旧private/PG17/failed/partial/uncertified与ignored标签保留。E1须本次G1重审并按原2026-11-09期限退出。无部署、切流、迁移接管或性能结论。
