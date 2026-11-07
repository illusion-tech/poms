此为审阅者编写的 M96 单实体候选，未修改 Root 产品/DB。完整源文件、exact base/candidate SHA 和 patch 分别见候选目录、manifest22.json、candidate22.patch，仍需 Root 非作者审查后晋升。

新增 import 与一个 deferred composite relation builder：local(completion_condition_id, completion_record_id, target_id) → ProjectCompletionCondition(id, completion_record_id, project_id)，精确 FK 名 fk_jghi_upload_condition_scope，DELETE RESTRICT、UPDATE NO ACTION。ownColumns=[]、hydrate(false)、hidden、nullable；没有新 scalar、默认、nullable 或权限事实。

真实 MikroORM7 offline metadata 以 Generator21 为基础：完整 135 表语义 delta 仅新增这一 FK，所有 scalar column 的 type/null/default/comment 等配置、其余 FK/规则、CHECK/index 完全相同。所引用三列 unique 存在。TypeScript 6.0.3 真实框架类型 0 诊断。两种入口顺序（常规以及首先初始化 upload 实体）均实际生成相同完整 target。43 个实际 TS runtime import 源的闭包表明 target 没有返回 upload 的路径，新 edge 不引入 module cycle；target 类引用保持在 relation arrow 内。

必须明确保留的次序事实：relation 声明置于三个非 primary scalar 前，以免框架后写 relation 清空它们不同的 comments。该表 target column-map 的 key 枚举次序因此改变，所有 scalar 值与实际 DB 列 ordinal 都不变；并未执行 DDL。proof22.json 同时给出完整 before/after key 序列，不伪称顺序相同。若 Root 要求 metadata map 枚举次序也绝对相同，应另行界定必要 helper，而不能隐藏此事实。

本候选只补真实 ORM FK 登记，不把 SQL guard 称为 historical 或框架不能表示。Root 实际 owner dump/check 应确认 M96 guard 的 DROP 提议消失；剩余 44 个历史 guard、等价 CHECK、comments 仍应准确分型。此处不授产品 G3/G4。
