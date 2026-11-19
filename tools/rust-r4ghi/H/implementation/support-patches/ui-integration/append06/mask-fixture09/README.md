MASK08 的两个错误 DTO 假设修正，另封原件不变。Root 第一次 000518 phase 只做了三个 GET，000524 的实际用户资料与正式 API 均为 **PlatformUserDetail**：顶层 `roleNames`/`orgUnits`，没有 `roles`/`roleIds`/`permissions`，不是 nested detail。旧工具误用了 SanitizedUserWithOrgUnits 的字段，并把角色 key 当成角色名；由此产生错误“多角色”断言，未建 maskProject。

Root 直接运行新版本（需同目录 user-proof09.mjs 和既有 ../max-fixture06.mjs）：

```sh
node /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/append06/mask-fixture09/mask-fixture09.mjs --business-date 2026-11-07 --execute
```

日期仍由 Root 核定。mask09.patch 仅作审阅差异；直接运行新目录可保留 MASK08 原文件，勿只把 patch 中的 import 应到旧目录而漏掉 helper。

改为正式 `roleNames == [role.name]`，仍要求 Role detail 的 active/non-system/assignedUserCount=1。为不以名字代替 role UUID 身份证明，两个真实 getUser 调用保留原 attempt，读取该 HTTP 本来已经 capture 的 immutable after snapshot：验证 manifest/table/每条 raw SHA、namespace marker/epoch/run，并严格核 actual user_role_assignment 当前仅一条 active、revoked_at=null 的 person→目标 role FK，同时 role 也只有这一 active link；该 row 必须是本 run 已 owned，latest SHA/xmin 与当前原件一致。没有新 SQL/HTTP 查询公式，没有新权限表 mutation 白名单，没有接受客户端 JSON 为角色权威。

新增 private fixtures.maskUserRoleProofBefore/After，保存实际 HTTP receipt/bodySHA、既有 snapshot pin 与精确 FK row proof。真实 M 仍用正式 user detail 的 orgUnits、公开 active owner-reference，以及最终真实 reassignOwner 的 fresh responsibility proof。getUser 不提供 permissions，精确三权限继续由 Role detail +真正 api.login('person') 后 CurrentAuthSession 验证；没有将缺失权限当空或跳过。

其余 MASK08 流程/guard 不变：独立真实 MAX expense/E/Gprep、mask前实际真值来源、精确改派CAS和新record、只新增一个 owned permission child且不允许旧权限行 update/revoke、person真实三权限且无 sensitive、same cost版本/hash masked、manager仍all但失去项目/prepare404、原MAX/main/source/helper不变。

作者实际验证仅 Node 语法、15 个纯 FK 负例/实际已记录 DTO 的 canonical parser；实际 DTO body 未复制或公开。未执行 HTTP、DB、角色变更、改派或浏览器；Root 运行原件才是后续结果。
