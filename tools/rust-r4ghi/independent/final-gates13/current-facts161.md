# Source12 恢复与已完成界面事实审计161

**准备审查继续；G3/G4 未审、未签，正式 Rust240 / 本批新认证0 / R4 67/95不变。** 本件更新原 `preparation13.md` 的时间点进展，原准备审件及manifest13原字节不改。Source13/M98未应用；535通过的未应用组合验证不变成实际验收。

本轮仅直接FS读取Root指定的已封报告、回执、snapshot、行文件和DOM原件；只写本专属目录。未读mutable state、当前175helper或dist图，未发SQL/HTTP/浏览器请求，未停启资源，也未执行Root或产品命令。`audit-fixed-recovery161.ps1`只读取固定文件、计算哈希和比较，不加载Root helper。

## 进程恢复：同Source12，不同物理进程

- `process1351-recovery161-actual.json` SHA256 `b1078370ddb2516239676d75b2773fe553bb7df7e365ecd264703f7a695e46d6`及其指定原件已核。
- 旧135记录仍为PID108720/startTime4977486/startedAt2026-11-07T19:40:53.492Z，原字节SHA `a42333c7...`。新1351记录PID11616/startTime446482/startedAt2026-11-08T09:38:25.556Z，SHA `fd81b926...`。本件核的是固定记录，不是当前liveness探测；旧135自然正常退出的原因来自Root交接，不据旧记录推断。
- 两个candidate的完整产品source array相等且实际长度406，source SHA仍`5263ad89...`；binary仍`de8eaaf6...`，M97/每库139表。新candidate007133 SHA `1dde0fda...`；overlay registry007134 SHA `05985940...`。原schema2 registry `3ed7bd38...`不改、不冒称schema3。
- 147的before/after inspect原件显示同一container ID `51392561...`、同名volume `poms-r4ghi-pg15-data`、同挂载位置，running由false变true；没有数据库restore。新overlay的businessWrites与HTTPRequests均0；它不重标旧135证据、不重置baseline。
- 独立核5份sealed snapshots及1390个表文件引用，共1402个唯一固定文件哈希。147/148两个fresh和1351两个startup分别对齐Expense02末快照：两库各139表的count/PK/columns/raw bytes/logical rows、全部metadata（含normative目录、权限/函数/触发器等及sequence）、captured object manifests均相等；M97登记均97。原冻结state.baseline与schema2.originalBaseline相等。详见`recovery-readback161.json`。
- 该守恒结论止于**后续新认证/界面请求前的恢复与startup区间**。之后的合法角色读取、G基线、附件和I业务写入有各自ledger；不能说当前整库仍与Expense02末快照无变化。对象结论是固定快照所捕获manifest的等价，不是对当前活对象目录的新探测。

## 已封界面与并发：保留真实标签

| 固定轮次 | 独立核对的实际事实 | 边界 |
| --- | --- | --- |
| Role03 | receipt SHA `4a63f6c2...`；13GET200 + 1freeze POST200；freeze response007026 SHA `ec1c4621...`，ledger007033 SHA `286ca044...` | 原135；current/detail GET均在freeze前，freeze后只有Project GET，不补称post-freeze current/detail |
| public peer23 | proof007034 SHA `c6ee4804...`，合法现代revised-create409，code `commission_frozen_change_requires_dispute`；独立first/second pg等待原件显示freeze18614→control18755、peer18615→freeze18614；control最终ROLLBACK/closed | 独立公开HTTP链，**不是Role03的14条浏览器tape之一**；不是parentless SQL探针，也不是M98父触发器新认证 |
| cold frozen01 | receipt SHA `75a4afd4...`；12GET200/0业务POST；actual-frozen-role38 SHA `57277c09...`及HTML SHA `5da7ed23...` | 新1351；业务`version=1`、`rowVersion=2`、frozen、4 members、零权重理由；页面“分配版本1 · 已冻结”。不称业务版本2；`role03PostReadsClaimed=false`，原Role02仍failed |
| Expense02 | receipt SHA `e5af97c6...`；36GET200 + 3POST201 + 1POST200；真实expense create/confirm、source-only E cost、F stage attribution四写 | 原135，A04/A08支持来源；不作为本批32中的额外交付，既有成功POST不重发 |
| GH02 | receipt SHA `f999ef43...`；10GET200/0业务POST；failed，原日志为waitForResponse 90000ms timeout | 手动reload纠偏由H43/A99另行承接；原failed不改passed |
| Lifecycle01 | receipt SHA `897264da...`；13GET200/0业务POST；failed，5000ms按钮disabled断言 | close后的observer含三个canonical list GET200；case早失败不抹掉已完成GET，也不当作生命周期写成功 |
| GH03 | receipt SHA `cd59d801...`；12GET200 + 1baseline POST201，baseline `ca89ca5c-b482-4155-a327-6e56d4a4ad1a`；failed | 后续`assert(prepared.allowedCommandCodes.includes('snapshot-create'))`失败，无snapshot POST。保留已提交基线，后续精确续验；不重发baseline，不放行G/H整体 |
| Lifecycle02 | receipt SHA `14a66bdd...`；66 observers：50GET200 + 6POST201 + 7POST200 + 3PUT200；case/result SHA `b3a64ad4...`，四表单bound case passed | 三份真实附件各4步正常上传；startAcceptance200、finalAcceptance201、completion201、archive201。无RoleAssignment GET、无startExecution重放；所有A08全体仍未通过 |

Lifecycle02真实目标：stage `62e55eab-ea7d-4204-9d20-cd2434935aba`、acceptance `9acecc1c-11f4-437c-9794-943f409d8334`、completion `1280ca75-3895-476c-ae2b-191a6f6c7081`、archive `b0970ac6-e9f8-40ac-b220-b25bcc70b355`。两项时间输入来自实际backend Date（2026-11-08T10:18:05Z / 10:18:21Z），不是调时钟或回填。最小E权限为project read/write来自Root交接；本件独立核tape没有Role GET，不以该事实单独证明全部授权守卫。

7轮UI的168个ledger及54份private case原件共222文件全部按回执pin核对。ledger均ownershipComplete、0 blocker、`responseStatusIsAcceptance=false`；这恰说明ledger归属完整不等于正式验收。GET可产生必要auth/audit写，表内“0业务POST”不等于零数据库写。Role/Expense/Life的bound case passed也不等于联合A08或G3通过。

代理`http-xxxx.json`本体的固定目录仍待Root补充。本件已核回执exchange表、ledger、DOM/结果文件及freeze/peer专项response/request原件，不把其余代理raw本体宣称为已独立读取。该限制也列为正式统一G3原件复核的输入缺口。

## 32入口与Gate剩余缺口

`operation-status161.json`保留32个精确operationId，并将本轮Source12事实逐项挂接。它仅说明本轮读取到哪些历史结果；没列出的历史证据不等于从未发生。所有统一候选结果仍为null，G3/G4仍false。E/F四写及附件四个操作族只作为真实producer/界面支持，不能混入32或把重复HTTP计成Rust交付。

1. Source13正式G2审批、实际M98双库正常UP链、strict schema3三段比较、M97原baseline保护、新binary/process/candidate/完整source/helper图与registry，仍待Root固定统一候选。Source12的同source进程恢复不替代这些证据。
2. 65-02/90/83/84纠偏的真实业务影响和完整必要写入族/FI同body重试、事务整体回滚、全影响闭包与必要race仍须按最终候选复核。安全锁父/永ROLLBACK的I58五项23514、旧Role create200与Role02 failed分别保留；禁用parentless探针不重试。
3. GH03仅基线提交；snapshot preparation的分类缺口及后续G/H界面须按保留事实精确续验。不能自动补分类/剪裁目标、重放旧成功POST或把旧failed轮次改passed。H11规则边界、mask/audit、金额/税/known0/null/成熟度、全32 HTTP及A01–A08整体仍需固定证据包和逐文件影响说明。
4. Life02补足该Source12执行项目的四个真实界面动作；own-condition-only、同/不同task CAS、conditional conclusion、archive replace/void、跨父/跨项目等其它要求仍各据自己的固定原件，不因本轮final accepted路径而豁免。EO原startExecution200不重放。
5. 原135、1351、Source10/11/12各出生/保全/原件与读者版本分开。旧证据只按精确依赖影响引用，不重标Source13实测；原失败/partial/ignored/stopped/unsupported标签保留。
6. 自然期末仍最早香港2026-11-09 00:00 / 东京01:00（2026-11-08T16:00Z）后，按实际服务端日期及真实来源资格验本周期末201。历史首次预算自动选包仍待用户，不能默认选择；不调时钟/伪造来源。
7. 最终固定输入检查、实际运行/保全/owned cleanup（canonical M98不入fixture删除）、两次fresh no-op、精确commit/main/S4事实、archive、线上readback与独立G3/实际G4尚未完成。当前不放行main/部署/切流，不关闭#57/#101/#110/#111/#112/#113/#114/#116/#117，#115独立CLOSED保持。
