108-02 仅关闭非作者 review87 的 IR87-01：原108只比较 direction='up' 与两个相同 argv，两个原件一起写成 migration:down 仍可通过。原108、48项原回归和失败历史不修改；原108不得用于 mint。本目录提供108+02的最终完整组合，Root可以按组合清单直接应用，不需要先把存在P2的108装进运行图。

Root 已物化但未执行的唯一程序化入口为 tools/rust-r4ghi/migrate-frozen-parent98-136.mjs，已审原 SHA29e195b4e80c6089387d66e384eb7b7eef28f5c58cf047a7ce87726e6cc0e5e1。02不会 import、spawn 或执行该文件；只核它的完整字节。其源码已锁定 Node24.19.0、固定argv/namespace/两ownedDB、owner/OID/PG15/139表、97→98唯一pending、SQL90b/TSdaf、G2审批、无API/driver/app连接、execArgv=[]且无NODE_OPTIONS/NODE_PATH，并且唯一调用为 orm.migrator.up({migrations:[完整TARGET]})。这些实际入口规则不由receipt的direction标签代替。

本次修改只有原108组合中的context、schema-comparison和其测试，以及新增migration-command136.mjs。其它8份108候选逐字保持。context的directFiles另加入136入口与docs/design/rust-r4ghi/source13-g2-freeze136.json。当前真实Root审批文件尚未成立；缺文件时真实准入必须拒绝。该文件属于未来新source图，不能往旧Source12证据重贴标签。

单DB wrapper必须来自Root真实运行结果，kind为captured-fixed-programmatic-M98-command136。argv逐项等于：

```text
[
  /home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node,
  /mnt/e/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/migrate-frozen-parent98-136.mjs,
  --database,
  poms_r4ghi_native 或 poms_r4ghi_rust,
  --execute
]
```

每个wrapper的runner/node/approval对象直接复制136实际intent/execution中的二字段pin，不扩加旧模板的namespace/marker/host/port/owner，也不自行补onlyMigration字段。正常实际字段是migrationName。runner必须是固定源pin；Node实际字节与固定绝对路径及G2审批相等；审批必须真实G2Authorized且保持其预迁移actualM98Applied=false原件，不把它当迁移后的状态回执。两个数据库必须使用同一个runner/node/approval pin。

Root执行后的精确映射如下。

- intent取private/migration98-136/<DB>/intent.json，验证kind=Root-fixed-only-up-M98-command136-intent及完整direction/database/migrationName/argv/runner/node/approval/migratorMethod/up-only-options/from/to。
- executionReceipt取同目录execution.json，验证kind=actual-fixed-only-up-M98-command136、与intent公共字段完全相同，pendingBefore和applied都仅TARGET、executedAfter=98、exitCode=0。
- stdout/stderr保留真实子进程捕获原件pin。wrapper.exitCode必须来自真实process完成；stdout必须是136唯一成功JSON，completed=true/database/up/TARGET/migrations98，且execution指向同一execution.json及其实际SHA。stderr原字节保留，工具不丢弃它，也不假称为空。
- wrapper的migrationName固定完整Migration20261108090000_rust_frozen_assignment_parent_lock。Root正常Migrator执行已由非作者review88核MikroORM7.0.11的pending/applied实际完整文件名形状；不限制成MikroORM CLI，不接受自由direction参数。

approval-shape108-02.json只是明确字段形状，G2Authorized=false、Node与98个实际migration input pins及所有Source13/过程/迁移/retention/registry字段未填；不可运行，也不写Root。migrationTS.file、migrationSQL.file指定Root Linux绝对路径，raw hash分别固定daf/90b；inputs使用实际98个迁移相对路径+原字节hash，并与真实目录及文件字节一一一致。此约束在真正执行前明确，不等实际M98提交后才猜字段。

原108双基线/同OID同header批准body/97原迁移行与xmin/单登记/实际单nextval/其余138业务及Native身份/objects/原owned/borrowed/fixture/10→11→12出生与published11证明/G4双基线规则全部保持。02不修改历史选包，也不把API133/134/135旧通过记作新的Source13认证。真正新source/count/binary/process/迁移收据/retention/registry全部等待Root实证。

纯测试把受保护Root/私有绝对路径映射到本测试worker内的虚拟文件系统；源码blob仍逐字核29e/90b/daf，Root97旧迁移只读，G2与Node字节是明确的合成测试输入。写方法禁止写真实Root/P路径；所有实际测试文件只在I目录的TMPDIR。不会创建真实审批、启动136、ORM.init、SQL或HTTP。这些测试不作为实际producer或M98通过证据。原48个subtest名称全部保留，另测同值DOWN+UP标签、错程序/runner/DB/迁移/options、intent漂移、pending/applied/count、stdout指针、缺G2、源码或Node字节变化、审批机制变动等反例。

最终Node24实际67/67（原48+19新增）通过，12份候选语法、help及19文件静态import图通过，Root/候选字节稳定。02首轮合成fixture生成器误用了JS replacement-string，令SQL的$$缩成$，先失败并引起后续虚拟FS恢复串联失败；attempt01日志原封保留。现用函数replacement、真实90b/daf hash断言及afterEach恢复修正，仅测试生成器/fixture受影响，未弱化production reader、未执行任何SQL。

Root最终仍需非作者复核、完成并封存Source12、正常前向M98、新产品检查与真实Source13 pin、真实metadata-only准入。作者只封候选；不执行任何Root操作。
