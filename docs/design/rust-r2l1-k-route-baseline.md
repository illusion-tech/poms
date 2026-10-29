# RUST-R2L1＋ROUTE-K 公共引擎与五项参数裁决实施基线

- Gate Status：G1 Pass（2026-10-29T03:54:55.713Z）；同次非作者审查未关闭P0–P3为0，正式审查原件[review01](rust-r2l1-g1-review01.json)。受审原文已保全；以下仅Gate元数据更新，不改冻结范围，G3/G4尚未完成。
- 用户授权：2026-10-29“开始，先推进 L 的公共机制子片，并行处理 #61 中 K 的五项路由参数裁决”。沿用已授权的隔离 worktree、集中真实验证、独立审查和 solo 提交/推送/main 集成流程。
- 子片：[L1 #81](https://github.com/illusion-tech/poms/issues/81)，父 #79；[ROUTE-K #82](https://github.com/illusion-tech/poms/issues/82)，父 #61。父 #79/#61/#67/#57 不因本批自动完成。
- 来源 main：`20335a189ce1197ccd4211bdfbb314954421729e`；独立工作树复用 `E:/projects/worktrees/poms-r2ef-foundation-audit/poms`，新分支 `codex/poms-r2l1-public-k-route`；primary `E:/projects/poms` 在集成前保持。
- 类型：L1 为 persistence / 内部 command-query；ROUTE-K 为 api / 生成客户端与调用方契约同步。联合按 cross-layer-high-risk 验证。
- 当前 R2 已交付 **99/108**；本批新增已交付公共操作 **0**。L 的四操作、K 的五操作及 R2M 均不在本批认领交付。

## 1. 正式输入与单向权威

| 输入                   | 位置                                                                                                                       | 本批用途                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 调度、模型、隔离与验收 | [迁移计划](backend-rust-migration-plan.md) 1.1/1.2/1.2.1                                                                   | 公共机制可先行，真实域逐项验收，避免阶段循环                      |
| 现行操作与依赖         | [范围](rust-r2-scope-and-dependencies.md)、[机器映射](rust-r2-operation-slices.json)                                       | L4/K5 仍是后续业务交付，原 G0 字段保留历史含义                    |
| L1 精确来源            | [作者输入](rust-r2l1/l-source-input.md)、[来源清单](rust-r2l1/l-sources.json)                                              | 原 TS service/repository/entity、95 件 raw/LF 来源与锁定 MikroORM |
| K5 精确来源与裁决      | [裁决输入](rust-r2k-route/input.md)、[五操作映射](rust-r2k-route/route-proposal.json)、[来源](rust-r2k-route/sources.json) | 五项 current/canonical、客户端命名对象与调用方、生成器冻结规则    |
| 路由权威               | [ADR-015](../adr/015-api-route-canonical-grammar.md)、[canonical](api-route-canonical-inventory.md)                        | 本批五行 target 已是 `{id}`，不创设新 URL / alias                 |
| G0 在线原件            | `tmp/rust-r2l1/g0-online.json`                                                                                             | 新子项、父状态、comments/labels/projects/closing-PR 与原生子关系  |
| 新环境只读盘点         | `tmp/rust-r2l1/environment-g0.json`                                                                                        | 固定镜像、Node 路径/哈希、新路径/端口不存在或空闲；非运行验收     |

原 TS、shared contracts、现有 DDL 是 L1 业务语义权威；不修改它们迎合 Rust。K5 的 controller/规范/client/consumer 变更是本批明确授权的独立例外，必须有精确消除对照，不能把旧 R0/IJ 冻结 hash 全局改写为新值。

## 2. L1 交付范围与七表

交付完整可调用且真实落库的 `ApprovalSummaryService` 与三 repository、`ConfirmationService` 三命令与两项进度查询、由确认命令实际产生/完成/取消的 Todo 生命周期；另交付审批公共行读取/排序/校验、共同 record/todo 变更与必选同事务业务 callback 接口。新模块为 `approval_common`，只由 lib 导出，不接入 HTTP router。

七张既有表：`approval_record`、`todo_item`、`confirmation_record`、`confirmation_participant`、`approval_summary_package_definition`、`approval_summary_snapshot`、`approval_summary_field_projection`。类型、默认值、nullable、version、约束和排序详见 L1 作者输入；不新增产品表、列、迁移或权限。

- Summary standalone 保留两次独立 flush；第二次字段保存失败可能保留第一笔 snapshot。输入 supersedesId 不自动释放旧 active 唯一项。有 caller-owned 事务时使用同一连接，由调用方决定整体 commit/rollback。
- Confirmation 原 `transactional` 默认 NESTED，已有 caller 事务时的 savepoint、父 managed state 传播、失败后可继续性、flush 顺序必须先取得原 Native 实证，再确定 Rust store；不得另取连接独立提交或静默强化原子性。
- Approval 公共校验顺序、初始 expectedVersion、pending/assignee、共同 record/todo transition 与原 optimistic flush 行为保持。callback 必选，无生产 no-op/default-success handler；借用同一事务/连接，域副作用不得提前提交。真实 PG 验证共同状态与 callback owned control row 同提交、故障全回滚、外层 rollback。
- 已支持合同/提成对象“尚无 Rust handler”不能伪装成原 unsupported 400。原 unsupported 400 仅验证原不支持的 type/target 组合。原有三种真实 domain 分支和完整 Todo enrichment 留待 R3–R5。
- 原内部 interface 不增加 Zod/HTTP DTO 限制；`??`、truthy、原始 UUID 字符串、JS UTF-16/PG text、Date/排序和 version 按来源保留。已有 `JsString` 为复用基础，禁止提前 lossy 转换、增加锁/重试/统一 CAS。
- 原四条 L 路由保持未注册 Rust；调用者事实不齐时只提供内部 raw 行，不能伪称完整公共 API summary 或返回固定空待办。

## 3. K5 参数裁决与同步边界

候选裁决为采用既有 canonical `{id}`。具体五项在作者矩阵逐一冻结：

| Method | current 参数 | target 路径                                                |
| ------ | ------------ | ---------------------------------------------------------- |
| GET    | handoverId   | `/api/project-handovers/{id}/attachment-checklist`         |
| POST   | handoverId   | `/api/project-handovers/{id}/attachment-checklist:refresh` |
| POST   | handoverId   | `/api/project-handovers/{id}/attachment-download-packages` |
| GET    | packageId    | `/api/attachment-download-packages/{id}`                   |
| GET    | packageId    | `/api/attachment-download-packages/{id}/download`          |

同步 controller decorator 与 `@Param`、生成的完整 OpenAPI、generated client 五个 RequestParams，以及实际命名参数对象调用方和适用测试。URI 实际形态、业务 service 参数意义、operationId、权限、请求/响应业务 schema 不变；路径标签及 TypeScript 参数对象 key 是有意的源契约切换，不宣称它们原字节不变。不保留旧参数名 alias。K 本身的 Rust 业务、R4 移交读取/确认冻结与五个操作的完整验收仍属 #78 后续。

#61 其他两项 lookup 与 R4 两项移交参数差异继续未完成。只允许在本片 G4 后勾选 #61 的 K5 条目；不能整体关闭 #61。canonical 五行在实现完成前保留 current drift，验证同步后才更新 current/aligned。

## 4. 原生成器冻结保护与局部 checkpoint

完整 client 继续使用原 `tools/openapi/shared-api-client.mjs`，7.20.0 JAR、2.41.0 wrapper、configuration、metadata 三件保护不变，不改 runner 来绕过 guard。完整规范始终 237 paths / 291 operations / 585 schemas，操作 ID 集合不变。

原 runner 要求 protected 六项输入在 working/index 相对 `baseline.sourceHead` 均为空差异。G1 明确允许以下**局部 generation-input checkpoint**：

1. controller/规范完成 K5 变更，先完成聚焦的绑定/原 URL 对照、规范消除对照与必要 lint，再由非作者审核精确输入。
2. 仅在隔离 feature 产生真实输入提交 S；S 不是联合 G3、完成或 main 放行，不推 main。S 必须保留为最终提交的永久祖先，避免 baseline 指向不可达对象。
3. 原 generation baseline 原字节单独保全；新 baseline sourceHead 指 S，只调整新 spec 指纹及五 path/method 映射；六项中另外五件 hash、opIDs、schemas、JAR/config、metadata 保护不变。
4. 证明 working/index 对 S 的六项输入都无差异后，运行原 CLI write/check；不使用绕过 guard 的替代生成流程、不手写 generated client。
5. 完整输出与所有实际 consumer 同步、共享验证与独立 G3 通过后，才允许联合集成 main。

这是生成输入保全步骤的受限顺序，不是省略 G3 的例外；cleanup owner 为 Root，收尾期限为本批 main 集成前。G1 reviewer 必须明确接受此顺序，否则不进入生成步骤。

## 5. 分工、隔离与真实环境

沿用计划 1.1 的模型目标与原三位已创建子代理：I 负责 L1 模块/纯测试/内部 probe；J 负责 K5 裁决、controller/client/consumer 的精确范围；非作者 C 审 G1、输入 checkpoint 和最终 G3；Root 负责共享 lib/Cargo/config/http、环境/fixture/Native witness、集中验证、证据、Git/GitHub 与主文档。没有新的 Fast 参数或实际服务层切换证据，Fast 保持未核实。

仅使用新 L1 checkout `/home/wangzishi/projects/poms-rust-r2l1`、private root `/home/wangzishi/.local/share/poms-r2l1`、容器/volume `poms-r2l1-pg15` / `poms-r2l1-pg15-data`、新秘密与 marker、双库 `poms_r2l1_nest` / `poms_r2l1_rust`、低权限 app role `poms_r2l1_app`。PG15 固定镜像 `b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a`，build 镜像 `ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273`。loopback `17432→15432`；需要时 Native7700/Rust7701/admin7800。Node24.19 原路径与 raw hash 已盘点，不安装或升级宿主工具。

原 PG17 仅查服务元数据，不执行 SQL/重启；旧 PG15、IJ/private/cache/回执保留。新状态可只读复制必要依赖/编译缓存，不能改旧库或借旧 owner secret。

## 6. 必须完成的验证

- G1 后 Root 先实测原 TS service/repository＋锁定 MikroORM＋新 PG：Summary 两 flush/独立残留与 outer rollback、Confirmation nested/父状态/CAS/失败后继续；Rust 持久化定型依赖这些实际记录。未知行为不预报为 Pass，出现差异记录 corrective，不能改旧 golden 掩盖。
- L1：真实双库 service/probe 成功/错误/版本/最终行对照；空/重复参与人、权限/状态/CAS、唯一/FK/字段失败、进度排序与 nullish/UTF16 边界；受控并发；callback 同事务真实写入与故障 rollback 单列，不充当合同/提成验收。
- fixture：全部意图/UUID/对象身份先登记，精确收养服务生成行。新库完整 schema 与引用边在写前验证；全表 UUID/text/JSON 逻辑外引和未知 FK 必须先拒绝且零删除。只删已登记精确行，双清理连续 0/0；原 seeded definitions 不认领、不修改。owned control witness 必须与产品 DDL 分别标记。
- K5：五条真实 controller 绑定和 generated client URL/参数对象对照，全部实际 consumer 类型检查/适用测试；删除五项标签差异后规范其余部分严格相同。L1 无新 HTTP/UI；不得用 K 的 route-binding 测试冒充移交业务全链路。
- Rust fmt/all-target tests/strict clippy/release；受影响 API/admin/library lint/test/build，完整 OpenAPI/client 原 CLI check；schema/migration check 记录真实结果与 drift 分类，生成 DDL 不执行。lint warning、ignored、N/A 和旧失败分开记录。
- 文档 diff/Markdown 格式、当前范围/历史清单保护、独立 G3；保全实际 source/binary/原件、停止本批 owners、新 PG15，校验主区一次归档与逐文件 hash；局部 checkpoint 不替代最终验证。

## 7. G4 边界

只有本片代码/契约完整、独审通过、提交推送与集成核验、生命周期归档和在线读回后，#81/#82 才能 Done。本批只完成 L1 内部引擎和 K5 参数裁决/同步；#79/#61/#78/#67/#57 与 R3–R5 按各自条件保留未完成，R2 仍 99/108。真实 OBS/生产租户、部署、性能和业务域审批/移交认证均不在本批。
