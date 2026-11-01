# M4 跨 provider default 切换的有限来源调查

本次 Root 报告 an4b 的 OBS set-default500，与原 partial unique index 下的双行
UPDATE 风险相符；不能据此断言所有天然切换都500。旧 I/J critical source 对显式
set-default 明确观察200或500，另有 I/J OBS 跨 provider
API200的有限路径。这里只核源码与公开冻结索引，不读取本次
private/DB，不改变产品或旧回执。

`AttachmentStorageProviderService.setDefaultAttachmentStorageProvider` 读取目标
config 和 enabled/default 旧 config，分别在内存赋
old.isDefault=false/new.isDefault=true，然后一次
`repository.saveAll([previousDefault,config])`。repository 只有一条
`persist(entities).flush()`。实体和迁移的
`uq_attachment_storage_provider_default` 是
`UNIQUE(is_default) WHERE enabled=true AND is_default=true`，不是先清旧 default
的两次独立保存。传给 ORM 的数组顺序不证明数据库更新旧行在先。

Rust `attachment_storage/service.rs::set_default` 保持同一 source
分支：旧/新实体一并交 store.save。store.update_many
在多行时先做版本预检，再用一个 CASE UPDATE/WHERE id IN 更新，版本预检
`ORDER BY id ASC` 不等于 UPDATE 目标行顺序保证。单行分支直接调用 update。不能把
CASE/IN/UUID 排列当作跨独立 run 的物理执行次序契约，更不能通过改 sort、拆
flush、锁、索引或 deferral 偷修产品。

旧来源有三个不同边界：

- `tools/rust-r2ij/critical-scenario.mjs:50–51` 与
  `nest-critical-witness.mjs:45–46` 对原 explicit set-default
  接受观察200或500，并把完整实际结果交后续严格比较。它不是“永远500”的声明。
- `tools/rust-r2ij/obs-api-flow.mjs:29–33` 真实创建 non-default local，再 API
  set-default200，随后原 OBS session location 保持并 complete/download。其
  `assertOwnedDefault` 只核当前 default 都 owned，没有将旧 default 改
  false；不能补称该旧路径用了准备前置。
- `tools/rust-r2k/k-obs-actual.mjs:15` 明确执行
  `updateOwned('attachment_storage_provider_config',obsId,{is_default:false},'Root switches only its own provider fixtures')`，再
  direct 插入新的 local/default=true。后续旧 OBS 包下载 SHA 与切换前相同、新包走
  local。该文件当前 raw SHA 与 K frozen validation.sourceFiles 完全相同，K
  finite OBS/old-location/G3 已冻结。它是具名 owned fixture default
  准备，不认证天然 API 双行切换保证成功，也不是原 J bug 修复。

最小可行输入方案是复用上述 K 的精确 owned 前置，再调用原 API 的
no-previousDefault 单行分支：在实际确认唯一当前 enabled/default 属于本 run
后，以成熟 `Fixture.updateOwned` 只改该行
`is_default:false`，保完整原行/expectedAfter/transaction/xmin/独立可见 mutation
证据；随后以目标 owned config 的当前真实 rowVersion 调原 `:set-default`。这使
`findDefaultConfig()` 返回 null，源方法只保存目标单行，后续 audit 的
`previousDefaultConfigId` 应真实为 null，不能伪装成天然双行切换的旧 ID。

这是待 Root/C 明确采用的 source-derived prepared
输入，不是本调查已实施的步骤。若采用，scope、key_prefix、provider_type、created_by、keys
和 storage location 都不改，不重建或 query-ID 收养 provider；前置不得触碰未
owned/default 行。临时零 explicit-default 期间不穿插 upload/其他 writer；Root
沿原串行 step/drain/PG 机制执行。切回 local 也要按同一个具名规则处理当前 owned
default，而不是假设另一方向天然稳定成功。

当前 an4b 原500、provider before/after、版本、auth coflush与无成功审计等只按
Root 真实事实保留。provider 事务 rollback 不代表整个107表或 auth
副作用自动不变。若两端天然结果不同，必须保留并准确分类，不能把200/500归一。未来
prepared 正链仍须真实 API响应、SDK/PG/完整107事实与旧位置实际 bytes
证明，不能凭源码预告通过。

M4 比较器当前只保留输入契约和 Root21181B 静态原件，尚未出可执行 source
候选；本次调查不改该草稿、B five 或任何已冻结比较 helper。精确
source/hash/锚点和读级别见同名 JSON。
