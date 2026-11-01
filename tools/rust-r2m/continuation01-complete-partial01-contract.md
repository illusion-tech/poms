# continuation01 首次已知 partial 的固定续建

此入口只接 Source01 的原 partial：role `poms_r2m_c01_app` OID27136、新 Nest
OID27137 已创建，Rust 名称仍不存在。原 `provision01.json`（654 B /
ea4f1a79…）、原 private journal（2618 B / 13a1a1ce…）、原 Source01 与 C review
均保留，不重跑原 provision，不 drop/reset/adopt 任意资源。

权限检查的修正是 SQL 显式
`CASE WHEN schema AND relkind THEN has_*_privilege ELSE false END`。`WHERE relkind`
不能用来保证先过滤函数实参。本入口在 fresh RO 阶段复核已有 Nest
的完整107、marker、616 product ACL、schema/default ACL、role
OID/设置/实际密码登录和无旧 app 许可；公开 metadata7dd971… 未证明的
schema/default/role-setting/env/object absence，均由入口重新读取。

原创建 journal 先严格 no-follow/hash/length 读取并 wx
保全。沿其真实创建链读取现存三个密钥文件，逐个校原
ref/hash；不重新生成或覆盖。只有全部前置通过才 wx Nest env、创建仍不存在的
objects 根；不重放已提交的 Nest marker/ACL 事务。之后仅从原 Native16385、107
seed951d… 的零连接模板创建缺失 Rust，使用原 policy，所有权限查询采用
CASE。完成前 source、新 Nest、新 Rust 独立完整107必须相等，旧
Rust17085保持隔离，原 journal/原失败回执字节相同，所有客户端和维护锁真实关闭。

固定公开输入为 `tmp/rust-r2m-continuation01/partial-inspection01.json`（108643 B
/ 7dd97182…）。原失败仍标失败；新状态逐步写新
`provision-resume01-frame-NNNN.json`，不回写原 journal。输出为新的
`tmp/rust-r2m-continuation01/provision-resume01.json`，它只表明资源续建完成，不是业务或
G3/G4 通过。

Root 新逐次 admission：

```js
{
  kind: 'Root-R2M-fixed-continuation01-partial-completion-admission', rootAuthorized: true,
  environmentId: 'r2m-continuation01', roleOid: '27136', nestOid: '27137',
  originalJournalSha256: '13a1a1ce5c06394247e7c452647be7f36267ca633026709c83fb9a9b150fba5c',
  partialMetadataSha256: '7dd971825b15d894b7d4c5452b881eaaa4a44c78e4761eedab5593ad581481b2',
  rustDatabaseBeforeAbsentRequired: true, secretsRegenerated: false,
  sourceReview: { file: 'docs/design/rust-r2m/<C-fixed-completion-review>.json', rawBytesSha256 },
}
```

```sh
node tools/rust-r2m/continuation01-complete-partial01.mjs --check
node tools/rust-r2m/continuation01-complete-partial01.mjs --complete \
  --approval docs/design/rust-r2m/<Root-fixed-admission>.json \
  --cap tmp/rust-r2m/<fresh-cap>.json
```

仅 Root 执行实际命令；A 仅公开源码与 Fake 测试。C 必须精确 pin 新 helper 与原
profile/common/provision
四件。未知资源、状态、权限、key/hash、连接或文件均保留并停止，不扩大为通用
resume。
