# RUST-R2L1 / ROUTE-K 实证纠偏记录

本记录遵守已冻结的[联合 G1](rust-r2l1-k-route-baseline.md)。范围仍为 #81 七表内部公共机制与 #82 五项参数同步，0 新公共操作，R2 仍 99/108；本记录本身不构成 G3/G4。已观察失败、工具失败、恢复及当前通过记录分别保全。

## 原实现先行与夹具边界

- 原七表 Schema、三 service / 三 summary repository 及锁定 MikroORM 7.0.11 在新 PG15 实际运行。`native-calibration-alpha03.json` 为 10 组原实现观察与 13 个完整最外层提交证书；它没有 Rust 相等或完整 L 路由认证含义。
- 摘要 standalone 的快照保存和字段保存是两个 flush，第二阶段失败可保留快照；调用者外层 rollback 则回滚两阶段。`supersedesId` 不会自行解除旧 active 唯一约束。Confirmation 默认 nested/savepoint、父 dirty state、失败后继续和空 `saveAll([])` 的行为均按原实现校准。
- 初次 Native 校准因 Root 使用了错误的参与人列名而中断。实际列名为 `participant_role_key`、`participant_status`、`participant_display_name`；原始实体/迁移及完整来源表为准，不改写已冻结 G1 的旧概述。alpha01 的失败原件及限定身份恢复原件保留，最终恢复双零，不把缺失的完整 case 观察补标通过。
- 夹具先验证完整 107 表 / 1778 列 / 207 条 FK、35 条目标入站关系和 owner marker，再写新 run 的精确意图。完整表 UUID/text/JSON 逻辑闭包及任意来源 schema 的未知 FK 均在删除前检查。预存 PK 拒绝、清理后新 B 不再收养、未知 FK/compact UUID 引用拒绝、真实 COMMIT 后 synthetic ACK 丢失及 xmin 正反恢复均有实际零删除/恢复证据。
- Native ownership 只接受实际 ORM `afterCreate` 和最外层 COMMIT 事件链；Rust 另验实际 INSERT RETURNING / SQLx 最外层 acknowledged commit 证书、上下文及 release 链。返回 DTO 或仅匹配 selector 不构成 ownership。`fixture-supplement-review01.json` 绑定 refs01 实际运行的旧 helper `386040f6…`；后续 Rust 分支另有源码增量与实际创建证据，不追认旧运行版本。

## 同次 G3 中发现的行为差异

1. **显式 clear 后的旧绑定读取。** 实际 alpha04 中，原版 detached 对象仍可读取 ID；Rust 探针错误地把这种读取当作 managed 写入而拒绝。修正仅增加只读 binding 数据读取，query / assign 的 managed identity 约束及 clear 的 detach 保留，旧 handle 不会指向后来新实体。增加纯状态回归，candidate04 实际 fmt/check/all-target tests/strict Clippy/release 已通过。
2. **必填 CREATE 的原 ORM 校验。** alpha05 的 38 组双端完整观察中，37 组逐项一致；`fieldRuleVersion:null` 在原版 save 时由锁定 ORM 拒绝，Rust 则进入 PG 得到 23502。原错误种类、校验时机和 entity inspect 文本属于内部接口现有行为，需要保留。修正依据锁定 `ChangeSetPersister.validateRequired` 和真实 SDK 纯函数 oracle；不能给 UPDATE 增加原来没有的限制，不能以新增 Zod/HTTP DTO 校验代替。
3. **已载入父对象在失败子事务中的共享修改。** 非作者 C 从 `fork(clear:false)` 的同对象登记提出定点候选，Root 在 `common-managed-parent01.json` 中实际复现：先 get、原 unsupported 审批失败、同 case get、clear/get，Native 状态为 `pending → approved → pending`，Rust 为 `pending → pending → pending`。两端 PG 始终等于 before，最终双零。修正应保留既有父对象字段/原 snapshot 的共享变更；不能将失败 child 的新身份、待写队列或提交证书无条件并入父状态，也不能增加自动 clear 或还原内存。
4. **显式 null 与默认值的阶段。** C 从源码提出 default 初始化候选；alpha06/07 的实际观察纠正了最初“save 应失败”的推断。定义仓储 `create({status:null}) → save → 同对象空 assign 快照 → find`，Native 为 `null → undefined → null → active`，DB 已为 active；旧 Rust 在 create 就变 active。锁定 `AbstractSqlDriver.nativeInsertMany` 的 `rowValue ?? prop.default` 只补 INSERT 参数，并不改 entity；status 没被 RETURNING 返回，后续真实 select 才 hydration。修正必须区分 create 的 undefined default、nullish onCreate、INSERT 参数 fallback 与后读刷新，不能将显式 null 一律拒绝或把默认值提前写回内存。这是同一原 ORM 初始化边界，原件保留，不扩展业务范围。

以上差异原件保持原状态；修正后须以新的实际回执和非作者审查闭合，不回写旧 golden 或把失败候选称为通过。

## 比较器与验证方法的限定

- 初版比较器将整个 run 内的生成时间统一为 token。C 指出这可能掩盖 `updated_at` 未刷新的错误。最终验收必须先验证每步真实时间范围、原实际写入阶段、应保持的旧值及返回 Date 与真实 PG 毫秒值之间的关系；全 run 时间范围只作外围检查。固定 2020 时间保持精确，原错误中的生成 Date 也只允许按实际 create 阶段归一。
- 原进度 SQL 仅 `ORDER BY created_at`，同毫秒参与人的次序不确定。两组正常 create 单独观察后，Root 只对已证明 owned 的参与人设固定 `.123` / `.456` 时间，再对真实 confirm/progress/close 返回逐项比较。没有修改产品排序、冻结产品时钟或把任意列表改成集合。其余 observable 数组保持顺序；仅相同原排序键的并列桶允许桶内置换且桶尺寸仍须相同。
- `common-callback-seam02.json` 的四组实际 Rust-only 回调证明 approved/rejected 同提交、写后故障及 caller rollback。固定回调只在 example 中更新已拥有的另一条审批 witness 行；生产模块要求显式 handler，没有 default/no-op 成功实现。这不是合同/提成域审批认证。
- `common-concurrency-cas01.json` 双端实际等待两个 versioned UPDATE，再释放夹具的父行锁；各一成功、一原 optimistic failure，失败者的 participant/Todo 写入全部回滚。该锁只用于测试调度，产品没有增加锁或重试。

## K5 与共享工具的真实分类

K 的五项实际 controller 参数、完整 OpenAPI、原生成器 579 件输出及全部命名 consumer 同步为 `{id}`。具体 URI 形态、operationId、鉴权和业务参数不变；命名 RequestParams 键改变是本片明确的源契约变更。永久输入祖先 `687827d45da2047028f625a600fe207876d40d6f` 及旧生成 baseline 原件保留。其他 286 操作完整 payload、585 schemas、578 件其他客户端文件和 92 迁移保持原样。

共享回归保留原 launcher 中断/失败。实际通过的同配置 locked tsc 构建以明确替代 pnpm bootstrap launcher 记录；admin build 仅跳过本次已有成功证据的依赖，不能称原完整依赖链也通过。admin-e2e 没有 lint/test target，列 N/A，另做其实际类型检查。双库 migration-check exit1 / readonly schema dump exit0，按既有 CHECK 可见性及 `lead_score_override.status` 注释差异分类，catalog 和 92 条迁移前后不变，生成 DDL 未执行。

最终 G3、完整源码/二进制保全、停止新 L1 环境、主区归档、提交集成及仅两个子 Issue 的 G4 结果见后续独立记录。父 #79/#61、K 业务 #78 和 R3–R5 不因本记录完成。
