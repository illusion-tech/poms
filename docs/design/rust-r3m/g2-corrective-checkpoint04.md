# R3 收口 G2 验收证据纠偏 04

- 范围：#98/#100/#97；产品仍为 `final01` / `f6a9fdeddebcc6c3453c329ba5dbe6ba38f725e9577df006189b91bfff685747`，不重写既有输入或已执行报告。
- 分类：test-evidence-retention-defect / historical-test-oracle-defect；不是新增产品行为裁决。

独审发现 phase19 的四项审批故障用例虽然对九表图实际断言相等，返回对象的 `...result` 又以 Lead 行覆盖了同名 `before/after`；历史撤销故障也漏存局部 `afterFault`。原件保持 completed 的实际执行事实，但缺少的图不得用布尔标记代替。派生 `lead-repair03.mjs` 将 `beforeGraph/afterFaultGraph/afterRetry` 独立保存，同一 artifact 在新 phase 完整执行后才构成补齐证据。

Linux Rust UI 首轮正确创建 female 联系人，再编辑岗位、电话和备注时，现有表单按差异省略未变化的 gender（`sales-intelligence-panel.ts` 的 `buildContactUpdateRequest`）。创建后的 PG 为 female；实际 PATCH 不含 gender、含 `workPhone:null`，200 响应保持 female。该 partial 尚未执行编辑后的 PG 读取，须由新完整 cell 补证。customer02 仍继承 Node 创建 unknown 后编辑 female 的旧请求假设。派生 customer03 只把该请求断言改为未变化字段省略，其余真实点击、响应、列表和 PG 断言保留。Native 仍执行 original01，其已知缺陷参照边界不变。

首轮驱动的 admission 失败与 partial 保留，修订定义使用新路径及全新业务 fixture。独审需核对派生的最小差异与实际结果，不把驱动修订或已知 Native 缺陷计作 Rust 业务通过。WSL 主机实例在本轮恢复时已经重启，旧 PID/bootId journal 原件保留；只恢复本批同标签容器、卷及同 artifact 的新进程，所有后续运行按真实新 PID journal 绑定。
