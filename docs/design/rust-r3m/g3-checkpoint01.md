# R3 收口批 G3 候选

本候选承接 #85 → #97 → #98/#99/#100，采用 solo worktree 模式。G1 已由独立审查及线上冻结生效；本文件不自签 G3，也不授权关闭 Issue。#85/#57 当前仍开放。

交付边界是 R3 评分、审批、客户销售写链的业务一致性与完整阶段验收；公开操作增量为零。必要业务状态、系统和决策快照、注册审计在同一事务提交或回滚。正常覆盖沿用匹配存储系统 tuple；缺少匹配历史时按用户裁决在审批事务内补算并留快照。Customer/Contact CAS0 返回409，相同业务值不因 actor 或 UUID 字面差异制造更新，组织即时投影与 GET 一致；原 UI 非空签约日期发送 ISO datetime。

唯一产品候选为 `final01`，43,775,864B Rust binary SHA `f6a9fdeddebcc6c3453c329ba5dbe6ba38f725e9577df006189b91bfff685747`。311 编译输入和原产物已保全且重新核哈希；WSL 重启后的 `final02` 是同产物新 PID 标签。产品仅七个 Rust 文件和两个 UI 文件，Native 后端、契约、客户端和迁移无增量。

当前实际验证包括 fmt、clippy all-targets deny warnings、locked offline all-targets test、release；306 passed / 0 failed / 54 ignored，其中53个 DB opt-in不冒称执行，显式child由非ignored parent实际启动。Admin lint、23 focused unit、production build通过。受保护 Native 代码未改，不重复全套 Native lint/test；已实际从保护源构建 Native 参照实例，当前服务与 UI 的真实阶段验收另行完成。

[完整证据原字节封包](g3-package-manifest01.json)和[逐项覆盖](evidence/coverage-final01.json)给出58有效操作、精确canonical归属、同产物/完整business范围及四轴来源。四轴16旅程为8个Rust业务通过和8个Native参考捕获；Native三类旧缺陷以真实HTTP/PG/具体23505约束记录，不能称16个业务全通过。四次实际非空日期转换核请求、响应、GET、stage、PG与页面；另实测null/省略合法、date-only拒绝无业务副作用。

真实链路包含客户/联系人/别名、Lead/I/F/Todo/讨论、四份真实上传及同一转换返回Project的成本/竞标/报价版本、精确金额和唯一current。评分物化与快照一致，正常manual/revoke不偷偷刷新，历史fallback先系统后决策快照；必要写具名故障、五组非空九表回滚图、恢复重试与CAS/空流/source并发均保留。失效会话和CSRF/权限检查覆盖58入口、33CSRF、580组合、18方法URI、51失效及同一会话权限即时刷新，104表完整原图只在private，公开为计数/SHA和安全目标。

完整OpenAPI173/138/585与前批对象相同；Native291/237/585、58完整operation对齐，579client和92migration原字节保护。未重新生成client，不冒称生成检查通过。两库installed locked MikroORM只读 migration-check exit1、schema dump exit0，168已验证CHECK、原注释及QA marker噪声精确分类，未知漂移0、执行DDL0；107表/1778列/207FK/428ACL/行集前后不变。

E1 exact五别名419264B已在Windows/Linux移除，前22/后21组支持回放一致，canonical/map及23旧消费者原字节不变。支持入口为 `tools/rust-r3m/e1-replay01.mjs`；旧hardcode执行器保留其历史约束，不声称无需适配即可新跑。

M5以九个当前cohort的精确actor、207真实FK及具名非FK来源闭包清理4471行；无根循环、seed或remember关联ID不作为根。两库107最早seed/catalog/428ACL/日志设置精确恢复，postcommit读回及各自第二次0变化。11对象486B原件、Rust/Native/UI产物和编译输入保全；运行对象0，双平台原profile浏览器0，所有本批API/PG/keepalive停止，卷/private保留。旧private/PG17未触碰。

所有历史失败、partial、stopped、quarantine和ignored原件保持原标签。审批图返回重名覆盖由phase24新完整执行补齐；公开raw字符串图泄露测试hash的phase27/28已原字节隔离private、公开仅安全quarantine元数据，phase29完整重跑；对象终态首轮启动器失败为partial，已保全11对象与后续resume/verify分列，不能回写成通过。相关纠偏01–05与原始执行器均保留。

G3由未参与实现及执行器的最终独立审查者签署；通过后才提交/分支push、固定提交复核、干净primary FF/main push。归档保全与实际main/remote状态通过独立G4关闭许可后，才关闭#98/#99/#100/#97/#85；#57始终Open。R4–R7、部署、切流、迁移接管、Windows原生Rust服务和性能认证不在本批。
