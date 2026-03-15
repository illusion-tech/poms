# 参考资料

本目录用于存放支撑设计和实现的一致性资料，重点回答“团队在写设计、做实现、做评审时，哪些词、哪些字典、哪些模板应该统一使用”。

本目录不直接承载业务设计结论，也不记录高层决策，而是作为 `docs/adr/`、`docs/design/`、`docs/modules/` 的配套参考层。

## 目录定位

相对于其他目录，本目录的定位如下：

- `docs/adr/`：记录为什么这样定
- `docs/design/`：记录系统设计、业务域设计、治理设计和评审治理
- `docs/modules/`：记录模块实现设计
- `docs/reference/`：记录术语、字典、模板和通用约定

因此，本目录更适合沉淀“长期复用的辅助信息”，而不是某一轮评审或某一个业务域的临时结论。

## 适合放在这里的内容

- 术语表
- 角色字典
- 状态字典
- 权限字典说明
- 文档模板
- 审批节点说明
- 编码规范或设计约定
- 常用枚举、命名约定、对象口径说明

## 不适合直接放在这里的内容

- 具体业务域的详细设计
- 高影响、难回退的架构决策
- 评审清单、评审摘要、进度跟踪
- 某个模块独有且不具备复用价值的临时说明

这些内容通常更适合进入 `docs/design/`、`docs/adr/` 或 `docs/modules/`。

## 建议后续补充

- `glossary.md`
- `state-dictionary.md`
- `permission-catalog.md`
- `role-catalog.md`
- `document-templates.md`
- `object-naming-conventions.md`
- `workflow-node-catalog.md`

## 当前文档

- `glossary.md`：跨文档核心术语表，用于统一关键对象、关系实体和横切概念口径
- `state-dictionary.md`：跨文档状态字典，用于统一阶段、状态和值域语义
- `permission-catalog.md`：权限命名与分层目录，用于统一权限前缀、命名规则和使用边界
- `role-catalog.md`：跨文档角色目录，用于统一平台角色、业务职责角色和审批角色口径
- `document-templates.md`：文档模板目录，用于统一 design、modules、reference 三类文档页头和章节建议

## 命名建议

本目录建议优先使用“对象 + 类型”的稳定命名方式，例如：

- `glossary.md`
- `role-catalog.md`
- `state-dictionary.md`
- `permission-catalog.md`
- `document-templates.md`

命名应突出“参考资料属性”，避免和设计主文档命名混淆。

## 使用建议

- 新增设计文档时，如果发现同一术语、同一状态、同一角色口径反复出现，应优先抽到本目录统一维护
- 评审时如果争议点只是术语或字典不统一，应优先回看本目录，而不是在业务设计文档中各写一套
- 若本目录某份资料已经成为多个设计文档的共同依据，可在 `docs/design/README.md` 或相应子目录 README 中补充阅读入口

## 维护约定

- 参考资料应保持稳定、可复用、低业务耦合
- 当设计文档中的术语、状态或角色定义被正式收敛后，应考虑同步抽取或回写到本目录
- 每次新增重要参考资料时，应检查 `docs/README.md` 是否需要补充入口说明
