# Scope v2：legacy owner 只读锚点修复

2026-11-07，作者追加 corrective 提案，供 Root 复核及单写应用；未签 G3/G4。

原件 `project-action-authorization.rs.txt` 保持原字节，SHA256 为 `673a1d159f4a021061f353325b5977523c827f2cee91601fb962cdaede1584b5`。追加实现为 `project-action-authorization02.rs.txt`，SHA256 为 `70e89ed7886caef33a835b21aaa17357a38cbf2a2624ee09279fe8f7870f2139`。本次没有修改 G1 原件、共享契约、产品模块或 v1 提案。

独审 P1 已确认：v1 对 `project.owner_user_id == actor.id` 直接设 `owner_read=true`，继而得到 `FullProject`。当真实 `owner_org_id=NULL` 且没有 D 责任时，经营读取、角色读取及 `verify_access_set(write=false)` 仍可取得完整项目范围，违反冻结的 bounded anchor 规则。

v2 显式拆开两种 owner 关系：有真实非空 ownerOrg 的个人 owner 才构成原有完整 owner read；个人 owner 相等但 ownerOrg 缺失只形成 `legacy_owner_anchor`。新增私有 proof 类 `LegacyOwnerAnchorOnly`，wire discriminator 是 `legacy-owner-anchor-only`。该 proof 仅在 `ReadProjectAnchor`、实际 `Project` target 及精确 `project:read` 下产生。它的 `is_full_project()` 和 `can_operating_write()` 均为 false，也不会进入 creator bootstrap 分支。

旧 owner 锚点关系本身不能授予 `OperatingRead`、`ReadCommissionAssignment`、验收/完成/归档列表或任何写操作。已有该锚点但请求其他业务范围时返回403；不存在任何实际关系仍返回404。经营 access set 的 factory 继续只接受 `FullProject`，其 `assert_project` 也显式区分已知窄 proof 的403与不存在项目 proof 的404。因此 finance 权限、敏感字段 projection 或已有 active membership 都不能把这个旧 owner 布尔恢复为完整范围。

多关系处理没有扩大 legacy proof：若 D bridge 独立验证了真实当前 Part，完整范围的依据是该 Part，而不是 legacy owner。原有 Part 矩阵继续适用；没有真实 D 关系的本次 P1 输入永远不能变成 FullProject。缺少项目 ownerOrg 时，OwnerWrite 与 DelegatedWrite 仍均为 false。真实 OwnerWrite 足够授权的 prepare/reassign 分支继续短路旧 D，不把 stale D 变成其新前置条件。legacy 锚点读取本身也不会因可选 D 的来源冲突而失去独立只读关系；SQL/Common 错误继续传播。

Root 的 corrective shared union 必须新增精确 `LegacyOwnerAnchorView`：`scopeKind='legacy-owner-anchor-only'`；projectId/projectNo/projectName/currentStage/rowVersion/ownerUserId 都取真实当前行；ownerOrgId 为 literal null；sourceQualification 为 legacy-unverified；allowedActions 为恒定空数组；解释为冻结的固定文本。不得用 full view required 字段填空，不得把它标成 CreatorFirstAssignmentOnly，也不得调用 finance/commission/I panels 后依靠 projection 遮盖。现有 `detail-minimum-with-session.rs.txt` 只有 full/creator 两分支，Root 应以新的精确 union 分支替换其泛化 `!full => creator` 判断。

本次只执行 v2 的 rustfmt 解析与格式检查，结果通过，并重新核验了 v1 SHA 未变。v2 内追加了两个纯回归测试：缺 ownerOrg 的关系分类及唯一允许动作；窄 legacy proof 不能作为 operating access proof。它们尚未编译/运行，不能作为实际 SQL/HTTP 验收。

Root 必须在统一候选真实验证：legacy owner 同时持有 R/W/C/finance 权限且无 D 时，只有项目锚点 GET 返回上述最小 DTO；所有经营/提成/I 列表及写入口拒绝，read access set 不产生；无关同组织人员404；真实 OwnerWrite 的 prepare/reassign 不被 stale D 阻塞；独立真实 Part 的授权继续按冻结矩阵验证。发布前同时检查真实 JSON/DOM 无 full detail、父证据或经营载荷泄漏。原失败与 v1 提案保留原标签。
