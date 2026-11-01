# RUST-R2M 交付审计输入（G1 候选）

固定基线 `9dcfb498b175e9fdaae7584aff1d5d3f93bf814f`。本文件仅供 R2M #80 冻结输入使用，不是验收、G3 或 G4 结论。完整逐操作映射、原文件指纹、读级别和来源边界见 [机器输入](delivery-audit-input.json)。

## 最关键结论

- A–L 共108个操作，各自唯一归属；当前13个HTTP子集恰有108个唯一operationId，与当前完整规范逐操作相同，递归可达schema无差异。0漏项、0重复、0多项。K五个历史参数名到 `{id}` 的变化已由既有路由子片收口。
- 有一项明确移交 R2M 的真实待决：R2D 未认证 GET `/api/platform/users/%FF` 和末尾 `%`，原 Nest400、Rust401。其他 method/auth 仅旧源码推断，必须由本批复现及裁决；不能与普通有限覆盖一起仅保留标签。
- L最终candidate08的169个编译来源，当前原字节169/169一致；覆盖全部136个当前Rust src文件。自L实现 `3b154bf447df9897a934e95cb218fbdb0beaba47` 到固定基线，apps/libs/tools/.gitattributes零差异。当前65个literal include目标约9.97MB另做有界指纹，没有遍历123837件原证据树。
- A–I和K专属模块自各自实现无变化；J的attachments七文件被K扩展，公共auth/store、Cargo和root router在后批变化。因此旧专属证据可按来源复用，R2M仍需统一候选共享守卫、会话事务和J/K/L集成回归。旧运行不变成新运行。

## 明确移交项与原件

R2D权威锚点：`docs/design/rust-r2d-validation.json#/knownP3`、`#/artifacts/malformedPath`，以及 `docs/design/archive/slices/rust-r2d-closeout.md:48`。原公开记录 `E:/projects/poms/tmp/rust-r2d/bad-path-observation01.json` 为2358字节，raw SHA-256 `ac1bc451d3fd026a92b53238087d8291dcc28594cb90e7a91f8fceb3bb884511`；本次已完整只读核实。四项原观察均为无认证GET，状态为observed-partial，未加入旧566计划。

建议G1承接原两请求的当前双后端复现，再按共享动态路径、命令路径及method/auth顺序补最小回归。Root拥有共享router/auth修复；本审计没有修改产品，也没有执行HTTP或连接数据库。

## 可复用与保留的边界

- 54个ignore字面项仍是默认测试选择边界，包含显式PG测试和1个进程child fixture；不计成默认passed。新环境需要的显式PG目标另列，不能凭54推导失败或已运行。
- schema依然是分类失败：低权限CHECK introspection可见性及 `lead_score_override.status` 注释差异。旧check1/dump0、catalog不变、92迁移和未执行建议DDL均保留；新真实漂移才是新的阻断。
- K OBS断连已有独立G3明确裁决，仅64字节partial，原端等受控peer20秒、Rust沿既有Drop及时取消。它不是明确移交M的未决项，不声明取消等价或性能收益。原裁决 raw SHA-256 `a1687c924e58d2bc0256f5d6a12e4e51aaf34c6c6671307aaed226f7ab5e29f5`。
- B排序、GH/IJ协议与Unicode均为有限语料；不扩为全Unicode结论，也不制造全量Unicode新门槛。D的畸形URI待决单独处理。
- L四个Rust实际SQL wire缺口已在独立G3作为有限caller证据边界保留；Source03的30026个可比measure零差异不等于wire全等。旧07→08只按已审单行HTTP路径复用；内部multi-Todo不能源推理冒充修后实际运行。
- 受控Feishu/OBS协议集成不是真实租户认证。计划要求启用环境所需的真实兼容烟测；G1须明确本批启用范围。隔离受控验收不自动要求生产租户，真实启用也不能无证据记Pass。
- K只读实际移交facts，L实际Contract/Payout/Adjustment、final/retention与共享事务已交付消费闭包；完整R3–R5生产者命令继续其阶段，不机械阻断R2，也不冒称已迁移。
- K54literal/3根文件晚补、L首份传输异常、旧失败/partial/stopped/uncertified与原G1/G3时点不回写。原大tar/成员不重建；本次只核小索引与必要来源。

## 最小集成建议与收口边界

按正式计划§1.2/§9在同一个冻结候选上集中运行：必要Rust静态/测试/release、现行契约与单向source保护、受影响Node检查；共享Session→CSRF→Permission与审计/managed session负面路径；J/K真实存储/移交路径；L有界真实域和事务路径。优先覆盖已变化的共享边界，不把既有HTTP/UI总数相加为当前实跑，不按切片机械重跑共同项。

Root拟用新poms-r2m命名空间及PG20432、Native10070、Rust10071、UI10080、Feishu10090、OBS10091。这里只记录提案，未观测这些服务运行。旧PG17、环境与数据卷保留，新owned fixture按本批证据清理。

本审计仅写本MD与JSON；未启动DB/HTTP/容器、未读private、未改正式治理或关闭Issue。#80仍需正式G1、当前集成验收及非作者G3/G4；#67在自身完整条件满足后由Root收口，#57保持Open。GitHub实时状态由Root独占复核，旧归档回执不替代实时查询。
