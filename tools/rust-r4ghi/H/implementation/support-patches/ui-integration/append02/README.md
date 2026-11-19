这是针对封存 UI candidate01 的三文件 additive 跟进，不修改 candidate01 或其 manifest。Root 应先校验 candidate01SHA，再用本目录完整 proposed 文件覆盖这三项；也可从 candidate01 的 Root 原始基线一次性应用合并结果，不能把 append02 基线误当已晋升产品。

IR05-01 已修：内部 TaskRow 的 conditionId 仍是真实子记录 ID，生成 client 调用使用 `{id: conditionId, completionRecordId, closeProjectCompletionConditionRequest}`。真实双 ID 上传选择态/R2 Session context、无伪 rowVersion 的证据选择保持不变。

EO 可用性改为直接消费同次 FullProjectDetailView 的 required nullable executionAdmissionContext。浏览器只检查当前阶段/真实 stage ID 一致和 project:write 能力，Start 提交沿用同 detail.projectRowVersion；它不自行推导角色 ID/version/hash，不依赖 commission 权限、Role GET 或角色权重。服务器对非 EO 或未就绪链给 null，页面保持不可推进。Role 页维持原独立权限和原读接口。

check-facts02 使用实际130 canonical候选的虚拟 overlay，24项纯请求组装/静态调用边界单元断言通过，不是 HTTP、Actor 授权或数据库验收。尚待 Root S5 真实 SDK 才能对生成方法/枚举/完整Angular app做精确编译；不能将先前旧 SDK 13诊断当作已通过。旧来源、旧诊断、旧20项结果全部保持封存。
