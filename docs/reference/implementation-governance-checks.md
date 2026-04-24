# POMS 实施治理最小校验矩阵

**文档状态**: Active
**最后更新**: 2026-04-18
**适用范围**: `POMS` PR 评审、local checkpoint、实施基线包和本地验证中的最小自动化 / 半自动化校验
**关联文档**:

- 上游设计:
  - `../design/implementation-governance-gates.md`
  - `../design/implementation-delivery-guide.md`
- 同级参考:
  - `implementation-baseline-package-template.md`
  - `implementation-corrective-checkpoint-template.md`
- 相关 ADR:
  - `../adr/012-data-persistence-technology-selection.md`
  - `../adr/014-design-execution-state-model-and-governance-gates.md`
  - `../adr/015-api-route-canonical-grammar.md`

---

## 1. 文档目标

本文档把 `G3` 合并闸口中的“应检查什么”收敛为可执行的最小校验矩阵。

它不要求所有 PR 或 local checkpoint 都跑同一组重命令。它要求每次变更按切片类型说明：

- 哪些校验必须跑
- 哪些校验不适用
- 哪些校验暂时无法跑
- 无法跑时是否需要例外

对存在 `lint target` 的受影响项目，`lint` 视为最小静态校验的一部分。`lint` 不能替代 build 或 test，但 `G3` 必须明确说明 lint 结果以及是否引入新的 warning。

若变更不是新切片开工，而是“已开工后发现 drift 的 corrective slice”，应结合 `implementation-corrective-checkpoint-template.md` 记录当前阻断、修复范围与剩余阻断，而不是只留下零散命令结果。

若变更新增、变更或删除公共 API route surface，还必须先给出 `../design/api-route-canonical-inventory.md` 中的 authoritative inventory 行或明确的 legacy exception；否则不得进入控制器 / DTO / OpenAPI 实现。

---

## 2. 切片类型到校验矩阵

| Slice Type                   | Required Evidence                                                                                                                                         | Usually Not Required                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `docs-only` / `process-only` | `git diff --check`、`pnpm run format:md:check`、影响范围说明、无行为变更声明                                                                              | build、lint、API test、migration-check、OpenAPI client generation |
| `refactor-only`              | 对外行为不变说明、相关项目 lint（若存在 target）、相关单测或构建、关键回归路径                                                                            | migration-check，除非触及 entity / mapping                        |
| `query-only`                 | query / view 对照、相关项目 lint（若存在 target）、API 或 service 测试、权限边界说明                                                                      | migration-check，除非新增字段或表                                 |
| `frontend-only`              | 受影响前端项目 lint（若存在 target）、build、关键交互验证、OpenAPI client 影响说明                                                                        | migration-check                                                   |
| `api / command`              | authoritative inventory 行或 legacy exception、route-command-DTO 对照、受影响后端项目 lint（若存在 target）、API / service 测试、OpenAPI 生成与 diff 判断 | migration-check，除非同时触及 persistence                         |
| `persistence`                | migration-entity-DDL-contract 对照、受影响后端项目 lint（若存在 target）、`migration-check` 结果、drift 归类                                              | 前端 E2E，除非影响用户主路径                                      |
| `cross-layer-high-risk`      | 以上相关项全部适用；所有受影响且存在 lint target 的项目均应执行 lint，并显式判断 E2E 是否必须补                                                           | 无默认豁免                                                        |

---

## 3. 当前可用命令

以下命令是当前仓库已经具备或可直接使用的最小集合。

| Purpose                      | Command                                         | Required When                                | Evidence                                                 |
| ---------------------------- | ----------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Markdown / whitespace sanity | `git diff --check`                              | 所有变更                                     | 命令通过或列出修复结果                                   |
| Markdown table format        | `pnpm run format:md:check`                      | 变更涉及 `docs/` 下 Markdown 文件            | 命令通过；失败时运行 `pnpm run format:md` 修复后重新提交 |
| API lint                     | `corepack pnpm nx lint poms-api`                | 变更触及 `poms-api`                          | 命令结果、warning 结论                                   |
| Admin lint                   | `corepack pnpm nx lint poms-admin`              | 变更触及 `poms-admin`                        | 命令结果、warning 结论                                   |
| Library lint                 | `corepack pnpm nx lint <project-name>`          | 变更触及存在 `lint target` 的 library        | 命令结果、warning 结论                                   |
| API build                    | `corepack pnpm nx build poms-api`               | 后端代码变更                                 | 命令结果                                                 |
| Admin build                  | `corepack pnpm nx build poms-admin`             | 前端或 generated client 影响前端             | 命令结果                                                 |
| API unit / integration tests | `corepack pnpm nx test poms-api`                | API / command / persistence 变更             | 命令结果与覆盖范围                                       |
| Admin tests                  | `corepack pnpm nx test poms-admin`              | 前端逻辑或权限路由变更                       | 命令结果与覆盖范围                                       |
| API E2E                      | `corepack pnpm nx e2e poms-api-e2e`             | 高风险跨层 API 主路径                        | 命令结果或不补理由                                       |
| OpenAPI spec generation      | `corepack pnpm nx run poms-api:openapi`         | controller / DTO / shared contract 变更      | `libs/shared/api-spec/openapi.json` diff                 |
| Generated API client check   | `corepack pnpm nx run shared-api-client:check`  | OpenAPI 或前端 API client 变更               | 无未提交 diff，或解释生成差异                            |
| Migration / ORM drift check  | `corepack pnpm nx run poms-api:migration-check` | migration / entity / repository mapping 变更 | 通过结果或 drift 归类                                    |

---

## 4. Drift 归类规则

当 `migration-check`、OpenAPI diff 或 contract 对照发现差异时，只允许归入以下类别：

1. `new-real-drift`: 本次变更引入真实漂移，必须修复后才能进入 `G3 = Pass`。
2. `existing-baseline-drift`: 已存在的历史漂移，本次变更未扩大；必须记录证据和后续清理任务。
3. `accepted-db-specific-difference`: 数据库特性差异，例如 ORM 难以精确表达的索引或约束；必须写明接受范围。
4. `tool-noise`: 工具输出噪声；必须说明为什么不影响行为或契约。
5. `design-change-required`: 实现证明设计输入本身需要调整；必须先回写设计或新增 ADR。

不得使用“测试通过”“前端没用到”“后面再补”作为 drift 分类。

若差异来自公共 route surface 未进入 authoritative inventory、route grammar 不符合 `ADR-015`，或 identity anchor 与 canonical route 不一致，默认应归类为 `new-real-drift` 或 `design-change-required`，不得记为 `tool-noise`。

---

## 5. Contract / Entity / DDL 字段类型重点

以下字段类型最容易发生 EX-06 类漂移，评审时必须显式看：

| Concern  | Required Alignment                                                                |
| -------- | --------------------------------------------------------------------------------- |
| 日期     | `date` 与 `datetime` 必须区分；纯业务日期不得静默变成时间戳                       |
| 标识符   | 系统内 UUID、外部来源 ID、业务编码必须区分；`varchar(64)` 不得无依据暴露成 `uuid` |
| 金额     | DDL decimal precision、entity 类型、contract 类型与舍入规则必须一致               |
| 版本链   | `version`、`status`、`is_current`、`supersedes_id` 或等价替代链必须与设计一致     |
| 来源映射 | `source_type`、`source_id`、`source_record_id` 等字段必须明确来源系统与追溯语义   |
| 状态     | 设计状态机、DDL check / enum、entity union、contract enum 必须同源                |

---

## 6. 阻断规则

以下情况默认阻断 `G3 = Pass`：

1. 变更涉及 `docs/` 下 Markdown 文件，但 `format:md:check` 失败且未修复。
2. persistence 变更未给出 migration-entity-DDL-contract 对照。
3. api / command 变更未给出 route-command-DTO 对照。
4. 公共 API route surface 发生变化，但未给出 authoritative inventory 行、route baseline 或已批准 legacy exception。
5. OpenAPI 或 generated client 发生变化但未说明是否预期。
6. `migration-check` 失败但没有 drift 归类。
7. 字段命名、日期类型、标识符类型、金额精度或版本链语义存在差异且未修复。
8. 变更说明声称父任务完成，但证据只覆盖子切片。
9. 例外缺少批准人、cleanup owner 或 cleanup due。
10. 受影响项目存在 `lint target`，但 `G3` 没有提供 lint 结果、warning 结论或豁免理由。
11. 必跑 lint 失败，或本次变更引入新的 lint warning / error 且未通过例外记录明确接受。

---

## 7. 非阻断但必须记录的情况

以下情况可以不阻断合并，但必须记录：

1. docs-only 变更不运行 build 或测试。
2. refactor-only 变更不运行 OpenAPI 或 migration-check。
3. 因历史全局 drift 导致 `migration-check` 失败，但本次变更未新增 drift。
4. E2E 经风险判断不补，但已有 API / integration 测试覆盖主路径。
5. generated client diff 只来自预期 API 变化，并已提交生成结果。
6. 受影响项目存在历史 lint warning，但本次未新增 warning，且已记录 warning 结论与后续清理安排。
