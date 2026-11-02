# RUST-R3A/B 联合 G3 候选

本 checkpoint 承接 #86 客户/别名8操作及 #87 项目基础6操作。类型为 `cross-layer-high-risk`，采用 solo worktree：base `a3a8c167f9cbeefc591dbaf2e75e7d5de9ce470d`，分支 `codex/poms-r3ab-customer-project`。本候选不自签 G3；实际结论以独立 C 原件及线上 G3 回执为准。G4、固定提交复核和主线集成仍须分别实际完成；此前 R3 交付保持0/58，#85/#57 保持 Open。

## 冻结输入与实现

联合[原基线](rust-r3ab-customer-project-baseline.md) 76cd9951、[manifest02](rust-r3ab/g1-input-manifest02.json) c3dd258f、[非作者 G1](rust-r3ab/g1-independent-review02.json) d01c7db0 已线上冻结。22项原 Zod oracle 裁定 Unicode code point 长度；六份作者初稿、被否定候选及错误预期均保留原字节。编号[corrective](rust-r3ab-numbering-corrective-checkpoint.md) 4fda3a1a 及 C a4f937f5 覆盖旧同事务/回滚取号预测：原 Native 在业务 BEGIN 后通过独立连接提交编号，实体失败保留缺号。

A/B 实现分别限于 `customers/**`、`projects/**`，Root 接线及 HTTP 测试；15项最终生产/测试来源见[联合验收](rust-r3ab/acceptance-evidence01.json)。工作区完整只读返回、客户/项目 owner 规则、原 DTO/错误次序、别名规范化和审计、项目 CAS/no-op/敏感字段与 lookup 保持原语义。客户 HTTP 真实产物先交付，再由项目 HTTP 创建、修改及读取闭环消费。没有新增 DDL、Native route、共享契约、完整 OpenAPI、生成客户端或旧公共 guard 变更。

## 实际验收

- Native/Rust 主验收各263次 HTTP、34项观察，对所有返回及观察按公开、有限的 UUID/运行时间/种子时间绑定归一后严格对比，差异0。原05原件和可移植只读复验权威均保留，失败01/02、实际差异03及候选04不冒作通过。
- 每端7项外部受控故障/两等待者调度，另用新06 cohort 补齐每端3项：客户/项目编号入口失败均500、计数器不变、实体0；敏感审计 INSERT 失败返回500、事件0，只保留事务前 guard touch，pending session flush 不落库；恢复成功 masked200、事件1与 managed session flush 同时完成。全部 ACL 归还。
- 实际敏感审计5个选择条件/端及别名删除2次/端分别查询数据库核对。自然连接 IP 的 `::ffff:127.0.0.1` / `127.0.0.1` 为原公共入口既有差异；旧 R2 请求重现，同一 XFF 两端一致，不任意抹平 IP。
- 原 Angular 四组合均通过：Linux/Windows 浏览器分别连接对应 Native 与 Linux Rust。每组合8项业务观察；客户创建、工作区、别名增删、编辑与列表，项目列表、详情、选取实际客户、保存和 PG 回读。原项目创建对话框在模板无可达入口，创建由真实 A→B HTTP 链认证；未迁移页面请求及其404保留，不计本片交付。初始五次 UI 失败/未认证记录及后续修正保留。
- Rust 普通测试232通过、54 ignored；fmt、clippy `--all-targets -D warnings`、release build 通过。旧 ignored 仍是53项显式 PG 声明加1项 child fixture，未改称实际 PG 通过。
- 当前 Native/admin lint 通过，Native74 suites/863 tests 通过，原 Angular 全新构建通过。admin 在宿主 JST 下367通过/1失败，原测试断言 UTC 日期在 JST 跨日；只在测试子进程设 `TZ=UTC` 后56 suites/368通过，原失败、产品、测试及宿主时区均保留。旧 QA/auth/legacy 与当前普通测试、真实 PG/HTTP/UI 各自计数，mock 不转为实际业务生产者。
- 原 OpenAPI 重新生成后872项 Native 输入原字节未变，仍为237 paths/291 operations/585 schemas；Rust 当前105 paths/129 operations。原完整 client CLI 对活动树 `.gitattributes` 冻结保护失败单独保留；在独立冻结校验树保留全部六项原 guard，复制当前五项输入、当前 baseline 原件和完整579文件，核所有585条路径属性等价后，原 `runClient --check` 通过，无输出改写。只给新 R3 原件/工具追加 raw-byte 规则，不改原生成器或 baseline。
- 原 `migration:check` exit1、schema dump exit0，168条已有且 validated CHECK、1条已有 comment 差异分别分类 `existing-baseline-drift`；QA marker 的建议 DROP 为 `tool-noise`。所有输出语句已穷尽分类，DDL 执行0。

## 环境终态与保全

实际 Rust 产物 SHA256 `d8f28d08a17d78e6d784e2f6eb24b204e110146189af7b7d9624969d9bd596c4`；双平台 Native 产物同为 `0ef7d8117097103a1c7b8a50cd00657ac1b57dac695175986ae07f98dfa2c2c4`。四组合消费同一422成员 Angular 构建。具体来源、构建日志和产物包由机器验收绑定。

9个验收 cohort 加1个 Native witness 共10个运行均清理；两库107张原种子表逐行原 JSON 精确恢复。06验收完成后观察到 WSL boot ID 变化，原运行随旧 boot 结束；未发重启或跨 boot PID kill，只验证本轮容器标签/卷后恢复本轮 PG15，完成原 marker 与行清理核验。该外部终止与原正常停止分列。Windows Native 身份核验后停止，Linux/UI 端口及 browser/server/pending 逐项归还；新 PG15 已停止并保留卷、private journal 和全部失败，旧环境及 PG17 不接触。

46份实际原件已逐字节保全至 `archive/slices/rust-r3ab/evidence/`；其余历史/partial、公开 Linux 原件包、执行产物保存在本批 ignored 证据目录，主区集成前还须保全并核完整清单。凭据只在本轮私有目录；发布的七份检查原日志逐项扫描本轮实际凭据，无值命中且原字节不改。

## 合并及关闭边界

独立 C G3 → 实现提交/分支推送 → C 固定提交复核 → 主区 FF/main 推送与集成后核验 → 原字节归档/线上 G4 → C 最终 G4。只有该链实际完成才关闭 #86/#87，计14/58；#85/#57 保持 Open，余44操作、完整非 HTTP 写链及 R3 阶段验收另片。R4–R7、正式部署/切流、真实云租户接管、性能认证均不在本批。
