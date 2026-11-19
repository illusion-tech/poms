# Runtime121 实际 prepare 纠正检查点 360

本检查点记录首次真实 prepare-only 的失败事实。实现修正及 successor handoff 的具体边界待独立设计复核，本文件不授源修改、重试或状态重置权限。业务 G3/G4 未通过；Rust 240、R4 67/95、本批 32 candidate、新增认证 0。#57、完整 R5 #116 保持开放，#119 历史技术 G4/CLOSED 保留。

## 实际结果与保全

nonce `82321806-8586-4210-b5cd-ef16311f63ce` 的唯一 prepare-only 执行返回 1。Native constructor 已返回，Tax capability 未返回，entry/exit 与 fresh67 均未验收。原始 partial 为 1493 B，SHA256 `bc442c68bdf87b5bdc6a2328a0cadd6476f3c996392aaaff5e971a76a69e1045`。

失败后 canonical state 为 14645579 B，SHA256 `32bd6587911328886fc32e0ea40848107275fcaab889e2780098c2729097987b`；与私有 entry `952f661e…` 相比，仅 `consumerChecks`、`taxContinuation121` 两个顶层字段变化。13/14 账本、ownership、旧 4c35 保留件、原 Main13 201 和失败原件保持。进程已退出，driver lock 已无。完整 after-state 仅保存在私有目录，公开保全元数据见 `tools/rust-r4ghi/runtime-recovery121/prepare121-failed01/`。

## 已证实的技术偏移

1. `invocation-proof.mjs` 的 `apiIdentity` 将 Native 返回的 Pin3 交给 `binary(p, all)`；该函数从 Pin3 读取 `dev/ino/nlink`，实际这些字段位于独立 `binaryFiles` Facts6。实际设备号为 `2096`，预期值却为 undefined。Native 的 Pin3/Facts6 分离是冻结合同；34 输入与纯数据准备器不能修复此私有返回值。
2. 失败退出尝试写 `000026-tax118-failed-bookend.json`，被旧原件的严格 wx 拒绝。旧成功 prepare 的 24/25 与旧失败 FI 的 26 均为原证据；保留状态 sequence 为 25。不得删除原 26、放宽 wx、伪称旧 closed-journal 为本次成功，或未经受控 CAS 重写计数器。

上述行号与因果来自冻结源和实际类型的独立静态核对；实际日志未携带 stack，不将静态行号冒称实际首 frame。

## 后续修正条件

待复核的最小方向是 Tax 守卫按 file/SHA 选择匹配 Facts6 并保留全部物理与字节检查，以及使用 nonce 自有目录保存失败 bookend。任何代码变更须重新绑定当前叶、八源载体与 external/execution 闭包。

现有 Native publisher 明确拒绝已有 runtime lease，失败状态中也已有新 journal，不能直接换 nonce 重跑或手改 registry 指针。须先冻结受控 successor binding/state handoff，保留旧 M06、lease、publication 和失败记录的 as-of 标签。实际 Rust ELF、Root8 和服务进程未变；是否复用活 API 必须按源合同证明，不能改写旧启动证据。

Root 将在最小纠正输入明确、实现与独立复核完成、状态 handoff 实证通过后，另行冻结新 nonce 的 exact G2。FI、Tax normal201、Main13 重放及 snapshot reset 当前均未获授权。
