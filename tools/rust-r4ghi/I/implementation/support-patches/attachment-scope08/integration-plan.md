# 附件 scope 08 整合提案

本包只交真实缺口及精确整合位置，没有声称当前协议已能完成本人条件新证据闭环。18项 Root 输入原字节与 baseSHA 见 gap-report01.json。

| 入口 | 当前位置 service.rs | 必须同 CommonSession 完成 |
| --- | --- | --- |
| 项目/合同/移交列表 | target_access:451, list:1199 | 锁实际目标导出projectId，require ReadProjectAnchorOrIList + Project，必须full-project；保留原target RBAC。OwnCondition/creator/legacy anchor不能全量list。 |
| 附件中心 | center:1601 | 项目/合同仅从真实FullProject集合输出，非项目原行为保持；不能按RBAC返全库项目附件。 |
| 普通详情/下载/预览/缩略图 | readable:510, binary:1313 | 真实active link的项目侧需FullProject并与既有安全gate相与；scope和附件/link行同事务。SQL失败不能被any_link吞成无scope。 |
| 本人已冻结证据精确GET/下载 | 新内部窄分支 | 从真实evidence/closure->condition反查原父子双UUID，require ReadOwnCompletionTask + Condition，再按read07b精确重验live/frozen分类、link、attachment、version、checksum；仅投影该ref。 |
| 本人pending任务新上传/target/object/complete/精确回读 | 当前没有条件绑定机制，先corrective | 服务器核实际project->completion->condition父子链、本人owner、pending、有效成员，双UUID require CloseCompletionCondition。session.created_by及真实attachment.uploaded_by必须本人；各阶段加载服务器可信绑定并重验。不授项目list。 |
| 本人新上传link | create_from_session:1025, link:1521 | 只能该任务绑定session实际完成的本人新附件生成精确project link；不能把他人任意附件换link。一般link仍要源可读+目标FullProject写。 |
| 版本历史/换版/元数据/final/void/unlink | history:1268及mutation函数 | 一个own frozen ref不扩为version group/全局mutation。项目侧需FullProject与既有write/uploader/security条件AND；非项目业务不改。 |
| summary.links | summary/list_summaries/history/center | 合法customer/lead访问不连带输出未授权的项目/合同关联。窄条件只输出精确ref，不附所有active links。 |

现有store::run每次独立拿连接，flush_guarded再独立BEGIN。不能只在target_access额外开TX调用Scope。最小正确方向是项目关联路径增加borrowed-session store入口，保留原Entity字节/JS编码/source guard，由HTTP outerTX统一拥有Scope、实际源行、CAS、必要audit/auth。非项目原路径保持。对象存储沿原回滚/Unknown-retain机制，不能虚构DB与对象存储原子提交。

零DDL方案需要明确的新typed context和服务器受控binding producer；若Root接受用既有audit_log.metadata承载，必须先定义它的唯一性、不可变、版本/hash和实际actor/session/condition绑定，不能把当前自由audit metadata当现成权限事实。若不接受该持久语义，就需要专用字段/表的DDL corrective。description、changeNote、relationType不得暗藏授权标识。

Root实际验收：任意ProjectRead/OwnCondition/creator/legacy anchor全项目list/center/history拒绝；FullProject正例；本人精确冻结附件可读；撤链/停用/升密/版本checksum变更拒绝；本人pending新上传->回读->关闭真实闭环；他人附件换link、跨项目、错父子UUID、已closed、负责人撤销拒绝；附件/audit/auth任一失败整体回滚。当前未运行这些场景。
