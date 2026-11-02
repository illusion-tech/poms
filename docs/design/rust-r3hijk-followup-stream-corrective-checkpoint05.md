# R3H–K 空提醒流并发补正

EX-49 明确同 owner＋target 保持一个当前提醒流，新跟进事实完成旧提醒。Root 在候选05 的 phase50 对全新 project、同 owner 先确认无 Todo，再以 todo_item SHARE 锁观察两名 INSERT 等待者；释放后两个合法 create 均201、两条 F 事实均提交，却有两个 open Todo。此为实际业务 P2；phase42 的同 source 竞态通过不覆盖这个不同 source 的空流形状。

本次只补 sales_follow_up/reminder.rs 内的事务串行保护：在任何 cancel/source/stream 查询之前，以已有最具体 targetType＋规范 UUID 的命名空间键取得 pg_advisory_xact_lock。锁随现有 business TX 提交／回滚释放，source 行锁与版本重验仍在前；按 target 串行也覆盖换 owner、无 owner、无下次日期和作废，避免多 owner 双锁顺序问题。锁不改变 owner 分流查询、提醒生命周期、日期、API、审计注册或 DDL，不增加交付操作数。

修正后 SHARE blocker 下应看到一名 Todo INSERT 等待者和一名 advisory 等待者；两命令仍各201，保留两条事实，前 Todo completed、同 owner 流唯一 open。需实测 project/lead/customer 三目标、不同 owner 分流、既有同 source 三组200/409、审计故障回滚和真实 F→公开 Todo／下游链，并保持全部自有终态。原 phase50 失败、候选05字节及完整 G3 首审保持原标签，新候选通过不能改写旧结果。

I create 既有规则不注册 created 审计，EX-63B 只要求实际字段变化的 PATCH updated 审计。Root phase49 将 deny-audit 下 create201误期望为500属于工具前提错误；其真实成功行仍留证并清理，不增造 created 事件。I 的其他已完成 uppercase 身份用例与 phase51 续测分别保留。

G3 继续阻断，正式交付仍30/58，#93–96及父#85/#57保持Open；本记录不认证完整 R3 阶段。
