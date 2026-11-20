# 纠正 362：受限视图固定角色数据追加

本追加承接[联合代码输入](runtime121-corrective362-code-input.md)，分类为 `existing-baseline-drift`。独立完整 FI 安装模型确认：真实 Root 通过 `context.mjs` 的 `FIXED.apps` 提供两个固定 app 角色，但 `restrictContext118` 的 dataKeys 漏了 apps；既有 `createControl` 读取 `ctx.apps[1]` 时因此失败并回滚，无法达到 COMMIT。这是原 baseline 已有的问题，不能把缺字段补进测试夹具后冒称全路径通过。

Root 在同一个已冻结的 `invocation-proof.mjs` 内授予最小修正：将真实 Root 的既有两个固定 app 角色投影为冻结的只读数据，缺失、形状错误或外来角色均拒绝。角色仍为 `poms_r4ghi_native_app` 和 `poms_r4ghi_rust_app`，不增加角色、actor 权限、GRANT 目标、控制范围或 SQL 行为，不增加请求参数或通用覆写。公开 input34/runtime17/frame17/Root9/reference11 与源成员数量均保持。

完整输入为 `tools/rust-r4ghi/runtime-recovery121/corrective362-apps-ABI-addendum01/Root-apps-ABI-addendum362.json`。hot01 封件、独立 NOTREADY、显式真实 root 有 apps 的反例全部保留；hot02 只改 proof 叶的固定数据投影及必要拒绝断言，wire/effects 与 hot01 字节相同。必须重新独审真实受限视图、完整 install/remove/六种模式和全部原热路径案例，不能由作者模型或本追加直接授予实际效果。

本追加只授隔离代码实施。源码提升、状态 handoff、具体 G2、FI/Tax/Main 提交仍后置；Rust240、R4 67/95、候选32、认证0、业务G3/G4 false，#57/#116 OPEN、#119历史 CLOSED 保留。
