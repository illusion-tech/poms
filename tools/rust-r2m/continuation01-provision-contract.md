# continuation01：固定 clone provision

本源码只准备原授权 Stage R2M 的不同名新 pair。它等待 C 源审及 Root 的公开逐次
admission；没有实际环境、DB、HTTP、browser 或 G3/G4 通过声明。旧 Rust quarantine
CLI 由 Root 独占，本脚本只从 postgres 读旧库精确元数据，不连接或修改旧失败图。

固定环境：`poms_r2m_c01_nest` / `poms_r2m_c01_rust`，lowrole
`poms_r2m_c01_app`，marker `abd093b8-c584-45b3-9c62-6357ad6dfa5d`，control
schema `r2m_c01_control`。state 为
`/home/wangzishi/.local/share/poms-r2m-continuation01`，private/目录 0700、文件
0600；两端 env 和 objects 分根。新 JWT 和 app password 随机生成，不读旧 env。

原 Native OID16385、107/1778/207、seed 行集 SHA951d4d4c…、原 baseline6c2b95… 和
an4c 正常恢复 ea1312… 都来自 Root 的公开 template admission7f2a2d…；实际
provision 仍重新核对 source marker/OID/编码/locale/ACL/完整107及 clone
前零连接。postgres 和业务库均严格原
`poms.r0e_isolated=on`；`poms.r2m.isolated=null` 不是隔离依据。原业务 DB
无数据库级设置，本脚本不对任何 DB 增加 GUC。

在不同名库 clone 之后，只在新库创建新 marker/来源字段、撤销旧 app 与 PUBLIC
的权限、赋新 lowrole 原运行期 DML/USAGE/CONNECT 权限；新角色不继承、无
super/create/bypass/replication/membership/marker 访问。旧两库 ACL、原 Native
行集、旧 Rust 名称/OID17085/allowconn=false 均实际复核；新 lowrole 无旧 DB
许可。whole DB 是新隔离测试资源，不把 clone 的 107 表当 fixture owned
行。fixture 的原 62 表/原生证书/逐行清理另由实际新 variant 入口负责。

同一 PG 集群的 owner 仍为 `poms_r0e_owner`。Root
已明确授权唯一维护凭据来源：仅固定旧新-M
`private/owner-password`，严格父目录、非 symlink、same-fd/no-follow、64
字节读；再 wx0600 写入新 private/owner-password。原文件前后 hash
相等。除此之外不复制旧 private/env、失败图或业务凭据；只读的精确原 baseline
是校验 clone 源的证据，不是被认领的新数据。旧 plan1aae 原件保留，此有限补充见
addendum。

Root 公开 admission 形状：

```js
{
  kind: 'Root-R2M-continuation01-clone-provision-admission', rootAuthorized: true,
  environmentId: 'r2m-continuation01',
  planRawSha256: '1aae7a0653968797e5b21dc9fa9e045e13ccb249d6a582c19c90d3bf8e38c2bb',
  marker: 'abd093b8-c584-45b3-9c62-6357ad6dfa5d',
  writersStopped: true, sourceNormalRecoveryCompleted: true, oldRustGraphQuarantined: true,
  sourceDatabase: /* template-admission01.database 原完整九字段 */, // OID16385
  sourceRowsSha256: '951d4d4c5ca3e4faa9a005d093c3714e6181c0068c94cd0bd34a75b6f118a22f',
  sourceRecovery: /* template-admission01.recovery 原 file/bytes/hash */,
  quarantine: {
    file: 'tmp/rust-r2m/m5-original-rust-quarantine01.json',
    rawBytesSha256: 'e722a471ec3062a32e06c0010b4e09d0bbede21e8613da365668bb7f1d07190b',
  },
  sourceReview: { file: 'docs/design/rust-r2m/<C-provision-review>.json', rawBytesSha256 },
}
```

```sh
node tools/rust-r2m/continuation01-provision.mjs --check
node tools/rust-r2m/continuation01-provision.mjs --provision \
  --approval docs/design/rust-r2m/<Root-admission>.json \
  --cap tmp/rust-r2m/<current-source-cap>.json
```

`--check` 只读公开原件。实际只 Root 在固定 Linux checkout/Node24.19、无 ambient
DB/process 覆盖、五端口空闲后运行。source review 必须精确 pin
profile/common/provision 三件；新运行 variant 可另外审，不与 provision 等待。新
root、role 或 DB 任一已存在便拒绝，不自动
adopt/resume/drop/reset；全部命名部分结果与原错误保存在新 private journal。独立
owner/client 关闭和维护锁释放失败也保原诊断并拒绝成功。输出固定
`tmp/rust-r2m-continuation01/provision01.json`，不是业务验收通过。
