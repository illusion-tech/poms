# 受控变更与再基线化真实浏览器候选 59

作者只编写候选、读取 public 源码/既有公共回执并做静态检查。**没有运行 root-run59、没有读 private/密码、没有启动浏览器/服务或连接 DB**。12 个阶段初始全部 `not-run`，由 Root 实际执行后才记录状态。

本包只新增到 E 工具目录，不修改 Root、产品、环境、旧证据。`flow59.mjs` 可安全 import；只创建计划时不调用任何注入回调。其业务命令全部由真实 DOM 按钮发出，没有 fetch、API request client、route fulfill、组件状态注入或 SQL。

Root导入权威为 **manifest59b.json**。首轮静态捕获 manifest59及当时原字节保留于static-source01；随后补了完整本人职责集合的断言，59b重新捕获，不覆盖首轮证据。两轮均未执行浏览器。

## 输入与构建

- 第一轮默认读取真实 `continuation48-result.json` 与 `ui-windows48/receipt45.json`，绑定其同项目、两合同和已 confirmed V1 的真实 handover ID。不会从旧 40/42 项目取事实。
- `buildEdition` 必填，实际目录为 `admin-build<buildEdition>/output/browser`。没有 build44 fallback。可传 `expectedBuildManifest` 守本次实际产物指纹；透明静态服务还会逐文件复核 build manifest。
- `sourceEdition` 默认48；`sourcePlatform` 默认windows。改动这两个参数必须有真正成功且相互匹配的公开 continuation/UI 回执，不能只替换 UUID。
- actor fixture 只在 Root 执行时读取本次 namespace 的 `actors33.json`；writer、approver、full、personA 均通过真实登录页面，在新 browser context 输入本 fixture 的真实凭据。权限和 user ID 从成功 session HTTP 回执核对，不信 fixture 里的权限声明。
- runtimeEdition 默认31，只读 Root 本次 `rust-api<runtimeEdition>-process.json` 作运行身份引用，后端固定实际31341。前端固定44451，与现 Rust CORS origin 相同；不会启动/停止 Rust API。
- Linux 沿 Root ui47 已有公开 browser pin 验可执行文件 SHA，将 font cache/config 放本次新 private；也可传另一个明确的公开 `browserPin`。Windows 沿 Root 已有受控 Chromium 路径与 SHA，fresh contexts。
- Root parent namespace 必须 `poms-r4def`、base756d、PG15 owned container/25433 的已记录身份。本浏览器包本身不连接 PG，不把读取 identity 元数据说成重新验了数据库。

## Root 执行示例

以下是命令说明，作者未执行。Root先导入本包、核 manifest 源指纹并完成本次真实 Angular build。`58` 仅示例，必须换成实际 build edition。

```bash
/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node \
  tools/rust-r4def/E/ui-amend59/root-run59.mjs \
  --buildEdition=58 --runEdition=59 --sourceEdition=48 \
  --sourcePlatform=windows --runtimeEdition=31
```

Windows对同一个项目不能重放原 V1 命令。若 Linux59 已真实完成，Windows fresh context 可消费它的实际 confirmed V2 回执，再合法执行该合同 V2→V3、D V2→V3：

```powershell
node tools/rust-r4def/E/ui-amend59/root-run59.mjs `
  --buildEdition=58 --runEdition=60 --sourceEdition=48 `
  --sourcePlatform=windows --runtimeEdition=31 --baselineRun=linux59
```

`baselineRun` 只接受 `linux数字` 或 `windows数字`，要求对应本包公共 receipt59 真正 complete、同 instance/project/contract、全3人确认且 R5 阻断；初始版本取其实际 final/activate 回执，再与当前页面读回严格比较。它不是 resume，不会跳过/重放失败阶段。每轮新 tag 仅改首节点名称。也可准备真正独立的同形上游项目后分别跑两个平台。

输出目录 `tmp/rust-r4def/root/ui-amend-<platform><runEdition>` 和新 private 子目录必须都不存在。中途任何失败均停下保全，不自动重试。若已收到真实写入成功但后续 UI 失败，Root应先核 HTTP 原件/当前事实，不能换 runEdition 再把整链盲重放。

## 实际主链与断言

1. writer 登录返回必须有 project:read、project:write、contract:finance:sensitive:read，且没有 contract:finance:manage。读当前 confirmed handover、3/3 人、R5 blocked、两合同 frozen materials。首跑必须确为48那条 V1；后续必须严格匹配真实 baselineRun。
2. 真实选择目标合同；从其 actual current readiness 读取可见 candidateTerms。只填变更原因和首 `input[name="node-label-0"]`，其余金额/日期/身份/节点数沿已读值。核真实 POST body 与原 terms（仅 label、UI既有 sortOrder/date normalization）完全相同，并绑定真实 current snapshot、contract rowVersion、原同 Active 商业来源。
3. 需要真实 `review-required/pending-review`，否则停止，不把 prompt/免审分支当作逐项审核成功。从当前 diff-history 的每个实际 fieldLabel 找唯一 checkbox，逐项勾选、填意见；核 POST reviewedFieldKeys/diffResultId/baseline CAS，不能以全选/猜字段代替。
4. writer 真实准备、提交。每个请求的 preparation/amendment/version 都与刚读到的来源比较；准备/审核未生效时，旧合同仍 active，currentSnapshotId不变。
5. 读取 actual currentApproverUserId，只在 fixture 中找到相同 UUID 后以该人的 fresh context 登录。再读 actual approval 确认本人确为当前审批人，点击批准；必要时最多8个真实当前节点，未知人立即停。不会指定 vp_owner 为必然审批人，也不使用 full 代批。
6. writer 真实生效，核真实 approval/preparation/amendment/beforeSnapshot/新 snapshot+完整 planVersion，snapshot版本加1。UI父视图刷新后选定合同与变更原因必须仍在；每步还核真实 candidateTerms，避免刷新丢表单却靠脚本补状态。
7. 从旧 summary 的该合同 snapshot/planVersion，准确找旧 handoverBasisItems 中的 contract、receivable 两条。按模板的真实 itemLabel（把合同UUID替换成合同编号）找唯一 DOM checkbox并勾选，核 POST 的 affected ID 集合恰好这两条。不会按页面第0/1项猜影响范围。
8. 再基线化产生新 handover/basis/summary/contractSummary/hash；当前版本加1。新 confirmation record 必须独立、0/3、每人 pending/confirmedAt=null。改合同冻结 snapshot 对应新版本，另一合同仍原snapshot；原技术来源 scope/risk/package/version 逐项相等。
9. full（sales+business）、personA（technical）、writer（execution）依次各自 fresh context 登录，读同一新冻结材料，点击“确认本人全部已指派职责”。实际请求必须锚新summary/basis与当前confirmation CAS，且不能有冒名participantId/userId；返回只增加1个真实人的确认数，其全部职责和真实confirmedAt可核。
10. writer再次 fresh context，读真实3/3后最终确认。核 confirmed、receipt mode frozen、`handover-confirmed-freeze-pending` 与 executionAdmission=false，页面显示提成角色冻结阻断。

真实按钮/输入选择器均从 Root 当前模板抓取；模板/route/status 漂移时应停下重新审候选。脚本不会通过 DOM 执行组件方法、写 signal、模拟 HTTP 成功、API代办本人确认或用 SQL 造业务事实。

主链会比对生效前后旧当前 handover 的冻结材料/确认历史不变，以及新材料中合同与 scope/risk 的真实关系。再基线化后没有可用旧详情 UI，所以本包不独立认证旧 persisted row 的最终历史不变，也不认证既有到账金额/计数不变。它会拒绝任何浏览器 receipt 写请求；完整历史保存与到账不重放使用 Root 已有真实 API/独立读证据，不把“没有点击到账”提升成该验收结论。

## 原件、状态与失败

复用 Root `ui-server45` 的透明代理：实际 Cookie/CSRF/请求体/响应原始 bytes 与 headers 全在本次新 private `http-originals`，公共 receipt 只有 method/path/status、原件文件引用/大小/SHA。final close 要求每个 proxy exchange 原件已保存且无代理错误。截图为本次真实页面并保存 SHA，不向公共JSON复制密码/HTTP headers/敏感响应 body。

公共 receipt59 保存实际 build manifest、输入 public pins、实际 runtime引用、每阶段 not-run/passed/failed、真实 command/status、个人登录ID/权限、截图与网络index。任一断言、pageerror、close/原件保全失败都使complete=false。作者的静态检查不产生这些真实回执。

## 可选 A→B→A 迟到附件失败（此包未实现、未运行）

先交付完整主链，故本轮 optionalLateAttachmentFailure 永远标 not-run，不计入12阶段完成数。Root可另起受控工具，复用当前 ui-server45 的 `afterResponse`：它只延迟真实上游响应的 end，不改 status/body/header。

建议 Root 独占环境下按以下顺序执行并保存原件：

- 用本次真实 current handover/附件 selection 表范围。Root只读保全准确原 ACL（含 grantor/grantee/privilege/grant option）；确认本次app role原本确有SELECT且没有继承/额外PUBLIC路径。临时REVOKE仅此真实app role的准确selection表SELECT，不动业务行/PG17/旧环境。若无法产生真实500就停止，不能proxy伪造。
- 只对实际 A 的对应附件GET且status=500设置一个一次性 afterResponse gate，保留真实上游原件；500已发生后准确恢复原 ACL并验证。finally必须兜底恢复，无论浏览器成功与否。
- 仍在同一个SPA与组件路由生命周期，使用真实 history.pushState+popstate导航到实际otherProject，再回A；不page.goto重建整个SPA来代替生命周期试验。浏览器history操作只影响实际路由，不改Angular组件数据。让新A附件读完成、记录当前错误文字与loading可见状态，再release旧500 end。
- 真实旧响应结束后，旧500不能覆盖新A的error/loading/附件内容；用真实DOM、各project请求id/状态和前后截图判断。只等待新请求而永远不release旧响应不能算通过；500原件、ACL恢复与旧response终结缺一均不认证。

现主链候选没有SQL、afterResponse延迟或故障权限，避免将这项未实跑的可选工作混入主链结果。
