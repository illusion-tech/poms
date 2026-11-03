# R3 收口 G2 验收定义纠偏 02：原 UI 历史缺陷断言

- 状态：SourceReady，待非作者复核本解释、实际四轴执行及最终 G3；不是 UI 已通过报告。
- 归属：#100 / #97，沿用 G1 `546c6c243ea6162077cb065ced54c5a8188afe23`。原 G1、作者输入及旧旅程原件不回写。
- 分类：existing-baseline-drift / historical-test-oracle-defect。G1 盘点了旅程来源和数量，漏检了其中仍镜像 Node 缺陷的断言；本纠偏消除该输入遗漏。

## 已查明的三类旧目标

`tools/rust-r3cdefg/customer-journey01.mjs` 在 UI 选 female 后仍期待 HTTP/list/PG 为 unknown；这是现存 Node #38 性别未透传的见证。`project-journey01.mjs` 则期待第二次合法 bid/pricing 保存 500、current 仍 v1，镜像 Node 旧版本替换 flush 次序缺陷。Rust 已在前批按业务语义纠正这些行为，不能再用旧断言拒绝正确实现。

本批 Rust 使用最小派生 customer02（female 一致）、project02（合法第二版 201、唯一 current v2、v1 superseded），保持原 UI 真实操作、HTTP/PG 观察和其余检查。原文件留作历史原件。projectJourney 实际是签约前工作区协作旅程，不代表项目基础六操作；六操作仍由 Root M0 逐项真实验证。

## 四轴记录方式

保留四旅程 × 四个 browser/API 轴，共 16 次实际旅程执行；不把 16 当作已通过数。两个 Rust 轴必须全部业务断言通过，记录 8/8 的实际结果。两个 Native 轴是参考见证，显式执行原 customer/project 旧断言定义以完整捕获已知缺陷，其他 Lead03/情报讨论按当前定义执行；其完成只代表参考捕获完成，不代表 Node 业务正确。

Native 报告必须明确 `evidenceKind=native-reference-ui`、`NativeBusinessAcceptance=false`，把联系人 actual unknown / desired female，以及第二版 actual 500/current v1 / desired 201/current v2 逐项绑定真实网络、响应、PG、原源码 pin 和已知归属。驱动错误、超时、未知差异不能一概吞成 known failure。不得修改 Node 源码、伪造返回、改 PG 来满足断言、增加 fallback，或将这些错误变成 Rust 目标。

四轴均保留真实登录/网络/截图/PG、失败或 partial 原件、候选与来源。新增 Lead03 要实际填写签约日期并验证 request/response/GET/页面一致；Native 也消费同一已修两文件的前端构建。原 Node 后端受保护的 1371 项继续不变。

审查与汇总分别输出：16 个旅程的实际执行/捕获状态、Rust 业务通过数、Native 参考捕获数、已知 Native 业务缺陷和未知失败。禁止报告为“16 个业务旅程全通过”。只有 Rust 目标与全部其余本批必要条件实际满足、Native 参考范围经独立审查明确，才可 G3/G4；#85/#57 当前仍开放，Node 缺陷修复不在本批授权范围。
