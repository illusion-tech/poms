# 非空 K 附件真实生产候选 47

本候选只提供注入真实HTTP/二进制callback的驱动与说明，不调用服务/DB、不改Root/产品/环境、不读private。全部10阶段初始not-run。Root统一控制新namespace、执行顺序、原始回执、只读核证、清理及浏览器。

## 真实可用附件不需要SQL或扫描假状态

已交付Rust入口的真实链是 `AttachmentUploadSessionController_create` → `createUploadTarget` → `proxyUploadObject`(PUT raw bytes) → `complete` → `AttachmentController_get/link/markFinal`。

create校验真实category/目标授权，local默认provider无配置时走implicit local，uploadMode=proxy；PUT独立校验实际字节大小与声明checksum，写入真实local对象，记uploaded；complete以真实storage head检查大小后创建active Attachment和真实目标link、完成session。create-version通过同一链继承真实active links并生成新的UUID、同versionGroupId和连续versionNo/previousAttachmentId。

源码没有scanStatus/scan-verified/available杀毒生产协议。active是当前正式上传完成状态，不是可另行宣称的安全扫描结果；无需worker或内部service来伪造“扫描通过”。本驱动没有SQL写、对象目录预植字节、UPDATE状态或复用旧fixture。旧R2 scenario只作流程参考，包含故障SQL/旧环境逻辑，不能导入执行。

local对象根来自Root的新namespace `POMS_ATTACHMENT_LOCAL_ROOT`，公开环境脚本为 `/home/wangzishi/.local/share/poms-r4def/objects/rust`；Root负责真实env/marker及进程身份核证。驱动要求新的真实environment receipt、loopback31341，session实际回包local/proxy；若实际provider不是local就停止，不改provider SQL。

## Root注入接口

```js
import { createAttachmentAcceptance47 }
  from './tools/rust-r4def/E/attachments47/request-driver47.mjs';

const suite = createAttachmentAcceptance47({
  tag: freshTag16, projectId: actualProjectId, contractId: actualSameProjectActiveContractId,
  author: h.actor('full'), handoverOperator: h.actor('writer'),
  attachmentCategory: actualActiveDictionaryCode,
  environment: { namespace:'poms-r4def', apiOrigin:'http://127.0.0.1:31341',
    instanceId: actualRootMarker, receiptId: actualEnvironmentReceiptId },
}, {
  request: h.request, // 既有JSON callback: {status,body,receiptId,requestId?}
  async binaryRequest(operationId, id, bodyBytes, actor, meta) {
    // Root新adapter：实际HTTP，复用此actor真实cookie/CSRF/Origin。
    // PUT: bodyBytes为Uint8Array，meta.contentType=application/octet-stream。
    // GET: bodyBytes=null，读取实际ArrayBuffer；绝不JSON.stringify二进制。
    return await rootActualAuthenticatedBinaryHTTP(operationId,id,bodyBytes,actor,meta);
    // PUT返回{status,body:真实JSON上传ACK,receiptId,requestId?}
    // GET返回{status,bytes:Uint8Array,receiptId,requestId?}。
  },
  async observeBasis(basisId, actor, meta) {
    // 可选；Root只读核真实project_handover_basis_snapshot及新namespace身份。
    return await rootReadOnlyActualBasisReceipt(basisId,actor,meta);
    // {body:真实snake_case PG行,receiptId}。
  },
  resolveParticipant: id => actualLoggedInActorById(id),
});
const initial = suite.manifest(); // 10 not-run，0HTTP/PG断言通过
const result = await suite.runAll();
```

Root现有h.request会JSON编码body，不能拿它直接发送Uint8Array或读取binary；必须补上述真实binaryRequest adapter。PUT用官方octet-stream传输，附件mimeType仍text/plain；createUploadTarget返回的相对session URL必须与实际PUT相同。Root保存原始字节/头/状态码/会话身份及receipt，不打印cookie/CSRF。作者不会启动或访问31341。

author须有真实目标read/write、附件操作及confidential读取授权，示例full已有适用财务敏感读；write权限本身不代替敏感读取。每次D确认仍用其本人实际session，resolver返回id必须匹配指派人。新namespace guard/marker属于Root真实环境证据，不由候选填一个字面值冒充核证。

## 不混淆final与latest

K和D都以真实final版本优先；D的attachment material source按active→final→latest→version排序。因此：

- v1已final时，仅上传尚未final的v2，当前承接权威仍是v1，D hash应保持不变。这是验收正例，不能为了“新版本”口号改成任意latest优先。
- 将不同内容的真实v2正式markFinal后，v1 final被清除，当前材料UUID/版本/checksum切到v2，D sourcehash必须变化，旧摘要上的本人确认409。
- void当前v2后，其真实状态失效，source切回仍有效v1，D hash再次改变；v2摘要上的后续本人确认409。恢复时正式markFinal v1并新prepare，所有人员重新本人确认后再finalize，不修改旧basis/hash/confirmation假装回滚。

本候选对“内容变化改变hash”的范围是**实际被选为当前承接权威的版本**。向磁盘偷偷覆盖已上传对象不是受控内容变更API，本候选不做，也不靠SQL改checksum。

## 10阶段与独立字节见证

1. capture当前真实项目/生效合同/移交职责，不猜销售/执行归属；应在Root完成amendment44后串行执行，不能与同项目合同再基线化并发。
2. normal v1从contract目标正式上传，complete自动生成contract link，再通过link API建立直接active project link，标final。
3. confidential v1同样真实上传/direct project link/markFinal；普通移交包始终默认排除，包括full具有读取权限时。
4. 正式Dprepare非空材料，读取真实basis核checksum/version/security/included，再有一位实际参与人本人确认v1。
5. 两次真实K refresh产生非空selection，必须normal included/selectionReason=final、sensitive-excluded；项目和合同sourceRefs都来自真实link。refresh及下载包/下载计数等metadata不得改变Dsourcehash或使sourceChanged=true。confirmedSensitiveExclusion=false负例400，再显式true创建ready包；实际下载ZIP须只有manifest和指定normal文件、内容checksum相符且无sensitive文件字节。
6. 真实create-version上传不同v2但不final，v1仍final，D hash稳定。
7. v2 markFinal后D hash变，旧v1本人确认409。
8. 新Dprepare捕获v2，新confirmation全部pending，不继承旧1人同意；再由1人真实确认v2。
9. void真实选中v2后source变化，剩余人旧摘要确认409，计数不能增加。
10. 正式恢复v1为final、新prepare及全部本人确认，最终confirmed且R5 executionAdmission仍false，不留下假confirmed旧材料。

固定UTF-8见证在WITNESSES47中公开冻结，期望值不从生产实现/回包求出：

- normal1：39 bytes，SHA256 `7e092953bfd0e46ebf7b1f895b7ad2c7fb000ea717d406ec4cfe751e6ece5347`。
- normal2：39 bytes，SHA256 `d6ab532cef7e99ddcd4b774d1b4a5720e43066dec08310f5e21b7a09e3ff4075`。
- confidential：45 bytes，SHA256 `4415216e5f805a9fc152e79a23e1b20210afdce1952b3f356db87f2075d8b97b`。

不只信声明checksum：每次complete后都通过真实AttachmentController_download取得对象字节，与固定size/hash再次比较。ZIP解析只读内存中的实际central directory（stored/deflate），不落盘、不使用生产zip实现求预期。ZIP内normal文件的SHA必须同独立见证；manifest只含一个指定normal attachment；sensitive排除记录可在manifestSummary中保留其ID/原因，不等于有敏感文件内容。

## 只读basis核证与计数

公开D detail不返回完整附件materials；仅看到sourcehash不能宣称已核真实冻结内容。observeBasis由Root只读查询真实basisId，返回source_payload/payload_hash/source_hash等snake_case行，保留真实PG回执与namespace guard。驱动核payload完整hash、从project/salesOwner/members/materials重建的sourcehash，以及normal与confidential的真实attachmentId/versionGroupId/version/contentHash/security/included。没有hook时observation保持needs-evidence，HTTP成功单独计数，整体completed不会为true。

没有任何available/scan verified/included业务SQL producer。initial全部not-run；static import/语法/当前spec路由核对只标静态，不能计真实K/上传/D验收通过。对象与package都是实际API产物，ownedAttachments仅是辅助UUID/version/checksum列表；完整归属、精确清理和原始对象字节保存由Root统一按全回执核对，候选不递归删文件、不触碰旧private。
