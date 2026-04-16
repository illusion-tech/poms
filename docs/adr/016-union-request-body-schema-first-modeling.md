# ADR-016: union request body 的 schema-first 建模与工具链约束

**状态**: 已接受 (Accepted)
**日期**: 2026-04-16

---

## 1. 背景 (Context)

随着 `ADR-015` 落地，`EX-15E2B` 已把五个 `ProjectActualCostRecord` register 命令统一收口到：

- `POST /projects/{projectId}/actual-cost-records`

其正式 request contract 也已经冻结为以 `costType` 为判别字段的 discriminated union。

但当前实现中，这个 contract 仍以“单对象 + variant `superRefine`”方式落地，而不是真实 union：

- shared contract 暴露一个包含全部 variant 字段的大对象
- controller 通过 `createZodDto(...)` 接收该大对象
- service 再按 `costType` 二次 parse 到各 variant schema
- OpenAPI / generated client 看到的是“字段大并集”，而不是正式的 `oneOf + discriminator`

这一做法能维持 runtime 语义正确，但存在三个问题：

1. 正式业务 contract 与 OpenAPI / generated client 表达不一致。
2. service 被迫承担不必要的二次 parse 与缩窄逻辑。
3. 后续新增 union request body 时，仓库缺少统一、正式、可复用的实现规则。

当前已确认的直接技术边界是：仓库惯用的 `export class XxxDto extends createZodDto(schema) {}` 模式，无法直接承载 parse 返回 union object 的 schema。`EX-15E2B` 早期尝试已在本仓库中触发 TypeScript 编译错误，因此退回到大对象 workaround。

因此，需要一个独立 ADR，正式裁决：当 request body 本身就是 union / `oneOf` 语义时，仓库应采用什么建模方式，如何通过 `nestjs-zod`、Swagger、OpenAPI 与 generated client 保持一致。

---

## 2. 决策驱动因素 (Decision Drivers)

- **正式 contract 一致性**: 设计文档、runtime validation、OpenAPI 与 generated client 应共同表达真实 union 语义。
- **工具链可验证性**: 决策必须能在当前仓库的 `nestjs-zod -> Swagger -> OpenAPI Generator -> typescript-angular` 链路中被实证验证。
- **单一可信源**: union 约束应尽量由同一份 Zod schema 直接表达，而不是靠 controller / service / docs 分别补语义。
- **避免伪对象 contract**: 不能因为 DTO 工具边界，就把正式业务 contract 长期压平为“字段并集大对象”。
- **局部最小实现成本**: 普通 object / array body 不应被迫放弃现有 `createZodDto` 惯例。
- **可扩展性**: 后续 `commission dispute`、审批摘要包、敏感揭示等 slice 若出现 union body，应能沿用同一规则。

---

## 3. 候选方案 (Considered Options)

### 方案 A: 继续使用“单对象 + variant 校验” workaround

- **描述**:
  - shared contract 暴露字段大并集对象
  - runtime 用 `superRefine` 或 service 二次 parse 保证 variant 语义
- **优点**:
  - 与当前 `createZodDto` 惯例兼容
  - 改造成本最低
- **缺点**:
  - OpenAPI / generated client 不能表达正式 union contract
  - service 需要重复做 schema narrowing
  - 长期会把工具限制误写成业务 contract

### 方案 B: 等待或定制 `createZodDto`，继续坚持 DTO-first

- **描述**:
  - 不改变当前模式，等待上游工具直接支持 union DTO，或在仓库内自定义一套 DTO carrier
- **优点**:
  - 保持“全部 body 都是 DTO class”的单一开发惯例
- **缺点**:
  - 当前没有已验证、低风险、仓库级可用的实现
  - 会阻塞已有 union contract slice 的正式收口
  - 需要把真实 contract 继续压在 workaround 上

### 方案 C: union request body 改为 schema-first，显式输出 `oneOf + discriminator`

- **描述**:
  - union request body 的 canonical contract 直接使用 Zod union / discriminated union schema
  - controller 用 `@Body(new ZodValidationPipe(schema))` 做 runtime validation
  - TypeScript 参数类型直接使用 `z.infer<typeof schema>`
  - OpenAPI 显式输出 `oneOf + discriminator`
  - `createZodDto` 继续只承担普通 object / array body，以及各个 variant object schema 的 DTO carrier
- **优点**:
  - runtime、类型系统、OpenAPI、generated client 都能围绕真实 union contract 建模
  - 不再需要单对象 workaround 与 service 二次 parse
  - 对普通 DTO 习惯影响最小
- **缺点**:
  - controller 需要显式引入 schema-first 写法
  - 生成链路必须做实证验证，不能只停留在理论上

---

## 4. 决策 (Decision)

**推荐选择：方案 C。**

`POMS` 后续对 union / `oneOf` request body 的正式建模规则固定为：

- **business contract**: 使用真实 union / discriminated union schema
- **runtime validation**: `@Body(new ZodValidationPipe(UnionSchema))`
- **TypeScript body type**: `z.infer<typeof UnionSchema>`
- **OpenAPI expression**: `oneOf + discriminator`
- **DTO-first scope**: `createZodDto` 继续用于普通 object / array body，不再要求直接承载 union request body

---

## 5. 详细约束 (Detailed Rules)

### 5.1 何时触发本 ADR

满足以下任一条件的 request body，默认进入本 ADR 约束范围：

- body 本身有显式判别字段，例如 `type`、`kind`、`costType`
- 各 variant 字段集合明显不同
- OpenAPI 正式语义应表达为 `oneOf` 或 `anyOf`

### 5.2 Controller 约束

1. controller 参数类型直接使用 shared contract 的 union type。
2. runtime validation 使用显式 schema pipe，不再依赖“DTO class = body contract”的单一路径。
3. service 默认接收已经完成 runtime validation 的真实 union type；除非跨边界需要 defensive parse，否则不再做同义二次 parse。

### 5.3 OpenAPI 约束

1. union request body 必须在 OpenAPI 中显式表现为 `oneOf + discriminator`。
2. 各 variant object schema 可以继续通过 `createZodDto` 作为可复用 component schema carrier。
3. 若 generated client 对 `oneOf + discriminator` 输出不可接受，应优先修正 generator config / template / export 链路，不应默认回退到业务 contract flatten。

### 5.4 非适用范围

以下情况不受本 ADR 影响：

- 普通 object request body
- 普通 array request body
- 不含 variant 分支的响应 DTO
- 已有 slice 的 route grammar 决策

---

## 6. 后果 (Consequences)

若本 ADR 被接受：

1. `interface-openapi-dto-design.md` 需要新增 union request body 的正式规则。
2. 当前 `EX-15E2B` 中关于 `CreateProjectActualCostRecordRequest` 的 workaround 说明应被替换为 schema-first 规则。
3. 后续 union body slice 必须先验证 OpenAPI / generated client 输出，不得只验证 Nest runtime。
4. 仓库会形成“双路径但非双标准”的 body 建模方式：
   - 普通 body: DTO-first
   - union body: schema-first

这里的“双路径”是技术实现分流，不是 contract 双轨；正式 contract 仍只有一套。

---

## 7. 接受门槛与验证结果 (Acceptance Gate Result)

本 ADR 的接受门槛已由 `EX-15F` / `EX-15E2B` 于 2026-04-16 满足，验证结果如下：

- 在真实 slice 上完成 schema-first union request body PoC
- `corepack pnpm nx build poms-api` 通过
- `corepack pnpm nx test poms-api --runInBand` 通过
- `corepack pnpm nx run poms-api:openapi` 通过
- `corepack pnpm nx run shared-api-client:generate` 通过
- `corepack pnpm nx run shared-api-client:check` 通过
- `corepack pnpm nx e2e poms-api-e2e --runInBand` 通过
- `git diff --check` 通过

PoC 的关键事实：

1. shared contract 已从“字段大并集 object + `superRefine`”切到真实 discriminated union。
2. controller 已使用 `@Body(new ZodValidationPipe(CreateProjectActualCostRecordRequestSchema))` 做 runtime validation。
3. OpenAPI 已显式输出 `title + oneOf + discriminator`。
4. generated client 已产出正式 union type：
   - `CreateProjectActualCostRecordRequest = CreateExpense... | CreateInvoice... | CreateLabor... | CreatePaymentFact... | CreateProcurement...`
5. 为了保持 generated client 的 canonical 命名，本仓库只需给该 request-body schema 增加 `title`，不需要为此引入过渡 alias 或回退到大对象 contract。
6. service 已不再为同一 contract 做二次 parse。

因此，本 ADR 从起草时的 `Proposed` 正式冻结为 `Accepted`。

---

## 8. 当前结论

`POMS` 不应因为 `createZodDto` 的 class-first 使用边界，而把正式 union request body 长期压平成“单对象 + variant 校验”。

正式方向现已确认如下：

- **普通 body**: 继续 DTO-first
- **union body**: 切到 schema-first
- **接受条件**: 以真实 slice 的 OpenAPI / generated client / test 证据为准
