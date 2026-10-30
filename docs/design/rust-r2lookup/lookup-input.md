# RUST-ROUTE-LOOKUP 作者 B 输入候选

状态：**G1Candidate，未 GatePass，不授权产品实施**。本件覆盖 #61 剩余两个业务号 lookup 的裁决与必要直接切换，工程子 issue 为 [#84](https://github.com/illusion-tech/poms/issues/84)，native parent 为 #61；联合工程边界由 Root baseline 冻结。源基线为 `02b8956759352b2612bec5980cbe55ae77d0293f`，分支为 `codex/poms-r2l-lookup`。lookup 为 **0 个新增 R2 operation**，不迁移 Rust R3/R4 项目、合同全域。

作者为本轮新建 `/root/lookup_impl`；Root 派发目标为 `gpt-6.1-sol / max`，实际配置回执由 Root 保管，Fast 未核实。本候选替代旧复用上下文的 partial 草稿，旧稿原字节保存在 `tmp/rust-r2l/preconfigured-drafts/`；不把旧稿的作者配置或未执行边界追认为本轮通过。

本轮仅编辑本文件与 `lookup-sources.json`。Root 独占在线 G0、联合 baseline、ADR/canonical 设计层、共享 `shared-contracts.ts`、完整 spec/client、生成 baseline、永久 checkpoint、环境及最终证据。正式非作者审查和 Root G1 冻结前，B 不改产品、canonical、ADR、spec、client、数据库、环境、Git 或 GitHub 状态。

## 1. 原实现与资源身份

- `ProjectController_getByCode`：`GET /api/projects/code/{projectNo}`；`project:read`；`ProjectService.findByNo` → `ProjectRepository.findOne({ projectNo })`。未命中抛 `NotFoundException`，消息保留 `Project no ${projectNo} not found`；成功使用原 `mapProjectToSummary`，返回 `ProjectDto / ProjectSummary`，不是 UUID 查询的 `ProjectDetailView`。
- `ContractController_getByNo`：`GET /api/contracts/no/{contractNo}`；`project:read`；`ContractService.findByNo` → `ContractRepository.findOne({ contractNo })`。未命中消息保留 `Contract no ${contractNo} not found`；成功并行读取真实 project/current snapshot，返回原 `ContractDetailViewDto / ContractDetailView`，继续敏感字段裁剪。
- predicate 均是原字符串精确等值，不 trim、改大小写、模糊匹配、尝试 UUID 或调用编号生成服务。lookup 不退化为列表、重定向、`findById` 或固定 fixture 响应。
- `ProjectSchema.id`、`ContractSchema.id` 仍为 UUID 主键；`projectNo`、`contractNo` 均为唯一 `varchar(64)`。Project 的 `project_code → project_no` 及唯一约束改名来自 `Migration20260426113000_ex35a_business_number_generation.ts`；Contract 唯一约束来自 `Migration20260322233000_init_contract.ts`。
- 业务编号正式基线规定生成后不可修改、创建时由后端事务生成。当前 create/update DTO 没有系统编号写入；服务只更新独立的 `customerProjectNo`、`customerContractNo` 等外部字段。唯一性和不可修改性使编号可作 lookup predicate，不赋予第二个 canonical item identity。
- UUID item identity 继续为 `/projects/{id}`、`/contracts/{id}`。两 lookup 都是原有独立能力，不能因合同 DTO 与 UUID 查询相同而静默删除，也不能把项目 Summary 换成 Detail。

原 controller/service、DTO、相关共享 schema、敏感投影/审计链、生成工具本轮已重新读取；源指纹见 JSON。指纹只认证输入字节，不等于 runtime 验收，也不把无关方法指纹误写成逐分支实测。

## 2. URI 与提交 Root 的 ADR 有限补充

唯一候选为 `GET /projects:lookup?projectNo={exact-value}` 与 `GET /contracts:lookup?contractNo={exact-value}`。canonical path 字段分别登记 `GET /projects:lookup`、`GET /contracts:lookup`，不含 query 模板或 `/api`；实际部署 wire 带 `/api`。返回对象的 UUID `id` 仍引用原 item URI，不创建持久 lookup 资源。

ADR-015 §4.1/§4.2 规定 item identity 与投影，§4.3.4 **只明确 POST custom command**，原文没有 GET custom query 条文，不能声称候选已经获旧 ADR 明文授权。Root 负责在 §4.2 补有限只读 custom query 解释并经联合 G1 独审；本作者建议边界如下：

> 已存在的、按唯一业务编号精确解析单个既有 UUID 资源的只读查询，若集合 GET 已承担列表且不能同时保留单对象/404 与原 operationId，允许显式登记 `GET /resources:lookup?businessNo=...`。该例外不形成 item identity，不改业务状态，不替代普通列表过滤，不自动扩展任意 GET 动词；必须冻结 predicate、返回投影、错误、权限、敏感审计与直接切换方案。

“不改业务状态”保留原 session touch、权限拒绝安全事件和敏感投影安全事件，不解释为数据库绝对零写入。Root 的正式 ADR/canonical 文本才是实施 authority，本段仅为作者输入。

不合并到现 `GET /projects` / `GET /contracts`：二者现为集合查询、数组响应；OpenAPI 一个 method/path 只有一个 operation，不能在同一位置保留两原 operationId、单对象及未命中 404。`view` 不解决 predicate 与 identity 区别；POST 查找会改变 safe-method/CSRF 语义，当前没有必要。

原 canonical `getProjectByCode`、`getContractByNumber` 两行处于 `lookup-identity-undecided / canonical-decision-pending`；Root 将 URI、query、DTO、错误、审计、controller 形状和同步方案一起冻结。遵循 ADR-015 §4.5 直接切换，不保留旧 alias；当前未发现必须登记 alias 的不可控外部调用方或发布顺序阻塞证据。

## 3. 最小 controller、模块与 DTO 绑定

锁定来源为 Nest 12.0.1、Express 5.2.1、router 2.2.0、path-to-regexp 8.4.2。原 `@Controller('projects')` / `@Controller('contracts')` 配 `@Get(':lookup')` 会由 `RoutePathFactory.appendToAllIfDefined` 加斜线拼接，不能得到 collection-colon URI。

最小变更是在原两个 controller 文件各新增 root-scoped 类，保持文件私有 mapper 原样并复用，不全量修改原 controller prefix，也不复制映射：

```ts
@ApiTags('project')
@ApiCookieAuth('pomsSession')
@Controller()
export class ProjectLookupController {
    // 仅注入 ProjectService
    @Get('projects\\:lookup')
    @HasPermissions('project:read')
    @ApiOperation({ operationId: 'ProjectController_getByCode', summary: '按项目编码获取项目详情' })
    @ApiOkResponse({ type: ProjectDto })
    async getByCode(@Query() query: ProjectLookupQueryDto): Promise<ProjectSummary> {
        // 原 findByNo / 404 / mapProjectToSummary，predicate 为 query.projectNo
    }
}
```

合同对应 `ContractLookupController`、`@Get('contracts\\:lookup')`、`ContractLookupQueryDto`、方法 `getByNo`，显式 `operationId: 'ContractController_getByNo'`；保原 summary/tag/security/200 DTO。只注入 ContractService、ProjectService、ContractTermSnapshotRepository、SensitiveFieldProjectionService，保留 `@Request() req` 和原读取/映射顺序。

各 module 的 controllers 数组显式注册新类；从原 controller 移除两个旧 handler，不能继承/复制出双暴露。Swagger 默认 operationId 来自 controller 类名与 method，新类必须显式保留原值，完整导出证实每值只出现一次。literal-colon escaping、注册和完整 HTTP 匹配同属实施验收边界。

Root 独占 `shared-contracts.ts` 的两个 schema 和 infer type；B 在原 `project.dto.ts`、`contract.dto.ts` 各加一个 `createZodDto` class。现 `libs/api/contracts/src/index.ts` 已 wildcard 导出这两文件，无需新 barrel。schema 候选：

```ts
export const ProjectLookupQuerySchema = z.object({ projectNo: z.string().min(1) }).meta({ id: 'ProjectLookupQuery' });
export const ContractLookupQuerySchema = z.object({ contractNo: z.string().min(1) }).meta({ id: 'ContractLookupQuery' });
```

绑定为 `@Query() query: ConcreteLookupQueryDto`，由现全局 ZodValidationPipe 根据具体 metatype 执行 `schema.parse`。裸 `@Query('projectNo') projectNo: string` 的 TS 声明不会拒绝 array/object，不能替代 DTO 验证。不新增 service/repository、mapper export 或数据库变更。

## 4. Query transport 的具体候选语义

已读 Express 默认 `query parser = simple` 与 `compileQueryParser → node:querystring.parse`，当前 bootstrap 未覆盖。采用该 parser，不另写解码器，不 trim/casefold/NFC/NFKC/coerce/补前缀/拆逗号，不加 UUID/格式正则/`.max(64)`；列长不是原 lookup 参数校验上限。以下是待 G1 冻结的 adapter 行为，当前未声称 HTTP 已执行：

1. 缺参、`?projectNo`、`?projectNo=`（合同同理）→现 ZodValidationException 400 `Validation failed`，含原 Zod issues，不调用 lookup。旧 path 缺段通常路由层 404，新 query 的 400 是显式 transport 变化。
2. 重复目标 key，即使同值，parser 得到 array→400；不取 first/last、不合并。直接 DTO array/object/number/null 均拒绝；字符串 `null`、`123` 是普通 predicate。
3. 默认 `z.object` strip unknown。仅 `projectNo[]=A`、`projectNo[x]=A` 是字面 unknown key，目标缺失→400；`projectNo=A&projectNo[]=B` 查 scalar A，unknown 忽略。不能把 simple parser 描述成会构造 bracket array/object。编码目标参数名由 parser 解码，重复后仍拒绝。
4. `%20` 等空白字符串不为空，原样转发；大小写和 Unicode 组合/分解形式不归一。query 的 `+`→空格、`%2B`→加号、`%20`→空格、`%25` 只解码一层。query 内 `/`、`%2F`、冒号、编码 `&`/`=` 都作解码后 predicate；不套用旧 path slash 分段假设。
5. >64 字符不截断、不在 DTO 新增拒绝，按原精确查询产生真实结果。不存在统一沿用原 404 消息；不通过 fixture 字符串匹配制造成功。
6. simple parser 对畸形 percent/UTF-8 的宽容行为不同于旧 path `decodeURIComponent`。保留框架解析结果，G2 用 `%`、`%ZZ`、畸形 UTF-8、双重编码和编码参数名做有限真实校准，保存 raw URI/parser 值/status/error；不预称必然 400/404。
7. `%00` 可能成为含 NUL string，本候选不删除 NUL或预设新400。PostgreSQL text 的 NUL 拒绝、`security_event.path varchar(255)` 对超长原URL等既有失败边界需原 Native/新 binary 有限实测、分类后记实；不能承诺所有通过DTO的值均404。如需新拒绝规则，回到G1受限短审。

unknown strip 只作用于业务 DTO；原 unknown query、编码和顺序仍进入真实 URL 审计。不全局修改 parser、pipe、异常 filter、UUID item 路由或权限。

## 5. 成功 DTO、权限、敏感投影与真实 URL

Project 保留原 ProjectSummary 全字段、UUID id、状态/阶段、客户/owner、ISO/null 时间与 rowVersion，不加入 ProjectDetailView 的 workspace/合同/审批投影。Contract 保留 ContractSummary 加 `currentTermSnapshot`，原 projectName空串/customerName-null/current snapshot-null/default、decimal string、ISO datetime与 date-only retentionDueDate均不变；raw signedAmount及snapshot六 raw商务字段不得泄漏。

两入口保 `project:read`、Cookie session、全局 SessionAuthGuard → AuthCsrfGuard → PermissionsGuard。GET保持safe-method CSRF边界，不改public/authenticated-only；读合同无需额外敏感权限。`contract:finance:sensitive:read` 得full，仅project:read仍可读合同但非null敏感值masked。

合同链为 `mapContractToDetailView → mapContractToSummary → projectStringField → projectStringFields`，有snapshot再 `mapSnapshotToSummary → projectStringFields`。保留顺序、fieldPackageKey `contract-finance`、targetType精确大小写 `contract` / `ContractSnapshot`、真实UUID targetId、reasonCode/displayText及原batch details：

- 有敏感权限：没有 sensitive_field.masked/denied 事件。
- 无敏感权限且signedAmount非null：一条masked事件，fieldKeys `['field']`，hiddenFieldCount=1，targetType=contract。
- snapshot存在且六字段至少一个非null：额外一条batch事件，targetType=ContractSnapshot，只含非null字段，fieldKeys按 amountTaxInclusiveProjection、amountTaxExclusiveProjection、taxRateProjection、downPaymentRateProjection、retentionRateProjection、paymentTermsProjection 原顺序；不是每字段一条。
- null raw值：mode=full、value=null、reasonCode=field-package-not-applicable；不计审计。snapshot全null没有snapshot事件，无snapshot则currentTermSnapshot=null。
- 事件仍由 RuntimeAuditService.recordSecurityEvent → RuntimeAuditRepository.saveAll 真持久化。eventType=sensitive_field.masked、severity=info、result=blocked、permissionKey=contract:finance:sensitive:read；actor/principal/requestId/method/ip/userAgent/details不变。controller mock不能证明审计数量或DB持久化。

`getRequestPath` 是 **`request.originalUrl ?? request.url ?? request.path ?? 'unknown'`**。helper不切query、不decode/encode、不去部署前缀。新真实请求审计path必须保留如 `/api/contracts:lookup?contractNo=CT%2F...&extra=...` 的原URL、参数次序、plus/percent编码，禁止用DTO重建path。

只把本lookup handler的fallback由旧 `/contracts/no/${contractNo}` 改为常量 **`/contracts:lookup`**。它只承接缺URL的直接调用，不包含伪造query。现helper的 `path === 'unknown'` 与nullish/空串行为保留，不全局修helper。Root所称 `rootGet` 指root-scoped GET，不是代码符号：该真实入口须接收完整原URI；分别校准originalUrl/url/path优先级及全部缺失fallback，不能只比较DTO或把pathname当原URL。

## 6. Consumer 检索结论与边界

本轮先用rg查全仓受版本管理来源及apps/libs/tools中的大小写operationId、SDK method、getByCode/getByNo、旧URI和findByNo，再核对ProjectApi/ContractApi全部使用、Project/Contract/project-workspace store、原controller specs、API/admin E2E与动态HTTP调用。JSON保留tracked范围、命中及源码指纹；node_modules/tmp/target/.git不是本次运行consumer认证范围，docs/archive引用属于历史证据。

- 生成SDK：`api/project.service.ts` 的 ProjectControllerGetByCodeRequestParams.projectNo / projectControllerGetByCode；`api/contract.service.ts` 的 ContractControllerGetByNoRequestParams.contractNo / contractControllerGetByNo。名字/具名参数保留，transport改query，必须原CLI完整重生成。
- 未发现两SDK method或旧lookup URL的非生成运行调用。ProjectStore.loadProject、ContractStore.loadContract用UUID GetById；project-workspace store调用workspace/领域查询，无业务号lookup；现store不需无关改写。
- 原两controller specs已stub findByNo但没有getByCode/getByNo测例，本次须补聚焦覆盖；合同projection mock不认证真实batch审计。
- Node内部只有原lookup controller调用本域findByNo。Approval四操作和待办读映射用UUID EntityRepository/em.findOne，contractNo只用于title/summary，不调用lookup HTTP或service；L与lookup可并行准备，不能据此用假lookup代替L业务成功。
- `tools/rust-r0f/data-compat/oracle.mjs` 等只读取相关类/normalizeDateOnly，没有lookup调用。旧设计、R0清单、已归档source manifest保原文；新route证据另成epoch。
- 源码搜索不能证明仓外调用方绝对不存在；当前无不可控外部依赖证据，不创建alias。如发现实证，由Root按ADR-015 §4.5先登记例外再裁决。

## 7. 完整 OpenAPI/client 的同步 allowlist

旧完整输入为237 paths / 291 operations / 585 schemas，client579文件；本轮重算raw、CRLF→LF和canonical hash见JSON。原生成baseline.sourceHead=`ee0f4847cae292fe5cee1d1eec065b7194607683`，与产品base02b89567分工不同，不伪装为新checkpoint。

1. 只移两目标method/path：`get /api/projects/code/{projectNo}`→`get /api/projects:lookup`；`get /api/contracts/no/{contractNo}`→`get /api/contracts:lookup`。旧path移除、新path新增；不留alias，不增operation或重复/改名operationId。
2. 目标parameter各由in:path改in:query，原name、required:true、type:string保留，仅新增minLength:1。禁止UUID format/pattern、maxLength、trim/coercion/default、body或额外参数。最终parameter完整JSON须真实完整export后独立短审冻结，不开放任意parameter差异。
3. 目标operation其他字段operationId/summary/tags/security/200 response DTO/content/description全部逐项不变。当前这两操作未声明400/404 schema；本片不顺便扩展错误声明体系，实际400/404按本件校验。
4. 非目标 **289个method/path/operationId及完整operation对象** deep-equal。path item的非operation字段、top-level除paths/components外字段、components除schemas外字段全部deep-equal；不只比较数量或Rust子集。
5. 既有 **585个schema名和完整内容**全部保留。现ProjectListQuery/ContractListQuery被flatten为parameters、未生成query object components；新DTO是否增component只以真实完整export判断。新增唯一候选名ProjectLookupQuery/ContractLookupQuery，语义仅本件单required string/minLength:1；其他name/ref/变化均阻断短审。不预称一定585或预造587。
6. 原loadBaseline的291/585 hard guard与六protectedSources的worktree/index/untracked/hash保护保持。若真实export增query component，Root先受限短审再最小更新准确schema名集/计数，旧585逐项保护仍在；不得删断言、改任意下限、用任意baseline掩盖drift。保持585则不动CLI。
7. 六输入为fullspec、typescript-angular.config.json、openapitools.json、package.json、pnpm-lock.yaml、.gitattributes。原JAR7.20.0 SHA、wrapper/config、固定input/output、三metadata保护保持；生成前后assertFrozenSources、完整tree和metadata检查不降低。

Root从原CLI完整重生并逐件比较579文件，禁止手写SDK。预计主要变动是两service的URL/query绑定；实际额外变化、增删、FILES/VERSION、metadata均记实并解释，不以“预计两个文件”冒称验收。

## 8. G1 后文件所有权与实际验证

B写入候选：

- `apps/poms-api/src/app/features/project/project.controller.ts` 与 `.../contract/contract.controller.ts`：移旧handler、同文件root class、显式operationId、复用mapper；合同新fallback保真实request context。
- `apps/poms-api/src/app/features/project/project.module.ts` 与 `.../contract/contract.module.ts`：各注册一root类。
- `libs/api/contracts/src/lib/project/project.dto.ts` 与 `.../contract/contract.dto.ts`：各一query DTO。
- 原两 `*.controller.spec.ts`：新类exact scalar转发、原404、Summary/Detail/null和context；真实Nest HTTP若须新文件，候选为 `apps/poms-api/src/app/features/project/lookup-route.spec.ts`，须纳入联合G1。

Root单写共享schema/infer types及必要测试、ADR/canonical、在线/联合baseline、永久原输入checkpoint、fullspec、生成baseline/必要精确计数、原CLI write/check和全client、真实Native环境/witness/证据。当前两service/repository无需改变；若实测发现必须改服务fallback或其他文件，先记录G1 delta与所有权，不自行扩面。计划无非生成consumer产品改写。

后续必须实际验证，当前均未冒称完成：

- Root可用精确base02源证明一致的原Source-B编译artifact作为旧oracle，标“原已编译artifact”，不标本轮新编译；hash不符则不用。
- 切换后真实新Native binary及原Node在隔离fixture验证两lookup成功/404/DTO/null/snapshot、真实认证权限、原path移除、literal-colon与斜线路径不混、原UUID/集合路由不漂移。
- 有限输入实测：缺/空/同值或异值重复/unknown/bracket-only/scalar+bracket/direct array-object、空白/大小写/Unicode组合分解/非ASCII、plus及percent/slash/冒号/编码分隔符、畸形percent-UTF8/NUL/>64；分别保存wire/parser/error/DB事实。
- 真敏感审计：full/仅project:read/缺project:read/无会话，有无snapshot、snapshot全null/部分非null，非nullsignedAmount一次、snapshot额外一次、正确fieldKeys和真实URL/编码。signedAmount的null若不满足entity not-null，只能在原真实projection service测试认证通用null分支，不伪造DB合同成功。
- 相关项目lint、API/controller/service tests/build、DTO/shared-contracts checks、full OpenAPI/deepdiff、原CLI真实write/check、全client/typecheck及原admin consumer回归。stub forwarding单独标证据范围，不能代替Native/DB/权限/审计。
- 保持原S2；正式G1、受限独审及真实full export后，Root先形成受审原输入的永久S3 checkpoint，再绑定sourceHead/fullspec/两operation及必要schema准确计数，然后原CLI生成。不将未提交树当frozen source、不覆盖旧原件补造过去结果。
- 本片无schema/entity/SQL变化，无新增migration；总体migration-check保留真实baseline drift分类，不部署建议DDL。本作者不创建环境，不触生产/PG17，不把L4或R3/R4全域标完成。

## 9. 联合 G1 仍需完成的事项

Root已确认本件rootGET/query/敏感候选用于联合G1，#84 native parent=#61；实际在线receipt由Root写入 `tmp/rust-r2l/g0-online.json` 并核对checklist/依赖。本候选不操作在线状态。

正式G1尚需非作者审查Root ADR-015只读query补充、authoritative两行、联合baseline及本件；真实完整export之后对parameter精确JSON、是否新增query component及准确计数另做受限短审；实际transport异常与原artifact证明纳入工程验收。不在候选填未产生hash或GatePass。

#61只有本身lookup裁决、canonical/实现/consumer同步、证据和G4条件全满足才可关闭；route子件不自动关闭父#67/#57或R2M。L#79按四操作与真实业务域适配独立验收。当前交付是可审输入及指纹，没有产品运行、DB验收、CLI生成或在线完成结论。
