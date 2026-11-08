84是未应用的Source13/G2候选，基于真实135/006224的operating_cost_source_missing409。请求/响应/ledger及两个完整139表快照的FS原件核验见evidence84.json：278个table pair、556个实际row文件逐hash，所有row/xmin、catalog/sequence/object均未变。它不重POST、不改pending、不补业务数据；已成功Expense/E/F/receiver G与失败Main G分别保留。

真实链为Main51d60c…的share aee83f…→basis e37f…→Receiver4d9e…的Cost c941…→Expense59072…。Cost/slot/Expense均真实version2，Expense已confirmed。G的Cost查询已载入共享来源Cost，但Expense仍走t.project_id=$1；context.cost_source_ref在构造allocationSourceMembers时因此找不到其catalog parent。不是PG缺Expense，也不能伪造/迁移源来过验收。

两个文件的最小改动：

- store.rs给Expense/Invoice/Payment/Payable四类source parent增加封闭的真实shared result→source snapshot→Cost.source_type/source_id查询分支。只导入精确source ID，不读取来源项目全部同类单据，不改Tax/default项目边界。rows和lock_family_rows共享同一predicate，因此现有按family/ID排序的锁也覆盖这些实际父行。
- context.rs在两个upstream-own-fact循环共用locally_registered_upstream判断：导入的foreign parent只能支撑真实份额来源，不能变成本项目未映射费用的公开投影/统计；本项目真实未映射事实仍保留原阻断。cost_source_ref、金额/税务/币种算法、financial projection、foreignTax必须unknown规则和所有producer/授权/事务代码不变。

三个产品内纯测试覆盖四种非labor来源的精确父ID解析/拒无关local记录、foreign parent不充当own unmapped且own blocker保留、SQL必须含实际share-FK链/具体source_type/精确source_id而不能整项目导入。隔离harness抽取精确候选predicate/local guard及当前Catalog/reference/hash/id/version实现，1.99.1编译并3/3运行通过；不是完整async产品编译、不是PG查询执行。初次harness缺json宏导入的失败原件保留，补harness模块导入后compile02通过；dead_code警告如实保留，未称clippy0。

Root仍须非作者审核、与83/65-02/period90显式按基线合并，进行完整Cargo/clippy/Native和真实新Source13准入。83原封不改。Tax Main的已知409须由Root做严格metadata-only对账；新源目录会改变expectedInputHash，因此后续必须真实fresh prep，只继续尚未提交的Main G，不重造已成功producer，不重POST旧c964…body。当前候选未预授Tax-only sweep；真实完整targetPreparations与经济变动条件仍须另审。作者未SQL/HTTP/Root产品或helper/Git修改，G3/G4未签。
