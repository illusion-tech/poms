# E20 真实旧 Native 协议来源候选 53

先完成最小闭环：Root新namespace的Native31342用**实际旧协议API**创建缺币种input invoice并正式PATCH verified；Rust31341对同DB94的真实source执行E映射422；独立PG只读核证来源未被改写且无cost mapping。本作者未启动Native/访问HTTP/连接DB/读private，不用SQL写业务行，不宣称新Rust producer允许缺币种创建。

## 当前build50为什么可以尝试此路线

本目录pure-schema-check53.json使用公开 `dist/apps/poms-api/main.js.map` 中的**确切冻结源码**，只执行纯schema，不import main.js、不bootstrap Nest/ORM：

- 当前CreateInvoiceRecordRequest DTO的currencyCode是optional，缺省时Zod不生成一个undefined的currency key。
- FrozenNativeReference CreateInvoiceRecordRequest没有currency字段；旧四字段body通过其真实parseFrozenNativeReference，PATCH status=verified/expectedVersion通过。
- 反过来Native旧shape带currencyCode会被真实parseFrozenNativeReference拒绝501，不能给Native悄悄扩新协议。
- Native实际ContractFinanceController先使用此冻结parser，再调用旧createInvoice服务。该服务只写project/contract/type/no/amount/date等旧字段，没有currencyCode/source/snapshot setter。
- build50的InvoiceRecord ORM entity与当前DB94新增三列一致，三项均nullable、无应用默认币种。migration94 check明确允许三NULL；旧服务未设置的nullable字段被省略/写NULL均可落入这个分支，不能因此猜CNY。上述是源码/纯schema兼容证据，**真实INSERT是否成功仍由Root实际HTTP+PG回执确认**。

旧协议在本次真实生产的是“缺证明来源”，不声称它是多年前已有行。不得使用SQL把新Rust invoice的currency改NULL，也不得把一个任意UUID叫legacy。金额固定106.00、input、无contract；不需要借项目默认币种或合同推导。由真实API产生的invoiceId、rowVersion/状态必须一路复用。

## 调用方式与真实actor

```js
import { createLegacyInvoiceAcceptance53 }
  from './tools/rust-r4def/E/legacy53/request-driver53.mjs';

const suite = createLegacyInvoiceAcceptance53({
  tag: freshTag24, projectId: actualProjectId,
  nativeActor: actualNativeLoggedInFinanceActor,
  rustActor: actualRustLoggedInFinanceActor,
  environment: { namespace:'poms-r4def', database:'poms_r4def_rust',
    migrationCount:94, instanceId: actualMarker,
    nativeOrigin:'http://127.0.0.1:31342', rustOrigin:'http://127.0.0.1:31341',
    receiptId: actualEnvironmentReceiptId,
    nativeBuild50ReceiptId: actualPinnedNativeBinaryReceiptId,
    nativeLoopbackLauncherReceiptId: actualLauncherProofReceiptId },
}, {
  nativeRequest: rootActualNative31342Request,
  rustRequest: h.request,
  observeInvoice: rootActualReadOnlyInvoiceProof,
});
const initial = suite.manifest(); // 6阶段not-run，0HTTP通过
const result = await suite.runAll();
```

两个callback均用现有5参数 `(operationId,id,body,actor,meta)`，返回真实 `{status,body,receiptId,requestId?}`。Native必须发往31342，不能把h.request固定31341当作Native成功；Rust消费固定31341。Root为Native真实login建立独立actor/cookie jar，确认实际user id与`contract:finance:manage`，不伪造ResolvedSession。共用Rust DB94并不等于可未经核证随意复用另一服务cookie/CSRF。Root保存原始登录/请求回执，公开不发布Cookie/CSRF/密码。

创建payload仅：`invoiceType=input, invoiceNumber=R4DEF53-<tag>-OLD-NATIVE, invoiceAmount=106.00, invoiceDate=2026-11-04`。省略contractId和currencyCode；正式PATCH `{status:'verified',expectedVersion:<实际version>}`。Rust随后仅发 `{costType:'invoice',invoiceRecordId:<真实ID>,expectedSourceVersion:<实际verified version>,costDescription:<说明>}`。不把currency/source字段塞进E联合DTO。

Rust结果必须是真实422且说明currency proof问题，不能以source未verified/权限/版本等其他错误替代。错误不应回显106.00。整个结果producerClassification明确是**冻结Native旧协议→新Rust拒绝**；不记录任何“新Rust缺币种create成功”。

## 独立PG proof接口

observeInvoice签名 `(invoiceId,actor,{namespace,projectId,instanceId,readOnly,phase})` 返回 `{body,receiptId}`，body为：

```js
{
  identity: { namespace:'poms-r4def', instanceId: actualMarker,
    database:'poms_r4def_rust', migrationCount:94,
    principal: actualObservedPGPrincipal },
  invoice: actualSnakeCaseInvoiceRow, // invoice_amount显式::text，invoice_date::text
  currentMappings: actualCurrentMappingRows,
}
```

SQL只读规范见E20-read-only-proof.sql，Root分别在映射前后执行；必须核实际DB/role/port/isolation/marker和94 ledger，invoice UUID/project/number/type/verified/version/date与HTTP绑定，invoice_amount='106.00'，contract_id和currency_code/currency_source/currency_source_snapshot_id全部真实NULL，当前mapping为空。三列定义nullable/check的查询也作为独立原件保留。前后invoice整行及version不变；不能把HTTP summary省略字段当作PG NULL证明。

没有hook则两次observation均needs-evidence，即使HTTP422也不能整体completed。结果在真正PG-before证明存在时才输出E21LegacyBinding，供Root将真实旧invoice绑定到E21-20；其receiptId来自独立PG证明，不是静态脚本伪造的历史标签。

Root已知原Native `main.ts` 仅 `app.listen(port)`，HOST变量不绑定loopback。应继续由Root单写**test launcher**只对31342钉127.0.0.1、保存实际socket/PID/二进制hash证据，不能改生产main或业务响应。本候选不含启动/monkeypatch代码，也未执行main。

## 历史10.123精度probe：独立93库，不能在94造历史

本轮纯schema证据确认：冻结expense请求和当前expense DTO都仍允许字符串10.123；Node服务仅正数/非负数/税层一致性校验，并将原input.amountIncludingTax交repository.create，没有在create路径format到分。实际安装MikroORM DecimalType.convertToDatabaseValue('10.123')纯调用返回原字符串；scale影响的compareValues格式化不等于把INSERT输入改成10.12。

因此**静态上存在**在独立旧DB93 numeric(15,4)列通过真实旧Native API写10.123→10.1230的路径，但这里没有实跑，不能提前宣称旧DB已存超精度。当前DB94 numeric(18,2)写该值可能被数据库量化，绝不能拿它当migration94 guard的历史负例。

Root可选后续流程（本候选不建库/不跑迁移）：

1. 新probe namespace/DB只应用原93 migrations，原始113张poms base tables，真实seed/角色/项目/category都通过受控原producer准备；保存DB identity/OID、实际expense列numeric precision15/scale4、93 ledger、DDL及113表全图证据。不能克隆出10.123的SQL业务行，也不能改列scale/金额来迎合测试。
2. 在该probe运行原Native reference API，使用expensePrecisionProbeRequest53纯factory得到createExpense请求（gross10.123、net/tax为null，合法category/真实project）；保存实际201/ID。必须独立PG读同ID的amount_including_tax::text确为10.1230、原列仍15,4，再确认超分币报告包含该真实行。API若400/501、ORM/DB失败或实际变10.12，应把路线记不可用/未证明并停止，不能SQL补写或把其他行冒称此case。
3. 在插入该真实行**之后**、尝试94之前保存原值、全部113表的确定排序原始行/计数/hash、schema columns/constraints/indexes/triggers/defaults的DDL签名、93 ledger。Root可先确认原seed没有其他guard异常，避免错认报错原因。
4. 只用正式migration94和其原MikroORM transactional/allOrNothing执行器。E preflight的确切报错应为 `R4E legacy excess-scale/capacity money requires controlled review; no automatic rewrite`。D部分DDL可能在E guard之前进入事务，所以必须依赖**整个94外层事务回滚**，不得只执行E SQL片段便宣称完整迁移回滚。
5. 失败后独立只读证明10.1230及其他业务原行完全不变、113表集合/DDL签名/ledger仍93，D/F新增表/列/约束没有部分遗留。不自动round、不删除见证行重新跑来伪造Pass，不触及本批主Rust DB94。

提供的是factory/验收规范，precision migration实跑仍not-run。纯schema通过不是数据库能存、不是迁移拒绝或回滚已通过；Root须分别计证据。
