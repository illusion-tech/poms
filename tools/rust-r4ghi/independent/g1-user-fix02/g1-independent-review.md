# #115 独立 G1 基线复核

技术基线 **Pass**，仅准入 `POST /api/platform/users` 的限定修复。绑定治理提交 `21e9124160f92dce38a5029786273fdb893759f0`；基线 5721 B，SHA-256 `7b130303f15094a3901b85862fedc87cebe788b8c54bc6419850ed864992625a`。14 项不同来源的工作树原字节与 `aaa4b16ac66092f0cb1dc6646a02cf14e80823ee` Git blob 原字节均 **14/14 匹配**，且修正前后来源不变。

原实现确有生成 UUID 后的主动 Protocol 500，以及业务提交后独立审计事务。基线已冻结真实 UUID 关联、typed UUID 去重、事务内固定次序锁定有效引用、404/409、用户名并发唯一约束，以及用户、角色、主组织、必要审计和待刷新 session 的整体提交或回滚。当前 DTO、canonical route、权限与成功状态保持既有契约；无新增路由、结构或凭证，不计入 R4 的 25 个入口。

首次审查发现的最小必要修正已落实于第 47 条：`create_preserves_generated_id_child_failure_and_session_flush_order` 仅保留历史 W01 / Node 缺陷参考，对 #115 当前行为 superseded。旧 500 不能进入新证书；当前成功、404/409、due/non-due 与必要写故障回滚必须有真实回归。修正前输入保全在 `../g1-user-fix01/`，未回写历史证据。

本次捕获时，GitHub #115 为 OPEN、原生父 #57，尚无 G1 comment，G1 checklist 未勾选。因此线上同源冻结与实际读回仍是 Root 在 G2 前须完成的动作；本审查没有将其冒充已执行。产品实现、HTTP/PG 验收及独立 G3/G4 均未认证。所写文件均位于独审目录，未改产品、Git/GitHub、凭证或运行态。

G/H/I 仍 **Pending**：最小 R5 冻结与受控阶段推进、回款净税依据、成本显式纳入三项业务裁决尚未获得，本报告不予准入。

完整判断、逐项证据和后续验收义务见 `g1-independent-review.json`；原字节复核回执见 `pin-verification.json`。目标模型记录为 `gpt-6.1-sol/max`，本审查未独立验证运行时型号；Fast 未核实。
