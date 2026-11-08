# GH04与代理raw原件补充审计162

**仅补充Source12事实与验收准备；G3/G4未审、未签，正式Rust240 / 新认证0 / R4 67/95不变。** `manifest161.json`及其所封原件保持不变。本件关闭161在封存时明确列出的代理raw文件定位/读取缺口，不改写161当时的结论。

本轮只读Root新授权的GH04及其它已完成run固定FS原件，写入仅在本专属目录。未读活state、当前176helper或dist图，未执行SQL/HTTP/浏览器、Root/产品命令或停启资源。176helper是Root交接值，不是406产品输入的计数，也未被本审重新测量。

## 代理raw缺口已补齐

- 固定根为`//wsl.localhost/Debian/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/<uiRun>/http/`；文件名与expected SHA/bytes严格取各sealed receipt的`exchanges[].privateRaw`，未扫描其它run。
- 独立核8轮共**192**份raw文件：Role03=14、Expense02=40、cold frozen01=12、GH02=10、Life01=13、GH03=13、Life02=66、GH04=24。
- 每份原始文件SHA/size、request method/path（保留路由结构与query keys）、response status/complete、Base64响应body的实际长度与SHA、observer/ledger链接均匹配。原始headers/cookie及完整解码业务body不输出或复制到审件。
- 其中9次属于本批32入口的现代写入，原始request的`inputVersion`均为`server-derived-v1`。附件12步及E/F4写为支持producer/界面证据，不增加32项，也不当成新增Rust交付。独立peer409仍是161的另一条公开HTTP竞态链，不混入192份浏览器raw计数。
- GH02、Life01、GH03保持`failed`；raw HTTP成功不更改整个case失败。成功subset的`allA08FormsPassed=false`保留，失败回执缺失的顶层字段也不补成true；case中原false保留。

可复核的固定文件读取脚本为`audit-proxy-raw162.ps1`，执行结果和全部192份原件pin见`raw-readback162.json`。该脚本只读固定文件并计算/比较，不加载Root helper。

## GH03到GH04的精确续验

GH04 receipt SHA256为`66c3bb8bde03a443304f6fedb89082383b47f39c9762a2dd94912516ca54b00e`；case/result SHA为`9a582537d7ee0ed3efe8151e051220d596f33d4a9bebc1133088b749f3242d8e`。回执为`passed-bound-cases-only`、24 observers，即21GET200、1POST201及2POST200；24个ledger和7份private case文件均按pin核，ledger全部ownershipComplete/0 blocker/`responseStatusIsAcceptance=false`。

- 基线仍为GH03已提交的`ca89ca5c-b482-4155-a327-6e56d4a4ad1a`。续验引用的007286 response SHA `810b686d...`、007287 ledger SHA `c8d20711...`已核；response的body与GH03原proxy body逐字节一致。GH04的`baselineCreatedInThisRun=false`与实际**0 baseline POST**相符，原GH03不改passed。
- Snapshot POST201实际生成`73d2f88c-3d55-4713-b4bf-31c8d6b06af6`，使用上述baseline v1、`snapshotMode=realtime`、`periodKey=null`。请求包含一项明确include分类及非空reason，target为`ProjectActualCostRecord/48961077-26e6-462b-b936-ae057b1cc1c2` v2，并引用`CostStageAttributionSnapshot/01e8c505-833e-4592-bdb4-5a8129beac44` v1。该项分类及reason的事实按上述实际target与F引用登记。
- Signal review POST200产生`0fe0daf4-ec94-4235-9444-48042091b941`，evaluation为`2eacbe7d-81d7-4a0b-89f8-66a3a80154a2`，rowVersion由1到2并返回四阶段effective binding IDs。
- Gate review POST200产生`b0b9b63f-951d-4cc2-afe1-94aef1cf0768`；实际first-stage binding `98a00658-a68d-4d39-b3a1-8e6b9e12c3a5`返回`bindingAction=block`、`businessStatusAfter=blocked`。
- H08的实际feedback/evaluation/gate response均锚定同一snapshot73d2、snapshotRowVersion1、sourceHash `817ad1827c4e5279ec49c629de71b6da26a3bb9c6995f7754b0a975eea607848`。Review前后sourceHash不变，evaluationHash按overlay变化；这支持本条trace的frozen-context事实。`actualFrozenH08=true`不表示已完成期间关账；内部`evaluationContext.certification=verified`也不表示正式G3/G4或新增交付。

上述实际写入仍绑定Source12 / 同406输入 / binary`de8eaaf6...` / 物理candidate007133 / M97 / 每库139表。它不是Source13或M98实际验收；本补件不泛化为全11条H规则、全部金额/税边界或完整重述闭包已认证。

## 跨run明确覆盖与仍有的停止线

| 已独立读取的固定run | 本轮可明确引用的界面边界 |
| --- | --- |
| Role03 + cold frozen01 | 真实freeze与独立公开peer409；另run真实current/detail冷开，业务version1/rowVersion2/4成员/零理由。Role03没有post-freeze current/detail，Role02仍failed |
| Expense02 | 真实expense create/confirm、source-only E cost、F stage attribution四写 |
| GH03 → GH04 | 保留基线201；精确续验实际分类+snapshot201、signal review200、first-stage gate review200及固定H08读取 |
| Life02 | 三份实际附件各4步正常上传，startAcceptance200/finalAcceptance201/completion201/archive201；不重放startExecution，不要求Role GET |

此表是本审查人已读取的跨run事实索引。Creator/Own/其它边界仍按各自原件与既有独立审查结果进入最终固定包；Root报告六UIguard齐备不等于本件读取活state或合成全体A08=true。

`operation-status162.json`仍逐项保留32个精确operationId；本次有限补件累计观察到20个不同入口（含peer负控），**不是完整性或交付分母**，其它历史证据未列入不等于从未发生。Source13证据槽及统一候选结论仍为空，原失败和subset字段均不重标。

剩余正式Gate输入仍包括：实际Source13审批/产品与完整source/helper pins/运行候选，正常双库M98 UP及strict schema3三段准入、M97原baseline保护，TaxRef-only与真实跨项目source闭包/全必要写入族/FI回滚与并发，以及自然期末正向201。当前realtime snapshot不替代最早香港2026-11-09 00:00 / 东京01:00后的真实关账；历史首次预算选包仍待用户裁决。

最终checks、保全/owned cleanup（canonical M98不得当fixture删除）、fresh no-op、精确commit/main/S4事实、归档、线上readback及独立G3/实际G4仍待固定统一候选。当前不放行main/部署/切流，不关闭未满足条件的Issue，#115独立CLOSED保留。
