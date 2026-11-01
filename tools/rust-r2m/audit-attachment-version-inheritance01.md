# M4 create-version 500 的有限来源调查

结论：本次 Root 报告的 Native `:complete` / `uq_attachment_latest_active`
500，与已冻结 I/J 明确保留的原行为一致。当前 Rust 特意保留该 CREATE→ordinary
UPDATE 次序。本调查不修改产品、索引、flush 顺序、Native 版本或 HTTP
期望；本次运行仍以 Root 原始实际回执和完整物理状态为准。

## 原写入次序与索引

- `AttachmentService.completeAttachmentUploadSession` 先保存
  `validating`，再调用版本创建；异常时尝试把 session 保存为 failed。
- `createAttachmentVersionFromUploadSession` 先在内存将旧实体
  `isLatest=false`，创建同 version group 的新 active/latest 实体与 copied
  links，然后只调用一次
  `saveAll([latest,attachment,...copiedLinks])`。repository 的 `saveAll` 是一次
  `persist(...).flush()`，数组顺序不等于 SQL UPDATE 先行。
- 原 migration 与 entity 定义
  `uq_attachment_latest_active(version_group_id) WHERE status='active' AND is_latest=true`。新
  INSERT 在旧 active/latest 行的 UPDATE 前发生时，唯一索引会先拒绝
  INSERT。单纯重新排序传给 saveAll 的数组不能证明 SQL 顺序已改变。
- 当前 Rust `attachments/store.rs` 原注释明确 `Native native01` 的 CREATE
  先于普通 UPDATE，expression partial indexes 不生成 UPDATE_EARLY；代码也先
  `create_groups/insert_group`，后 `update_many`。失败 rollback 后不发布实体
  snapshot；complete 的 catch 再次 flush 时仍保留原新实体，可能再撞同
  CREATE，从而未能保存 failed。源码明示 native01 留下
  validating/v3，不能拿此注释替代本次实际 session/version 事实。

## 已冻结历史与读级别

I/J `rust-r2ij-validation.json:4407` 明确保留原 complete create-version
500；独立 `rust-r2ij-review01.json:219` 将它列为 compatibility result，非
business fix。四个 UI 摘要均有
`versionFailure.httpStatus=500/attachmentsUnchanged=true`，其后 abort 的 session
状态不可倒称为失败发生瞬间状态。

J `j-command-cases.mjs:52–65` 明确：两条 legal legacy history 由隔离 fixture SQL
准备，不是成功 API version-create。`fixture-history.mjs`
也有同一声明。已对当前可用的公开 `tmp/rust-r2ij/nest-history-history01.json`
做有限 JSON 读取并核 raw SHA 与原 source-manifest
对应项相同：versions200、mark-existing-final200、clear-final200、mark-single-final200、void-latest-fallback500，最终双
cleanup0。未读取其原 SQL/store-order 深层日志或旧 private。

K 五项 closeout 不宣称修复 J 的版本创建。其受审 `k-advanced-cases.mjs:18–29`
确实包含另一条具名前置：原附件真实 mark-old-final200、session201/PUT200，Root
对那个已 owned 旧附件做精确 `{is_latest:false}` prepared mutation，随后一次真实
complete200/实际 copied-link birth proof；再验证 K 选择旧 final、clear-final
后选择新 latest 以及新 payload 的 ZIP。源码明确说这不认证旧 J bug
已修。该文件当前 raw SHA 与 K frozen validation.sourceFiles 完全相同；K G3 认可
gamma05 的有限 strict comparison+独立 ZIP composite。

K 原 23MB/12MB paired HTTP 与13KB ZIP 原件没有在本次重开；其路径/hash和
composite/G3 仅按已冻结公开索引复核。不得把此次有限 source/index
读取称作重新验收了历史整条链。

## 对 R2M 当前封包的影响

R2M G1 §3 保持原行为 SSOT，§4 M4 写明 version/final/center；它没有授权修掉原
Native bug。当前 `acceptance-api-attachment-recipes.mjs` 新增
version-complete200 并依赖 `localVersionAttachment` 的期望，与上述原无
prepared-precondition
流的既有500不符。应按实际源证据形成精确输入纠偏，保留此次失败封包，不回写 G1
或旧运行结果。

最窄闭合是保留原 version-complete 请求及其500，逐端比较实际 session
状态/版本、无新 committed Attachment/copied-link、旧 latest/对象与 audit
边界；后续 final/versions/download 继续首附件的真实链。不得从 rolled-back
afterCreate 或 response/query ID 收养新版本。500
不自动证明这些副作用已相等，仍需 Root 的实际 full facts/SDK/PG 证据。

若 Root/C 需要本轮两版本消费链，既有选项是明确复用上述受审 K 的单行 prepared
precondition，或者 J 的声明式两版本 prepared
history。二者都需要本轮精确原行、guard、实际 mutation/direct COMMIT
和独立可见性；K 方案使用新的唯一 session/PUT，后续 complete
仍须本轮真实执行并取得 actual birth proof，不重用旧失败的 validating
session。前置不是天然业务成功，不得擅自加入、倒填现有
run，或去掉原无前置500负证。本调查只列来源，未实施任何选项。

本次 M4.2/M4.3 连锁失败不独立证明多个产品缺陷；需按各自实际缺失
binding/前置区分。Root 已纠正 M4.4 的观察为 local+OBS 共 key_prefix 导致
binder2，而非推断另建 fault-local：B 的具名 read-binding 可增加
provider_type/display_name/created_by/key_prefix 精确筛选，但不能用该筛选授予
ownership 或放宽不可变 intent。

所有 source/hash/精确锚点、历史读取级别和未打开原件的索引见同名 JSON。本报告仅
source investigation，非新 actual、G3 或修复完成结论。ZIP/K source01 继续冻结，C
已指出的 physical TTL 微秒精度待另一 source02 处理。
