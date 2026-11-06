# BG1-03 / P2：冻结角色参与人可通过修改 parent 绕过不可变触发器

本补充不修改预审原件与原始输入，输入仍为 review.md 固定的 migration SHA。

migration.sql:709–716 的 `jghi_assignment_participant_guard` 使用 `COALESCE(NEW.assignment_id,OLD.assignment_id)` 查询父 assignment 是否 frozen。UPDATE 时 NEW.assignment_id 非空，旧 parent 完全不检查；同文件 721–735 的 deferred total guard 也只核新 parent。

静态反例：A 为 frozen，其中一名实际职责参与人权重为 0（本批明确允许）；B 为合法 sum=1000000 的 draft。把该零权重参与人从 A UPDATE assignment_id 到 B，新 parent 非 frozen，B 总权重仍 1000000，触发器均能通过；A 的原冻结参与集合却已改变。无需改任何金额或结论即可违反冻结证据不可变。

修正应禁止 assignment_id 更新，或按 TG_OP 同时检查 OLD/NEW parent 并对受影响两侧执行总和不变量。Root 正式 delta 应明确选定方案，并把该 DML 反例作为后续 SQL 验收输入。本次未执行 SQL。