# 独立 DB93→94 精度负例 Root 执行候选 56

作者只编写/静态检查此候选，**没有执行任何mode、没有读private/密码/进程环境、没有启动服务或连接DB**。Root才执行。此前E20 legacy55真实事实已由Root完成，本工具不重造E20、不接触其Native53/31342或PID243693。

## 固定隔离边界

- parent仅验证当前poms-r4def自有PG15容器标签/base/volume、127.0.0.1:25433映射、服务端15432/version150012/isolated=on，以及Root实际r4def_control.marker。对主Rust DB的查询仅为read-only环境marker；不会查询/修改主两库业务事实。
- 唯一新库 `poms_r4def_legacy_probe56`、唯一新app role `poms_r4def_legacy_probe56_app`。prepare先要求这两个名字与新STATE均不存在，绝不复用/覆盖。
- 新state `/home/wangzishi/.local/share/poms-r4def-precision56`，秘密、身份/OID/marker、完整表图/DDL及HTTP原件只在其private下。Root执行时可读parent新namespace owner密码，用于环境建库/迁移/原seed；不会读r4abc/更旧private。JWT与app密码为本scope新随机秘密，不复用parent会话。
- 新Native端口31343，test launcher仅允许31343并钉127.0.0.1。复制的业务bundle必须main50 SHA256 `da0bc8804db5e5de3ee56f60d351238de604a2db709f3c0d2eaee76d5f7e0636`。launcher只改变测试监听地址，业务响应/代码不mock。
- 进程记录包含新namespace/instance/OID、PID/start ticks、实际wrapper及bundle hash。stop/negative/cleanup均校验，PID被复用就拒绝signal；不碰31341/31342其他进程。

数据库/role/schema及control marker的SQL是环境provision。POMS业务数据只来自原93 migration、原DatabaseSeeder和真实Native API；工具没有ad-hoc INSERT/UPDATE业务行，没有SQL修金额/状态，也不把失败改成成功。

## Root按模式执行

建议先守manifest中的源指纹，将候选导入/保全后逐条运行；本作者没有运行以下命令：

```bash
/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/precision56/probe56.mjs prepare

/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/precision56/probe56.mjs server start

/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/precision56/probe56.mjs exercise

/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/precision56/probe56.mjs negative

# Root确认原件保全/结果后，显式清理本次owned库与role。
/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/precision56/probe56.mjs cleanup
```

另有 `server status` / `server stop` / `status`，均只看本scope。prepare/exercise/negative有独占意图/回执文件，失败后不自动重试；应先由Root核原始回执、实际OID/行/进程，必要时新候选或明确恢复方案，不能删ledger重新跑伪造Pass。

### prepare

先核parent身份与Gate，再建立新role/DB，生成独立precision56_control.marker和OID。使用Root environment21相同有限迁移加载方式，仅应用**原始前93**（不自写旧schema），MikroORM保持transactional/allOrNothing/safe、ensureDatabase=false。随后调用Root public checkout中的原 `DatabaseSeeder` CLI，日志/owner env全部新private保全；不改Seeder或业务SQL。

必须读回ledger93、poms BASE TABLE=113、expense_record.amount_including_tax精确numeric precision15/scale4。才给app role本库poms表/sequence权限，保存prepared证据。app role无superuser/createdb/createrole/bypassrls。

### server start

重新核parent/probe marker、OID、93/113/15,4；31343必须空闲。main50原bundle复制到Root public `tmp/rust-r4def/precision56-runtime/`，仅test wrapper改变listen host；使依赖仍从Root已公开node_modules解析。app env显式绑定新DB/新app role/新JWT，stdout/stderr在新private，实际健康200后记录PID身份。新runtime目录也不覆盖旧文件。

### exercise

重新核自有Native进程、DB身份及15,4后，实际完成：

1. 原DatabaseSeeder的admin真实CSRF/login/current session；权限必须含真实contract:finance:manage。使用原seed测试凭据，不以SQL造user或role赋权。
2. 原customer API创建新客户（owner=实际session user ID），原project API创建真实项目。
3. 原dictionary API创建本probe独占expense category，再GET active列表确认；不是假定字符串天然有效。
4. 原expense API登记gross `10.123`、tax/net=null、recorded。必须真实201与实际ID；再独立PG读同ID/项目，仍15,4且 `amount_including_tax::text='10.1230'`。

若API拒绝、ORM/DB失败、类型不为15,4或真实值被量化，立即失败停止，**不能SQL补写、改金额/列scale或把其他行当此case**。Node当前entity scale18,2 metadata并不替代真实旧DB类型证明；此前53纯schema与DecimalType检查只说明路径可探，本模式实际201+PG文本才建立可用事实。

完整HTTP含Cookie/密码的原件只存新private，public仅保存状态/原件hash引用与明确synthetic见证。成功后保存113表原始行字符串和DDL，不把10.1230 parse成JS浮点后再声称原值保全。

### negative

只停本scope的31343进程，校PID/start/cmdline；确认退出后再取before94基线。此后不发认证/业务HTTP，避免lastSeen等真实写入干扰全表比较。

通过原完整94 migration list和原MikroORM全外层transaction执行up；前93已执行，仅94待执行。期望真实异常原文包含：

`R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite`

D部分DDL先于E guard进入事务，因此只跑E片段不能替代此测试。失败/关闭迁移pool后，只读取after94，要求：

- 同一真实expense整行及精确10.1230不变。
- 全113表集合、按C排序的每表to_jsonb原始字符串、行数及hash全不变，包括migration ledger仍93。
- columns/defaults/constraints/indexes/triggers/functions/enums/views/sequence DDL参数签名不变；不包含非DDL统计或序列last_value来混淆事务语义。
- D/F新增表、列、约束没有部分遗留；93/113/15,4校验仍过。

任何其他失败不能算precision guard，94意外成功也不算通过。所有异常/SQL日志原文保全新private，不自动round或删除见证再试。输出名为probeGuardRollbackVerified，不宣称R4业务完成、部署/性能/独立G3/G4通过。

### cleanup

Root显式执行后，只在新identity/OID/marker全匹配、own Native已停、库内无未知session时DROP本次固定新库，再核app role OID/非特权属性并DROP该固定role。没有FORCE、没有终止未知session、没有DROP OWNED、没有文件recursive delete。

完整private、public回执、runtime副本均保留。prepare若在identity/OID/marker完整建立前失败，cleanup会拒绝无证明的对象；Root需根据本scope provision intent/actual OID原件单独核证处理，不能按名称猜归属。

## 静态包与执行限制

manifest56记录源码/main50/原migrations/seeder的public pins、模式及SQL/路径审查结果；作者仅运行node --check及静态AST检查，**prepare/server/exercise/negative/cleanup/status全部not-run**。工具会在Root执行时读取新namespace秘密，不表示作者已读取它们。原legacy53/55、binary48、amendment44、attachments47等旧包不覆盖。
