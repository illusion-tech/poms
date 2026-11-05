# Root api-harness 二进制候选 48

基于Root当前 `tools/rust-r4def/api-harness32.mjs` 原字节制作完整候选，导入前置SHA256为 `870d3d5a2c73c973ea21aa2aa1566245cad6a6c8e1deb881cbb78c2596381b73`。Root应核对该hash再受控导入；若原件更新，应新建候选重新合并，不能覆盖本原件/证据。

原 `request/login/actorState/safe/actor/persist` 和现有全部构造逻辑保持原文；fresh login的 `actor.cookies={}`、JSON请求meta.csrf omit/wrong测试开关、现有cookie收集、JSON回执保存均保留。只增加createHash导入、闭包内binaryRequest，以及返回对象中的同名函数。

## 对接 attachments47

```js
const h = createApiHarness(); // Root才在真实环境中调用；本作者未调用
const suite = createAttachmentAcceptance47(actualContext, {
  request: h.request,
  binaryRequest: h.binaryRequest,
  resolveParticipant: actualLoggedInActorById,
  observeBasis: rootActualReadOnlyBasisReceipt,
});
```

签名严格为 `binaryRequest(operationId,id,bodyBytes,actor,meta={})`，与attachments47 invoke的5参数一致；闭包函数不依赖this，无须bind。

支持的实际operation只有：

- AttachmentUploadSessionController_proxyUploadObject：当前spec必须PUT并声明application/octet-stream，body必须Uint8Array（Buffer亦可）。实际发送原bytes，设置真实请求Content-Type=application/octet-stream，不JSON编码、不base64代替。
- AttachmentController_download：当前spec必须GET，body必须null/undefined，返回实际下载字节。
- AttachmentHandoverController_downloadPackage：同样GET，返回实际ZIP响应字节。

每次从当前operations map取method/template，填真实路径参数，并校meta.path/meta.method；实际URL限制为原owned API origin31341，redirect=manual。不会用meta绕到另一host，也不根据预期状态伪造201/204/200。meta.contentType只允许PUT octet-stream；GET不新增请求Content-Type。

cookie只来自同一private actorState，响应Set-Cookie按原逻辑更新同一jar并persist。PUT使用同一jar中的真实CSRF；meta.csrf只接受undefined/omit/wrong，分别对应真实cookie、故意省略和固定非法测试token，不能传入自造token；meta.headers/cookie/authorization不作为注入入口。fresh login清空后binary也看到同一个新jar。

返回对象：

```js
{
  status: actualResponse.status,
  body: actualParsedPutAckOrJsonErrorOrNull,
  bytes: actualFetchBodyUint8Array,
  headers: actualNonAuthHeaders,
  contentType: actualContentTypeOrNull,
  receiptId: actualPublicIndexReference,
  requestId: actualSentRequestId,
}
```

headers仅返回确实存在的content-type/content-length/content-disposition/cache-control/etag/last-modified/content-encoding/x-request-id，不返回Set-Cookie或认证头；不补默认MIME。PUT的body是实际响应UTF8/JSON解析，GET的JSON错误亦可解析，其他二进制不强行转文字。失败状态如400/401/403原样返回，driver自己断言；transport/read失败保存原件后抛带receiptId/requestId/实际已收到status或null的错误，不伪造HTTP响应。

## 原件与公开索引

binary复用同一个state.sequence，使用相同requestId格式和公开receipt编号；在网络前persist保留序号，失败尝试也不会被下一进程重用。JSON路径仍按原逻辑工作，不改旧回执。父目录guard限定新namespace private，不接受symlink/重定向路径，edition限定ASCII短键，文件wx/0600，binary目录0700。

实际原件一律保存在新 `/home/wangzishi/.local/share/poms-r4def/private/binary-api<edition>/`：请求配置/headers、请求body、完整响应headers（含Set-Cookie）、响应body，以及如有的失败原文。响应流按实际chunk写入，关闭后读取已保存文件计算真实hash/大小；中途失败保留已收到的部分并标responseComplete=false。原件不保存到public tmp。

公开索引仅有operation/method/path、actor id/key、requestId、实际status/完整性、query hash/count、body hash/字节数、header count和private原件引用/hash/count；没有cookie、CSRF、密码、headers值、request/response payload、错误message/stack。对外共享索引前仍应按Root证据制度管理这些引用。

字节边界如实标为**配置的请求body及WHATWG Fetch交付的响应body**；它不是TCP/HTTP传输层抓包。请求声明Accept-Encoding=identity，若服务仍编码，实际content-encoding在原件/返回中保留，Fetch可能已解码body，不能把这误称原始压缩wire bytes。附件/ZIP witness核对使用实际交付的文件内容字节。

## 静态检查边界

作者只运行node语法检查及AST/当前spec参数核对，未调用createApiHarness、未读取private、未登录/请求网络、未生成任何HTTP成功回执。manifest记录Root原件、候选和attachments47的精确hash，以及原有函数/声明未变、3个operation/method匹配、5参数签名和公开索引字段白名单。真实cookie/CSRF拒绝、PUT落盘/GET字节/ZIP、失败原件保全由Root统一运行；不能把静态检查计作这些验收通过。
