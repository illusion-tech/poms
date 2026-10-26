# RUST-R1E 验收纠偏记录

**日期**: 2026-10-26
**Issue / Baseline**: [R1E #66](https://github.com/illusion-tech/poms/issues/66) / [冻结基线](rust-r1e-stage-acceptance-baseline.md)
**状态**: G3 Pass；CP01–07修复、复验及非作者审查完成，原始失败保留；G4 / Done 随本归档提交及 Issue 同步生效

## CP01：既有 Nest UI 回归断言与起点页面漂移

分类：`existing-baseline-drift`。首轮 `legacy-windows-nest-first` 保留原 8 spec / 36 tests、原产品页面和真实 Nest，新专用 R1E 库已显式 seed，最终 24 通过、12 失败。失败分布为合同 1、线索 3、平台 4、项目工作区 journey 2、项目工作区 smoke 2。主代理与非作者 A 对照 `70482a77` 源码及真实 Playwright error-context，确认相关产品源在本轮没有变化。

| 失败                          | 起点与真实页面证据                                        | 授权的窄纠偏与不变条件                                                                      |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 合同筛选等待“重置”按钮        | 起点 contract-list toolbar 已只有搜索输入，没有该按钮     | 旧 spec 改为真实输入清空操作；保留匹配/清除恢复断言，并增加无匹配状态验证；不添加旧产品按钮 |
| 线索旅程等待“线索管理”heading | 起点页面无此 heading，实际 heading 为“线索分布”           | 对齐真实页面语义入口，保留创建/转项目/owner/讨论及返回地址的业务断言，不删除场景            |
| 新增组织名称 strict locator   | treegrid 与隐藏父级 select option 同时包含相同名称        | 约束到实际 treegrid 可见行，保留新增成功和真实数据检查                                      |
| 移动组织后父级断言            | 当前 treegrid 没有旧 spec 假设的父级列                    | 验证实际父子层级/父 ID 与可见组织行，不能只删原断言                                         |
| 平台菜单组 role 漂移          | 无 href 的分组当前是 generic，旧 spec 使用 link           | 使用现有分组的真实可操作定位，保留每个受控页面导航及内容断言                                |
| 用户/项目列表旧 heading       | 起点页面已移除“用户管理”“项目管理”标题                    | 用现有页面独有控件和数据区验证到达，保留匿名跳转、返回地址与业务断言                        |
| 项目工作区文本 locator 歧义   | 售前文本同时命中 heading 与说明，报价号出现在两个实际区块 | 限定到对应 heading/数据区，保留状态与报价详情断言，不用任意 first() 隐藏歧义                |

A 独占 `contract-management.journey.spec.ts`、`lead-bootstrap.journey.spec.ts`、`platform-governance.smoke.spec.ts`、`project-workspace.journey.spec.ts`、`project-workspace.smoke.spec.ts` 修复上述已核漂移；root 实跑，C 非作者审查。原 36 个场景全部保留；其 11 个 route-mock 场景仍只算 Nest UI 回归，不扩展 Rust 业务验收。新的失败先补证据/分类再改，不放宽断言或跳过。

## CP02：fixture 提交与 journal 更新之间的并发窗口

分类：`new-real-drift`（本轮测试基础设施），C 非作者审查发现，B 确认。候选使用事务 advisory lock，在数据库 COMMIT 后、journal 最终写入前已释放；同 run 第二调用可能在窗口读到旧状态，产生数据库与 journal 的相反终态。发现时尚未执行任何真实 fixture 操作；新库初始化不使用该 fixture。

窄修为同连接 session advisory lock，覆盖 DML 事务、COMMIT 和 journal 最终写入，连接关闭时释放；保留事务回滚与固定 45 秒 deadline。必须补精确提交后窗口的并发负例，并由 C 复核后才允许实际 fixture/浏览器 stage。此前 Linux 95 项工具测试通过不涵盖该窗口，不据此宣称修复完成。

## CP03：fixture 清理的外部引用副作用

分类：`new-real-drift`（本轮测试基础设施），C 非作者审查发现，B 确认；发现时尚未执行真实 fixture。原 cleanup 仅检查外部 role/org membership，而原迁移中的 `ON DELETE SET NULL` 可能在删除本 run 用户或组织时改变非本 run 行。涉及 `org_unit.parent_id`、`platform_user.primary_org_unit_id`、`customer.owner_org_id/owner_user_id`、`sales_follow_up_record.owner_org_id/owner_user_id`、`external_department_mapping.org_unit_id`、`org_sync_run.requested_by`、`org_sync_diff_item.org_unit_id`。

窄修为删除前只读检查全部上述外部引用，非零即以 `foreign_fixture_reference` 拒绝；先对本 run user/role/org 加 `FOR UPDATE`，阻止检查至删除之间的外键竞态。不新增 R2 DML，不清理外部引用。补模拟存在外部引用的负例，必须确认零 DELETE 及 owned select 锁；C 复核后才允许真实 fixture。

## CP04：初始化 401 丢失返回地址及 G1 HTTP 事实更正

分类：`existing-baseline-drift`（起点认证 UI 的真实问题，以及本轮 G1 对既有 HTTP 行为的错误描述）。Windows Nest 首轮 `stage-windows-nest-first` 已自然结束：7 通过、9 失败、0 skip/0 flaky；16 份脱敏附件全部 `cleanupPassed=true`，41 次 fixture 动作有记录，原始 JSON/日志保留。第 7/8/9 场景已经通过 fixture 失效、真实 401、清状态/提示/安全 returnUrl，重新加载登录页后再次登录却停在 `/dashboard`，精确 query 断言失败。原始 error-context 明确指向 `expiredFlow` 的精确 URL 断言；第 8/9 还触及总时限，不能据总耗时把 URL 差异归为单纯超时。

主代理与 A 对照起点 `AuthController.getCurrentAuthSession` 和 Rust `current_session`：无 Cookie 才返回 200 未认证视图；携带过期/撤销/无效 Cookie 时返回 401 并清 Cookie。`@Public()` 不代表始终 200。G1 中“过期 reload 是 200 anonymous”的文字和第 16 场景必须更正为真实合同；不改后端、OpenAPI 或七操作语义。

旧 interceptor 在应用 initializer 请求返回 401 时读取尚未导航的 `router.url='/'`，把当前登录页或深链的返回地址覆盖为 `/`。授权 A 窄修首次导航前的内部 URL 来源，使用 Angular Location 的当前 path/query/hash，导航完成后维持 Router URL；保留 safe URL 处理及 `/auth/` 防循环，未知 401/403 不清状态规则不变。补首次深链及已在登录页的回归测试，包括真实 Router/Location 与 pending initializer 的并发顺序。失效后重新认证在当前真实登录页填写提交，不人工跳转到目标；仍保留精确 query 断言。第 16 场景验真实 GET session 401、`session_expired`、登录提示及原返回地址；匿名场景明确验无 Cookie 的 200 未认证视图。16 个场景保留、无 mock/skip。

第 10 场景还暴露了测试管线假设错误：受保护 logout 的 guard 失败没有清 Cookie，停用会话已标为 revoked；当前登录表单首先请求 CSRF，旧 Cookie 导致 GET csrf 401 并清 Cookie，此次并不会发出 password POST。测试必须明确核这次真实 CSRF 401/清 Cookie 和提示，再由第二次实际表单提交核密码 POST 的停用拒绝；恢复账户后实际提交成功。过期/撤销也按对应已知 reason 验证原表单的清 Cookie 后重试。此为既有交互的准确记录，不新增 AuthStore 自动重试、不把 CSRF 失败说成密码 POST 失败，也不通过强制 reload/goto 掩盖当前登录页的行为。

本轮串行 fixture 的独立只读诊断测得一次 Windows→WSL `environment.sh status` 为 17009ms；单样本不作性能结论，但四次相同前置已接近 68 秒，原每场景 90 秒不足以稳定容纳完整受控操作。允许 stage 总时限改为有界 180 秒，单次 CLI 45 秒/SQL timeout 均不变，产品响应和 URL 断言不放宽。该调整与返回地址修复分别验收，不把增加时限记为功能修复。

C 前置复核后实施；重新跑受影响认证/入口单测、lint/build/生产 bridge 排除、strict typecheck，最终四组合须使用同一修复版本完成全 16 场景。原首轮完整报告保留，不当作最终通过证据。

## CP05：stage 菜单定位未包含图标的可访问名称

分类：`new-real-drift`（本轮新测试的定位与断言）。首轮第 11–13、15 场景截图/ARIA 中实际链接名称包含图标 glyph，例如“ 项目管理”；中文 `getByRole('link', { exact: true })` 因此错误地查不到存在的入口，隐藏断言还可能产生虚假的零计数。

授权 A 将 stage 菜单定位统一限定在真实 `.layout-menu` 内、按已知内部 href 选择，再核对应标签文本。无权入口必须按同一 href 查询零个；admin 折叠组通过真实 UI 点击展开后验证入口可见，不能仅依据匹配失败宣称隐藏或省略权限/路由断言。不改产品菜单标签、图标或路由，不新增 mock，不减场景。独立复核及四组合实际运行必须使用修正后断言。

桌面与窄屏成功截图已实际查看：认证壳和退出入口可达，窄屏无页面级横向溢出；已有 `Invalid PrimeUI License` 提示在两种视口均可见，窄屏遮住部分底部业务表格。记录为原依赖许可提示及 R2 业务区域的可见限制，不移除提示或声称截图无异常；本轮未改许可证或依赖。

## CP06：legacy 复验剩余入口、状态码及菜单断言漂移

分类：线索入口为 `existing-baseline-drift`；CP01 新增的创建状态码和未完全修正的菜单定位为 `new-real-drift`（测试）。第二轮 `legacy-windows-nest-accepted` 实际为 33 通过、3 失败、0 skip，文件名不代表验收结论；原始 JSON、日志及截图保持原样并列为失败记录。

起点项目入口已经导航至 `/leads?conversion=ready`，该模式仅显示已有效线索。授权 A 在同一原场景中先通过菜单登记并确认有效，再从项目入口进入转换模式，精确验证 pathname 与 `conversion=ready` 后转换刚创建的线索，保留创建、转项目、owner、讨论和返回地址断言。不得仅忽略 query，也不更改产品筛选逻辑。

组织场景实际失败在第一次 create 响应检查，尚未执行 move。起点 Nest create 没有覆盖 POST 的 201，move 明确返回 200；只把两处 create 断言对齐真实 201，保持 move 200、父 ID 和可见父子层级检查。现有 OpenAPI create 声明 200 与实际 201 的差异列为 R2 元数据限制，本切片不修改接口、规范或生成客户端。平台菜单叶子按已知 href 与精确子标签定位，保持分组真实点击及全部页面内容断言。

仅授权 `lead-bootstrap.journey.spec.ts` 与 `platform-governance.smoke.spec.ts`，原 36 个场景名称、顺序和 mock 范围不变；修后 strict typecheck、相关 lint/format、launcher 选择器检查及完整 legacy 36 场景复验。C 先核边界，再独立审查最终 diff。

三个已通过 stage 的原始报告继续绑定 CP06 前的真实 35 文件 freeze，另保留这两份旧 spec 原文。stage 配置只选择 stage spec，生产代码、stage spec/helper、launcher/config/fixture 的依赖输入均须证明未变；逐文件记录允许的两份 legacy 旧/新 SHA。修后另建最终 freeze，不能把旧运行重标为新全局源码执行。后续 Windows/Rust stage 和最终 legacy 绑定新 freeze；若任何共享输入变化，重新评估并执行受影响验收。

## CP07：legacy 更深表单控件与分离表头定位

第三轮 `legacy-windows-nest-final` 实际 34 通过、2 失败、0 skip/flaky，原始报告完整保留，名称中的 final 不构成通过证据。组织创建、移动、父 ID、排序和可见层级已通过。仍失败的线索转换在填写新建表单来源时等待旧 placeholder `选择来源` 超时，当前控件已有默认选中值；平台导航已到达组织页面，但 CP01 新断言把独立表头错误限定在正文 treegrid 中，ARIA 显示二者是分离表格。前者为 `existing-baseline-drift`，后者为 `new-real-drift`（测试定位）。

仅继续修正 CP06 的同两份 spec：线索表单按现有稳定控件 ID/真实标签选择，再明确选择所需来源；同旅程后续控件必须对照现行组件检查，保留预算、客户、主责、确认有效、转换、讨论及 owner 的全部业务断言。组织页面在对应组件内精确验证表头，并分别验证正文 treegrid，不把不存在的祖先关系作为页面合同。不改产品页面、后端、配置、stage、mock 或场景名，不增加超时掩盖定位失败。

CP06 执行前的 35 文件快照与两份当时 spec 原文另存并绑定第三轮失败；最终运行须在再冻结后另存执行前快照。前三组 stage 的运行输入及33份非 legacy 文件仍须逐项不变。相关静态检查、非作者 diff 审查和完整36场景复验通过后才可关闭本项。

## G3 解除条件

G3 冻结的解除条件为：原始失败报告保留；纠偏后的全部所需场景、fixture 负例和实际清理检查通过；非作者审查确认无剩余 P1/P2；源码/日志指纹和准确测试分层写入最终机器报告。以下解除结论及 G4 收口保留这些条件的实际完成边界。

解除结论（2026-10-26）：CP01/06/07的原36项Nest UI完整通过，CP04/05的四组合各16项通过；CP02/03的工具负例与80次真实run清理审计通过。C最终审查Pass、剩余P1/P2为0，[机器验收记录](../../rust-r1e-validation.json)保留所有失败和各自源码快照。最后汇总脚本的多行JSON解析窄修仅改变证据读取，真实日志、35项运行源码和执行前快照不变；原builder/capture保留，C独立正负核验通过。

## G4 收口

实现 `afbf4ee51baa8543981e66472d04a4d7389a9adb` 已集成推送 main，远端 HEAD 经主代理核对一致；主仓 35 项最终与 73 项继承源码指纹一致，集成后 19 项适配器检查通过。CP01–07 均已解除，不以定向两项预验替代完整 36 项，不把 11 项 route-mock 纳入 Rust 业务通过。三轮 legacy 失败 24/12、33/3、34/2 及首轮 stage 7/9 保留原始标签与来源。

本记录与实施基线、R1 总体基线一并归档。R1E #66 与父 R1 #60 的 G4 / Done 随本归档提交完成及主代理推送、Issue 同步生效；#57 与 R2–R7 仍未完成。PrimeUI 提示、R2 真实 404 和 Nest 组织 create 201 / OpenAPI 200 的既有差异继续按基线记录，不作为本次交付已修复内容。
