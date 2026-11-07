# R4GHI review05 初次独立 G2 审查

结论：**整体 G3/G4 未签；不得据本报告入主线、认定交付或关闭 #101。** 本轮只读产品、冻结输入和证据，只写本目录。#57/#116继续开放。HEAD `ba775dd291171bde361d8fc145ead9e5bb1887a5`，main `d5c79b260fc58f78ff9adb4ac9fd69ed5bc838d5`。

原始输入在 `inputs01/`（397文件）及 `inputs02/`；精确哈希见 `input-manifest01.json`、`static-checks01.json`。effective-v2 manifest20项原字节全部相符；H UI候选10项与manifest全部相符。S4 `4f0ad88e78622a75b88b4e3cc72aded9da67458a`仍是HEAD/main祖先。原G1未改写，当前G1/G2状态由admission/online证书读取，原Pending文档不作新否决。

## 具体发现

1. **[P2] IR05-01 候选关闭条件调用错用path key。** H UI候选 `project-governance-api.ts:233`（SHA256 `8547e6e9a1e4bb00635be5e175a3c39f05acbf66b5965f3c28c9fc8fd7780923`）把 `{ completionRecordId, conditionId }`传给SDK；canonical为`/project-completion-records/{completionRecordId}/conditions/{id}:close`。应传`id: conditionId`。上传用途上下文继续使用`conditionId`，不能改canonical迁就UI。独立纯调用探针确认缺`id`且多`conditionId`。此候选未应用，当前旧SDK尚无新方法，所以13项诊断不能覆盖这个后续缺陷。
2. **[P2] IR05-02 runtime完整OpenAPI有实际冲突。** `apps/poms-api-rust/src/http.rs:223-244`（SHA256 `d85fd9e2ec29a3fabbcba2e84af51f6df241e4942c9b9b3ee04b92b08444095d`）混合旧fragment定义与当前完整schema，真实`rust-test02`三项因`AcceptanceRecordSummary`冲突panic，exit101。保留严格merge，不允许任意覆盖。将历史fragment降为route/status元数据后用封闭helper接入canonical schemas可行；独立比较R3AB/R3CDEFG/R3HIJK三片段，所有path/method/operationId与parameters/requestBody/responses/security相等，unknown schemas及悬空refs皆0。见`runtime-fragment-comparison01.json`。

本轮新P1=0、新P2=2仅限已审边界，**不是整体无P1/P2证明**。

## 已检查的静态边界

- B正常条款激活及amendment激活均从已验证preparation冻结currency_code；未回填历史NULL。C的现代确认在Root借用的同一外层事务中核责任Scope、合同/回款版本、真实activated terms/商业币种来源与附件事实hash，整数分按明确HALF_UP计算net并以gross-net守恒出tax。certify-existing-basis只在原confirmed缺basis时追加，保留原cash/status/confirmedAt/by。这里没有真实PG/HTTP或FI通过声明。
- 统一HTTP保留named ResourceKeys双UUID，现代tag与有限schema校验；业务结果schema校验在最终flush/COMMIT前，失败走rollback。必要审计/安全写失败不应返回payload，仍待真实FI验证。
- D17在撤换旧移交事实前运行冻结角色/阶段拒绝；再基线handover→handover通过原责任链proof进入ledger，proof绑定actor/session/物理事务/项目版本。确认其静态调用顺序，不代替BA、frozen、execution真实反例。
- Origin20要求实际active account、ownerOrg及active primary/secondary membership；org项目采用creator，personal采用owner。Lead来源再核convertedProject/convertedBy/owner/org。origin/audit在项目创建同事务；独立业务号预留可留gap，不称计数器整体回滚。旧missing-org不回填。
- H UI未晋升候选的本人入口首次业务请求为completion list；无ProjectDetail/finance预读。上传从TaskRow双UUID→typed adapter→AttachmentStore session request的purpose可传通，跨parent在本地白名单拒绝。独立纯探针使用显式synthetic服务/schema stubs，不能证明真实授权或HTTP。

## 实际证据与缺口

- `business-cargo-check04`：lib check exit0/0error/sourceStable=true，未跑DB。
- `rust-test02`：exit101/sourceStable=true；http14通过/3失败，后续套件未执行。
- `openapi07`：真实完整export退出0，242paths/296operations/688schemas，spec SHA256 `2c236f5a1058dbfbb9ffd22869034ff829824e0bab29d8dc5a9af5da841cbe2a`。`spec-validate02`只覆盖更早06 spec并有5 recommendations，不能升为最终07/EO协议通过。
- M95：env03 Rust实际94→95且保存原列数据前后证据；Native在verifier02已提交，env03为95noop/adopted，缺原before-image，只能认证现catalog/noop。M96 env04两库均实际95→96并保存原列数据前后证据。以上不证明HTTP/ORM无漂移。
- 既有api/admin tsc01只是旧时点证据；新10文件UI候选未应用，13个旧SDK诊断保留。主工作区尚未接线，原I组件也缺purpose参数，故当前G3阻断。
- EO只读executionAdmissionContext尚待最终同源契约/UI delta；正常期末选择current authority尚待用户裁决，`selected=false`不能视为获批政策。
- 必须补完整统一真实链路、六项裁决/全Scope矩阵、全部32与支持producer HTTP、敏感JSON/DOM/必要GET事件、每实际必要写FI+same-body retry、真实锁/并发、Rust fmt/clippy/full regression及相关TS/Native/shared/admin lint/build/test、最终spec/client及迁移实体DDL对齐。不能将probe/候选/纯规则测试升格。

`projects/model.rs`、`projects/validation.rs`在本轮捕获后变动，记录于`static-checks01.json`；最终复核需新的精确source manifest及当前实际验收。
