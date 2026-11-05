# K55 候选交付边界

本包只准备纠偏设计，未实现产品；Root/Gate 冻结后才另给三文件实现准入。原 K54/独立53/Block55/F46/F44 及全部实际证据均不改。

- `PROPOSAL55.md` 是详细事务、字节、并发及遗留边界。
- `proposal55.json` 是精确三文件/method/锁序/字段级proof/提交与补偿契约。
- `vectors55.json` 有32条待实际执行的验收向量，含两项独立Gate反例、同size迟到PUT、完整关联集、一次retry、必要write故障、commit未知及旧D final保护。
- `readback55.sql` 是10个SELECT模板；附注才说明锁内使用方式，没有执行任何SQL。
- `inputs/` 保存Root三源/Block55原字节和现catalog的附件元数据子集，没有业务row或凭据。
- `seal55.py` 只读取已知源码/本包及封存F清单，验证hash、常量、字段集及声明边界；成功输出`checks/offline-receipt55.json`和不可覆盖manifest。它不是产品测试或数据库验收工具。

相对K54新增的必需条件为：实际有界读取后把同buffer写到原runtime的新UUID/nonce final key；锁内重读完整active-link tuples；所有Link/flag writer统一group协议；撤位实体只early写一次；明确KnownNotCommitted/Unknown；abort在成功终态audit后才清理staging。全历史max版本号、遗留已引用staging拒绝、原runtime路由证明及单连接池无自等待也明确列入。

Root实际回放须由真实API生产Session/Attachment/Link/flags及业务状态，不能SQL造有效源。并发用可观察barrier；不能用sleep或自写模型的成功响应冒充实际完成。必要写故障可在Root授权后对owned测试ID唯一命名trigger注入，保留原始失败/撤障/一次fresh retry结果。故障回滚基线区分已独立提交的eager auth touch与本Tx deferred pending flush。

S3模式需要单独真实PUT/下载证据；本地通过不能外推。新final命名不等于S3 WORM；旧已签发legacy staging URL及提交后管理员迁移不在本三文件支持修复的认证范围。提交未知仍保留final，即使一次只读探测没看到row也不得删除。

运行静态封存：在本WT用`python tools/rust-r4def/F/K55/seal55.py`。脚本只允许在K55目录写新文件，已有不同比特的封存文件会拒绝覆盖。全部实际HTTP/PG/对象I/O/并发/fault/S3验收状态仍为not-run。
