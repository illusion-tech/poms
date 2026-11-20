# Project metadata 真 no-op 修复61

只改当前 Root 两个 Rust 文件，既有 OwnerWrite、canonical operation、原 HTTP200、CAS、必要 audit 和 Common managed auth 事务流程保持。

`store::ProjectUpdate::is_dirty` 只看实际业务字段，不把 `updated_by` 自身当业务变更。service 先按业务字段判 dirty，再仅在真实 dirty 分支设置新的 `updated_by`。所以新 owner 与 last updater 不同且 PATCH 空/同值字段时，不调用 store UPDATE、不追加业务 audit，返回值也保留持久 `updatedBy`；外层 Common flush 仍负责真实必要认证写入。

两个 Rust 回归直接使用改后实际 `ProjectUpdate` 定义和 `is_dirty`，覆盖 attribution-only（包括 nullable attribution）不 dirty，以及七个真实业务字段和 owner 改派字段仍 dirty。作者提取的实际代码未替换字段或实现，使用 Root 已编译的真实 chrono/uuid rlib、Rust1.99.1 独立编译运行，两项通过；这只验证真实 dirty classifier，不冒称整 crate/service/SQL/HTTP 已通过。两份完整候选 rustfmt通过，提取源码与编译/运行日志随包保留。

Root 晋升后仍需整 crate 回归，以及 Source12 上的真实 HTTP：选实际公开改派后 active 项目，真实新 owner 有当前 OwnerWrite 且 persisted updated_by 为旧 operator；新 owner 依次发 canonical `ProjectController_updateBasicInfo` 的 `{}` 和相同 `projectName`，核完整项目 raw SHA/xmin/version/time/updatedBy及业务 audit无变化，只容必要 managed auth 的独立核验。再发一项真实名称变化，核一次版本和 canonical audit、同TX auth；不得 SQL 制造 owner/updated_by 来源。

当前 Root frozen Source11/API134 未被作者修改；完整编译、数据库、HTTP、135/source12 升级均由 Root 执行。此为已接受 IR-I60-01/P2 的修复候选，不自行签 G3/G4。
