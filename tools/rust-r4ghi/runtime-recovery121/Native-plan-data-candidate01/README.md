# Runtime121 Native plan 纯数据候选

只封源码，未运行生成器、Native/helper、ctx、API/SQLHTTP或进程；未写Root/P。未来真实API complete和composition complete均必须由Root注入，空模板在首次写入前拒绝。

options严格四键，见 `input.null.json`。Root未来用真实pin填充后保存为新input，再调用：

```text
node prepare-native-plan121.mjs --input <absolute> --input-sha <sha256> --input-bytes <n> --execute
```

仅具名接受05/06两个同schema composition kind，后续Root实际使用真实06；API input.composition、helperPin、实际284与该composition须全一致。I tooling manifest从实际components[0].manifest取得，限定原I9路径/真实独立review/当前图，不固定I05哈希，也不将af8冒作06。

Native plan严格12top/base18/current13/composition3/stateTransfer3/tooling2/outputs3。base18原值保留；current从实际API input.current删除baseNormalEnv，添加原apiProcess/readiness pin，binaryFiles取真实API record的Stat6并以当前lstat size/dev/ino/nlink复核，保API绑定的hash；这里不声称重新hash ELF，Native inspect仍独立执行完整guard。原API record/env pin不改、不读env内容。

Actor仅从真实expectedState验证字节解析sorted keys；输出actorKeys和clearCookies/clearPermissions:true，不复制任何Actor值或cookie/password。expectedOwnership opaque核同值。tooling.executionSources只用实际composition的当前284，两键规范化、逐Root字节重新核验；不存在expected替actual。

新nonce输出目录固定 `P/runtime121-native-plan-data/<nonce>`，只wx plan/request/complete。Native自己的registry/candidate/receiptDirectory仅检查缺席，绝不创建。request的scope、inspect、独立exact审与Root批准均null；生成数据不授Native/G2或FS state publication。失败保partial且不覆盖旧件。stdout只返回metadata pin，错误固定非密文案。当前仅Node语法检查，不声称真实API或生成正例通过。
