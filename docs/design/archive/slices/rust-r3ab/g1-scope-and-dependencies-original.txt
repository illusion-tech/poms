# RUST-R3 范围、依赖与本批边界

- 状态：G0 已登记；本批联合 G1 待独立审查，不构成 Rust 业务已交付。
- 父项：[R3 #85](https://github.com/illusion-tech/poms/issues/85)；总体 [#57](https://github.com/illusion-tech/poms/issues/57) 保持 Open。
- 来源：main `a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d`；R2 #67/#80 和路由 #61/#84 已 Closed。
- 当前清单：[58 个操作的当前 controller/spec/canonical 复核](rust-r3-operation-slices.json)。旧 R0 只作历史映射，不照抄其中已切换的 lookup 路径。

## 本批切片

1. RUST-R3A [#86](https://github.com/illusion-tech/poms/issues/86)：客户/别名 8 操作；包括客户工作区原有完整只读返回，不含联系人命令。
2. RUST-R3B [#87](https://github.com/illusion-tech/poms/issues/87)：项目基础 6 操作；列表、直接创建、UUID 详情、基础修改、主责调整、业务号 lookup。

58 项互斥分配：本批 A8+B6；后续线索14、跟进4、情报/联系人13、讨论2、项目综合工作区2、技术成本3、商务竞标3、报价评审3，共44。后续归属是规划候选，没有工程 G1 或本轮实现授权；各片正式拆分时按同一清单追踪，不遗漏/重复计数。

本批当前 Rust R3 交付为 **0/58**。只有 A/B 实际完成独立 G3、提交/主线集成和 G4 后才能计 **14/58**。#84/#61 只完成 Native 路径与参数治理，新增 Rust R3/R4 操作为0；本批 lookup 因而是首次 Rust 交付。

## 依赖与并行

- A 复用已交付的编号、用户/组织、审计及认证/权限基础。工作区消费的 Lead/Project/Contract/FollowUp/Discussion 事实按真实只读投影冻结，不伪造这些域的写入成功。
- A 向 B 提供唯一客户有效性读取：原 `requireActiveCustomer` 的 missing404、非 active400，无锁、不追随 mergedInto、不解析别名、不追加 owner/scope 限制。
- 先冻结共同接口，再由 A/B 独占模块并行编写。B 完整集成验收必须先由 A Rust HTTP 创建真实客户，再用该 ID 调用 B Rust 项目创建/修改，并验证真实持久化与回滚。
- Native 项目创建的 operator→activeCustomer→项目编号事务次序保持；不把客户读取强行挪进项目事务，也不擅自增强隔离或锁。
- Root 独占公共路由、Cargo/lib、schema/类型/日期裁决、生成保护、实际隔离环境/运行、回归与保全。C 不参与实现，独立审查联合 G1/G3、固定提交和实际 G4。

## 后续真实依赖

- 项目基础后，技术成本包与商务竞标可分作者并行；报价评审消费当前有效成本和适用竞标基线后收口。
- 线索转换还包括同事务项目创建、编号、附件复制和评分快照；附件公共 HTTP 已完成不等于该内部复制已迁移。
- 销售跟进是实际 Todo 提醒生产者；评分消费情报/跟进/附件事实，讨论还核对联系人/竞品/跟进关联。
- 完整域审批处理器、非 HTTP 写链和最终阶段验收另片完成。本批不能关闭 #85/#57，不能提前标记 R4–R7 完成。

## 环境与验收边界

独立 Windows worktree 与 Linux checkout；新建 PG15 容器、独立 `poms_r3ab_nest/poms_r3ab_rust`、marker/fixture namespace。PG17 与全部旧环境、private journals、QA volumes、失败和隔离图保留。客户/项目端口、构建输出与运行 ID 独立；Root 执行真实双端 HTTP/PG、受控并发、原 UI 四组合及适用公共回归。精确门槛见[联合基线](rust-r3ab-customer-project-baseline.md)。本批不执行产品 DDL、正式部署/切流、真实云租户接管或性能认证。
