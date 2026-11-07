工具支持审阅结论：最小 drain 修正成立；本次实际 cleanup 与两轮 fresh noop 的原件核验通过，不授产品 G3/G4。

单条 exact-owned-PK DELETE CTE 后、恢复已审用户 guard 的 ALTER TABLE 前执行 SET CONSTRAINTS ALL IMMEDIATE，会立即验证先前延后的检查；违例应当失败并回滚。它改变当前事务检查时点，不删除/重建或关闭 FK。此行为与 [PG15 官方说明](https://www.postgresql.org/docs/15/sql-set-constraints.html) 一致。当前 cleanup.mjs 的实际字节 SHA 是 `00001e0ab5f85bd80c25d63f9772525536cc8e886c251680c257e6efe089f4c1`。

已核旧251559…与新c38056…计划：398 个 owned PK、61 表、1 个已批准 borrowed restore、0对象。deleteRows/restoreRows、完整 expected catalog/sequences/objects、guard OID/definition/state、DELETE SQL及全部参数深相等；新计划仅在 maintenance 添加实际 drain sandbox 和验证标志。没有扩大白名单、拆分循环删除、cascade 或重写事实。

709/710 的实际 TEMP sandbox 均保留无 drain 的55006、drain后成功恢复及真实缺行23503；所有 TEMP 回滚、业务 rows/xmin/catalog/sequences/objects 不变。需要准确解读原件中的 no-drain allSystemFKTriggersEnabled=false：源码把它从 drain flag赋值，该失败分支没有执行恢复后的观测，不能把它当成“系统FK曾被关闭”的测量。正向分支确实查询并断言 pg_trigger 全O，独立23503也证明约束仍执行；原件不改。

000712 的实际 positive commit 确认398删除/1恢复/0对象，private evidence保留。其后两轮独立 fresh snapshot各比较两库共278表，逻辑行、catalog、sequence及对象均等于原baseline。明确不声称恢复原 row xmin（borrowed UPDATE本来产生新xmin）。原708失败继续保留failed/partial，不把它改成完成。

观察到的这次执行没有新增实质遗漏。stopped bound PID/拒绝端口/app connections0、deterministic table locks、exact PK+full row/hash/xmin、foreign-reference refusal、仅相同已审用户 guard暂关与原状态恢复、事务内baseline核对和事后两轮noop均保留。没有由本审阅者执行DB/进程变更，也没有公开private cleanup行payload。DB与文件系统原子性仍为false，WORM不在此证书范围。
