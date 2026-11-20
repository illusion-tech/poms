GH02失败已通过真实固定原件定位到工具漏操作，不需要改产品。作者只读该结束 run 的 receipt、10条 GET/ledger、saved DOM/page.png 和实际产品源码；没读活动 state，没发送HTTP/SQL，也没启动浏览器。

`page.png` 实际显示“采用正式估算基线”已经选中；DOM末尾也已渲染禁用的“采用正式基线”按钮。因此不能把失败称为select未change。产品 `project-operating-authoring.ts:268-275` 的 changeIntent只更新intent/selectionAnchor/decisions，真正 prepareRequested.emit 位于 reload():286-300，模板:70提供明确“读取编制依据”。旧browser:10在selectOption后直接wait baseline GET；后面切回snapshot-create也有同一个漏操作。

唯一产品候选是工具 `tools/rust-r4ghi/business/ui-gh18-browser.mjs`，before6808936a24e498470cd4a259edf426dc854ee8d6869842de99bc6ddedaaaf329 → after45a75f042e989ff4de2fb975e019107fe0a61ddc13a92d8c0ab4472a745687bd，完整文件在proposed，最小diff在gh43.diff。两处均先严格断言同组件唯一编制任务select、真实toHaveValue，然后真实点击唯一exact“读取编制依据”；保留原canonical operation/同project/query等待，并新增返回preparation.intent必须与本次选择一致。没有直接调用API、evaluate改DOM、拦截或伪造响应；没有放宽原policy或使用旧preparation。

Root实际GH02 `receipt18-06.json` status=failed；10个browser requests全GET，10个proxy exchanges都200，10个observer ledger ownershipComplete/blockers=[]。唯一unified-accounting是最初snapshot-create&snapshotMode=realtime，baseline-activation尚未请求，四个G/H业务写均未发。认证GET可能正常touch session，不能把“0domainPOST”写成“0DB mutation”。原GH02和所有原始cookie/HTTP/ledger保留，不标passed。

现可沿同一未消费GH spare新建gh18-source12-03（或Root批准的新名称），不再运行原02目录，也不重做005103/005115真实setup。先等待当前Root frozen-role/lifecycle driver结束，再exact提升唯一工具文件、刷新175-helper的完整字节图/cumulative关系、613code+430dist的实际闭包、新plan与1351真实actor/cookie proof并复审，然后Root实际GUI。本补丁不变Source12/406/M97/backend/shared/SDK/产品，不能在现活动driver中途替换helper。若新真实G基线、capture或H08前置仍失败，应留真实partial再诊断，不能把本次工具语法检查当G/H实际通过。

build43.mjs实际FS核17个来源文件（含10ledger）并产候选；Node24.19 `--check` exit0。没有新增模拟业务响应测试，未声称修后实际DOM成功；A08/G3/G4均未认证。完整源pin清单在diagnosis43.json，供Root非作者审阅/按原字节提升。
