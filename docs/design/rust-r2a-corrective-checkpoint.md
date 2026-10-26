# R2A 纠偏与验收差异记录

- Task：`RUST-R2A` / [#68](https://github.com/illusion-tech/poms/issues/68)，父 R2 [#67](https://github.com/illusion-tech/poms/issues/67)
- Owner：主代理；Reviewer：非作者子代理交叉审查；日期：2026-10-26
- 冻结输入：[R2A 基线](rust-r2a-navigation-baseline.md)。本记录保留失败与修正，不改写 G1 的三操作、原 TypeScript 事实源或数据边界。

## 1. 已处理差异

| 编号 | 分类                                     | 观察、修正与实际复验                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CP01 | `tool-noise`                             | 首两次 Nest witness 在登录前失败，无 SQL 记录，账号均二次清理零残留。原生 Node HTTP 的 flat header array 不自动补 Host；测试客户端补显式 Host，保留重复 header 行。另按 Content-Type 区分 JSON 与真实 HTML404，并新增本机 HTTP Server 协议测试。第三次 witness 四场景通过，Nest/Rust 各38场景通过，38项逐项对照含19个完整错误体一致。失败原件保持 fail。                                                                                                                                                                                         |
| CP02 | `tool-noise`                             | 首次 Cargo 的导航 parser 单测4通过/1失败：手工 tower Request 未带 Content-Length，因此原兼容 parser 正确判定无body并进入401。仅补测试请求长度，不改产品 parser 或400断言；完整重跑87普通测试通过。普通运行忽略24个显式入口；本轮新3个DB事务测试另行实际执行通过，不把旧20个DB测试记为重跑。                                                                                                                                                                                                                                                      |
| CP03 | `tool-noise` + `existing-baseline-drift` | 两个新隔离库的原 `migration:check` 均 exit1，保持 Failed-with-classification。各168条add CHECK提议对应已存在的同名约束；低权 `information_schema.constraint_column_usage` 为0行，而原MikroORM7查询依赖该view，属于既有introspection可见性限制。另有一处真实既有注释差异：`lead_score_override.status` 的迁移注释“覆盖审批状态”与entity“覆盖状态”。`schema:update --dump` exit0只证明生成成功，不代表schema clean；SQL从未执行。两库107表/1778列/515约束/504索引与92迁移完整catalog前后hash相同。此检查不证明168条表达式逐项相等或未建模trigger。 |
| CP04 | `new-real-drift`（G0规划遗漏）           | B发现 R2L 的非HTTP说明未明确 `ConfirmationService`。已在R2范围文档、操作归属JSON和Issue79补公共确认引擎、三表事务/进度查询及R3–R5真实域消费，增加4个原来源指纹，43个来源均复算一致。公共操作仍108个，首片三操作范围不变；B复核关闭。                                                                                                                                                                                                                                                                                                             |
| CP05 | `tool-noise`                             | 前两轮 Linux Nest 浏览器均为1通过/2失败/0跳过，保留原始报告与各52项来源副本。首轮误用子链接 `isVisible()` 判断折叠菜单，截断的子项仍有 bounding box；改查真实父项 `active-menuitem` 并正常点击展开。第二轮治理读取/搜索已通过，PrimeNG图标参与按钮accessible name导致精确“刷新”定位失败；按实际按钮名称调整定位。原三场景、真实点击、响应与12字段审计断言均保留；最终四组合实跑结果另记。                                                                                                                                                        |

CP03 的两个dump规范化SQL SHA-256均为 `19818e0e8c66c592e9622da394049b7900fd763dd4a01720e536606597f578b6`。本片不修无关注释、不重复创建约束、不提升运行角色权限。审计12列与session合同另由两库catalog、真实请求和SQLx事务测试验证；PG17未连接。

## 2. 当前验收边界

CP06（`tool-noise`，只读截图观测）：最终截图实际显示 PrimeUI 红色许可提示，但基于 `document.body.innerText` 的 `knownPrimeUiLicense` 观测值为 false，是检测假阴性。该值不参与任何通过断言；A/C与主代理实际审图，以图中可见事实记录，保留原false值而不修改原报告。不据此声称提示消失，也不为这一观测字段改产品或放宽测试。窄屏文档宽度无横溢出，但卡片纵向堆叠、表格位于首屏以下，桌面表格仍有内部横向滚动，不扩称全站响应式修复。

CP07（`tool-noise`，证据聚合）：C最终审查发现机器记录替换为最终浏览器汇总时，未显式保留首两轮失败的来源manifest/stats字段；原始candidate、52项来源副本及失败报告均存在。已从不可变candidate原样补入 `preservedFailures.browser`，复算两份manifest与报告hash未变，保留修正前/后快照；产品、测试和原始证据均不变。

原 Nest witness 已证实：非due同步审计+1/version+0；due同步审计+1/version+2；过长requestId的22001失败审计+0/version+1；GET due审计+0/version+1。Rust显式事务只包围审计INSERT和pending session CAS，前置raw touch保持独立提交；late CAS失败回滚审计并保留独立撤销。

最终四组合各3项、共12项通过，零skip/flaky/retry；26个成功或失败轮次的受控run最终逐项重查均零残留，journal集合及来源前后不变。详细分层与最终G3/G4结论见[收口记录](rust-r2a-closeout.md)。R2其它切片、外部provider/存储、业务域、部署与性能仍在本片之外。
