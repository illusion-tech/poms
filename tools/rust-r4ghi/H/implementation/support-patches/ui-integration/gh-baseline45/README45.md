GH03原失败、原真实201与完整ledger保留。这里提供只接续现有基线的独占工具候选，不重发baseline，也不改后端/Shared/SDK/Admin或任何业务数据。作者只做固定原件/源码FS和纯guard测试，未读取活动state或运行HTTP/SQL/GUI。

真实项目f9044951-dfa3-41ec-a655-66234697c672的UI采用基线ca89ca5c-b482-4155-a327-6e56d4a4ad1a已成功：007286原始UI response201 SHA810b686d…、007287 ownershipComplete ledger SHAc8d20711…；最后007288准备200 SHA6707cf03…选中该baseline/v1/hashcfbb…，唯一阻断是cost-classification-required。唯一cost48961077-26e6-462b-b936-ae057b1cc1c2/v2未分类；没有发snapshot/review。13obs中唯一业务写就是该baseline，不能再按fresh flow重放。

这是工具资格判断错误：G preparation.rs在有未分类成本时有意返回allowedCommandCodes=[]；G collector.rs:309先同TX apply输入costDecisions，再:378 build上下文。产品canSubmit:254-259也要求真实selected baseline、只允许它能用显式选择解决的待办，且每项include必须填理由/证据。H旧browser提前断allowed snapshot，旧policy.common同样误拦。候选仅对明确existingBaselineContinuation分支修复，不改变后端正式资格。

另一个后续会阻止真实分类的工具事实：Source12 context.rs:387-391只给allocation sourceMembers，direct cost的members为空。这不表示没有F阶段依据，也不能据此任意选同项目stage。新helper从007287真实after核cost.stage_derived_from_id→active CostStageAttributionSnapshot01e8c505-833e-4592-bdb4-5a8129beac44→真实governance evidence8fbde51c…的精确关系；该F依据同时必须在原及本轮fresh prepared的ready stage-evidence白名单中，同kind/id/rowVersion/payloadHash。UI只选择这条真实选项，不伪造members或把技术UUID当用户输入。

4个产品仅位于business工具：现有browser/policy/Linux三个精确候选 +新ui-gh-existing-baseline45.mjs。manifest列全before/after；Root等待Life02/其它driver结束后按其审阅流程提升，增加新helper后重捕完整图，不能中途改175图。新helper无top-level IO，不调用producer/ctx.own/ctx.persist，不生成proof或修改任何UI flags。

Root新run可取gh18-source12-04；把gh45.fragment.json整体替换cases/writeActions，其余prepare-input/source/build/paths/relay/cookieScope/actor index全部本轮实际生成。1351新candidate/process/registry仍由Root新full binding核；不能复用GH03旧actor index/cookie/plan。新action.existingBaselineContinuation明确固定baselineId、原201 response、原ledger及最后准备原件，Root无需手填threshold、财务事实或新来源。

运行时仍先沿原actualSpareRecord和consumer source桥核真实GH spare，loader核原complete201/actor/reason/requestId/精确目标/完整ledger。仅开始于已证明的baseline phase，API snapshot/create前每个真实before还必须核baseline/head/cost/F stage/evidence五行SHA+xmin与Root current owned.latest。fresh prepared必须仍无official snapshot、selected baseline原tuple不变、恰一项同cost待分类、blocking/formal blocking严格只有cost-classification-required，allowed仍为空；其他阻断、新/额外成本、已分类、旧基线或hash/version/row漂移一律停止。12个纯例覆盖这些反例。

新browser只读fresh snapshot preparation，真实填写include/理由并选那条F证据，然后真实click捕获，再按既有H08门槛执行两个真实review。Linux capture body仍逐项核inputVersion/assertions=null、fresh head/project/hash、成本完整覆盖、target ref/CAS、direct-source/actual-expense/理由/唯一真实F evidence，不接受省略待办或人工降低门槛。continuation phase拒再次activate baseline。正常fresh分支保持原语义，不能用本分支给别的项目或其它pending放行。

新run只把capture/signal-review/gate-review实际观察计入本轮writes；baselineCreatedInThisRun=false并输出旧baseline create/ledger pin。仅最后真实gate完成时才沿原recordActualUIReceipt更新四个真实观察字段，不预填flag、不清producer事实、不把GH03 failed改passed。旧baseline是真UI组，续验三个组必须由本轮真实DOM完成；纯例和语法不替代任何实际A08/G3。

检查：16固定证据/源码文件、5条精确关系row；12/12纯guard PASS；4候选语法exit0。没有运行续验GUI/HTTP/DB；Root current-owned及真实新响应仍待Root实际检查。完整诊断和五row pin在diagnosis45.json。运行命令仍原relay24(--plan/--approved-plan-sha/--approved-binding-sha/--execute)，workerKind gh18，不新增路由或业务入口。
