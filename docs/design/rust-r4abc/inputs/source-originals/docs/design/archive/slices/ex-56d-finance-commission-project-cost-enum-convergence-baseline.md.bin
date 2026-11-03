# EX-56D1 合同与财务台账枚举收口实施基线包

- Gate Status: `Pass`
- Parent: `EX-56D`
- Owner: `Codex`
- Slice Type: `cross-layer-high-risk`
- G1 Reviewer: `Codex`
- G1 Date: `2026-05-02`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-56D1`

## 1. 范围

- 本次目标:
  - 将合同、合同条款快照、回款、应付、付款、发票和费用台账中的 enum-like 字段收口到 `shared-contracts` value object。
  - 为当前缺少运行时 value object 的合同财务枚举补齐 `*Value` 常量，作为后端写入、比较和 entity check 的单一事实源。
  - 替换合同财务 service / repository 中关键状态、类型和默认值裸字符串。
  - 补齐或对齐合同财务表上的 DB check / entity check，保证开发库当前真实取值能通过约束。
  - 维持 OpenAPI enum 语义不变，必要时重新生成 generated client。
- 本次明确不做:
  - 不新增、删除或改名 public API route。
  - 不改变合同、回款、付款、发票、费用台账的业务状态机。
  - 不收窄开放来源字段，例如 `receipt_record.source_type`、`payment_record.source_type`；它们继续承载未来集成来源。
  - 不治理项目成本、经营快照、共享成本分摊字段；这些进入 `EX-56D2`。
  - 不治理提成规则、计算、发放、调整、结算和 gate 复核字段；这些进入 `EX-56D3`。
  - 不治理 Admin 全局状态展示和测试 fixture 中所有字面量；前端广域收口由 `FE-52` / `EX-57` 承接。
- 下游可依赖的交付边界:
  - 合同财务 production code 中关键状态 / 类型比较和默认写入不再自造裸字符串。
  - 合同财务 DB check、entity check、shared contract enum 和 OpenAPI 取值一致。
  - `EX-56D2` / `EX-56D3` 可在本片完成后继续收敛项目成本和提成域。
- 不允许下游依赖的留白:
  - `source_type` 语义仍是开放来源标识，不是封闭枚举。
  - 项目成本和提成域仍可能保留本地字符串，直到对应子切片完成。

## 2. 正式输入

| Input Type                | Document / Source                                              | Section / Anchor                 | Status | Notes                                                           |
| ------------------------- | -------------------------------------------------------------- | -------------------------------- | ------ | --------------------------------------------------------------- |
| Business design           | `docs/design/ex-56-domain-enum-literal-governance-baseline.md` | Downstream slicing / `EX-56D`    | Active | 要求财务、提成与项目成本状态枚举分片收敛。                      |
| Slice tracker             | `docs/design/phase2-development-execution-tracker.md`          | `EX-56D1`                        | Active | 冻结合同与财务台账枚举收口为第一子切片。                        |
| Contract implementation   | `apps/poms-api/src/app/features/contract`                      | entity / service                 | Active | 合同状态和条款快照状态已有持久化字段，部分运行时代码用字面量。  |
| Finance implementation    | `apps/poms-api/src/app/features/contract-finance`              | service / repository / entities  | Active | 回款、应付、付款、发票台账状态和类型需要统一。                  |
| Expense implementation    | `apps/poms-api/src/app/features/project-cost/expense-record*`  | entity / repository integrations | Active | 费用台账属财务台账，本片只收敛费用记录自身分类、来源和状态。    |
| DTO / OpenAPI design      | `libs/shared/contracts/src/lib/shared-contracts.ts`            | Contract / Finance schemas       | Active | enum schema 已存在或可由本片提取为 const array + value object。 |
| Route inventory / ADR-015 | `docs/design/api-route-canonical-inventory.md`                 | existing contract finance routes | N/A    | 本片 route surface 不变。                                       |
| ADR                       | `docs/adr/015-api-route-canonical-grammar.md`                  | route grammar                    | Active | route surface 不变。                                            |

## 3. 本次 SSOT

| Concern                       | SSOT                                                                                     | Implementation Rule                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Contract status               | `CONTRACT_STATUSES` / `ContractStatusValue`                                              | 后端默认、比较、entity check 使用 value object / shared const array。                   |
| Contract term snapshot status | `CONTRACT_TERM_SNAPSHOT_STATUSES` / `ContractTermSnapshotStatusValue`                    | active snapshot 唯一索引条件、默认值和 check 使用同一常量。                             |
| Receipt ledger status         | `RECEIPT_RECORD_STATUSES` / `ReceiptRecordStatusValue`                                   | 回款登记、确认、关闭和查询使用 value object。                                           |
| Payable ledger status         | `PAYABLE_RECORD_STATUSES` / `PayableRecordStatusValue`                                   | 应付登记、付款归集、关闭和作废判断使用 value object。                                   |
| Payment ledger status         | `PAYMENT_RECORD_STATUSES` / `PaymentRecordStatusValue`                                   | 付款登记、确认、关闭和查询使用 value object。                                           |
| Invoice ledger type / status  | `INVOICE_RECORD_TYPES` / `INVOICE_RECORD_STATUSES` / `INVOICE_RECORD_EXCEPTION_STATUSES` | 发票类型、状态、异常状态和 patchable status 使用 shared schema / value object。         |
| Expense ledger fields         | `EXPENSE_CATEGORIES` / `EXPENSE_SOURCE_TYPES` / `EXPENSE_RECORD_STATUSES`                | 费用分类、费用来源类型、费用状态的写入和 check 使用 shared const array / value object。 |
| Open source identifiers       | existing string schemas                                                                  | `receipt_record.source_type` 和 `payment_record.source_type` 保持 open string。         |
| Public route surface          | ADR-015 / route inventory                                                                | 本片不改 route。                                                                        |
| Money / decimal semantics     | existing entity transformers and DTO schemas                                             | 不改变金额字段精度、舍入、累计或付款 / 收款口径。                                       |

## 4. 命令与接口边界

| Route / Controller                      | Command / Service                       | Request / Response Contract | Guard / Permission | Result          |
| --------------------------------------- | --------------------------------------- | --------------------------- | ------------------ | --------------- |
| existing contract routes                | `ContractService`                       | Contract schemas            | existing guards    | route unchanged |
| existing contract finance routes        | `ContractFinanceService`                | Receipt / payable / payment | existing guards    | route unchanged |
| existing invoice / expense integrations | `ContractFinanceService` / repositories | Invoice / expense schemas   | existing guards    | route unchanged |

### 4.1 公共路由补充信息

- Canonical inventory document: `docs/design/api-route-canonical-inventory.md`
- Canonical route(s): existing contract and contract-finance routes only.
- Current implemented route(s): existing routes only.
- Inventory status: unchanged.
- Blocker / exception: N/A; no route surface change.

## 5. 读侧边界

| Query / View                      | Consumer              | Fields                        | Filter / Sort        | Permission Boundary | Design Source    | Result          |
| --------------------------------- | --------------------- | ----------------------------- | -------------------- | ------------------- | ---------------- | --------------- |
| contract / finance existing reads | Admin and API clients | existing status / type fields | existing filters     | existing guards     | shared contracts | route unchanged |
| finance aggregation repositories  | internal services     | confirmed receipts / payments | status-based filters | service boundary    | current code     | enum constants  |

## 6. 持久化边界

| Table                         | Entity                 | Enum Fields                                  | Expected Result                           |
| ----------------------------- | ---------------------- | -------------------------------------------- | ----------------------------------------- |
| `poms.contract`               | `Contract`             | `status`                                     | shared const array check                  |
| `poms.contract_term_snapshot` | `ContractTermSnapshot` | `snapshot_status`                            | shared const array check and active index |
| `poms.receipt_record`         | `ReceiptRecord`        | `status`                                     | shared const array check                  |
| `poms.payable_record`         | `PayableRecord`        | `status`                                     | shared const array check                  |
| `poms.payment_record`         | `PaymentRecord`        | `status`                                     | shared const array check                  |
| `poms.invoice_record`         | `InvoiceRecord`        | `invoice_type`, `status`, `exception_status` | shared const array checks                 |
| `poms.expense_record`         | `ExpenseRecord`        | `expense_category`, `source_type`, `status`  | shared const array checks                 |

### 6.1 开发库取值证据

`2026-05-02` 用 `D:\Program Files\PostgreSQL\17\bin\psql.exe` 只读查询开发库:

- `contract.status`: `active=35`, `draft=29`, `pending-review=44`
- `receipt_record.source_type`: `manual=22`; `receipt_record.status`: `confirmed=15`, `pending-confirmation=7`
- `payable_record.status`: `partially-paid=14`
- `payment_record.source_type`: `manual=29`; `payment_record.status`: `confirmed=29`
- `invoice_record.invoice_type`: `input=7`, `output=7`; `invoice_record.status`: `closed=7`, `verified=7`; `invoice_record.exception_status`: `none=7`, `resolved=7`
- `expense_record.expense_category`: `travel=14`; `expense_record.source_type`: `manual=14`; `expense_record.status`: `confirmed=7`, `voided=7`

## 7. 一致性结论

- Document -> code: `EX-56D1` 已在 tracker 冻结为合同与财务台账枚举收口。
- ADR-015 inventory -> route: 不变更 route，无 route governance blocker。
- Migration -> entity: 需要通过 migration check 确认 DB check 与 entity check 无 drift。
- Entity -> contract: 需要把 entity check 和默认值绑定到 shared const array / value object。
- Route -> command: route 不变，command 内状态判断替换为 value object。
- Query -> view: 读侧字段语义不变。
- Guard / permission: 不变更权限。
- OpenAPI / generated client: enum schema 语义不变；如生成文件有差异必须由 generator 产生。

## 8. 测试与校验

| Check                            | Required | Command / Evidence                                                                                                          | Result | Gap / Reason                                                                                                            |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Lint                             | Yes      | `corepack pnpm nx lint poms-api`; `corepack pnpm nx lint poms-admin`; `corepack pnpm nx lint admin-data-access`             | Passed |                                                                                                                         |
| Build                            | Yes      | `corepack pnpm nx build shared-contracts`; `corepack pnpm nx build poms-api`; `corepack pnpm nx build poms-admin`           | Passed | Admin build reports existing bundle budget warning: initial total 1.01 MB, over 1.00 MB by 12.72 kB.                    |
| Focused backend tests            | Yes      | Covered by full `poms-api` unit suite                                                                                       | Passed |                                                                                                                         |
| Unit tests                       | Yes      | `corepack pnpm nx test poms-api --runInBand`; `corepack pnpm nx test poms-admin --runInBand`                                | Passed | API: 46 suites / 561 tests. Admin: 28 suites / 161 tests.                                                               |
| OpenAPI generation / client diff | Yes      | `corepack pnpm nx run shared-api-client:generate`; `corepack pnpm nx run shared-api-client:check`                           | Passed | Generator still reports existing `propertyNames` warnings for commission / audit schemas; client check is synchronized. |
| Migration / schema check         | Yes      | `corepack pnpm nx run poms-api:migration-up`; `corepack pnpm nx run poms-api:migration-check`; psql constraint verification | Passed | Added 11 EX-56D1 check constraints; migration check reports schema up-to-date.                                          |
| Markdown                         | Yes      | `corepack pnpm run format:md`; `corepack pnpm run format:md:check`                                                          | Passed |                                                                                                                         |
| Whitespace                       | Yes      | `git diff --check`                                                                                                          | Passed |                                                                                                                         |

## 9. 例外与风险

| Exception ID                 | Level | Scope                                                      | Approved By | Cleanup Owner | Cleanup Due | Notes                                              |
| ---------------------------- | ----- | ---------------------------------------------------------- | ----------- | ------------- | ----------- | -------------------------------------------------- |
| `EX56D1-E1-OPEN-SOURCE-TYPE` | Low   | `receipt_record.source_type`, `payment_record.source_type` | Codex       | N/A           | N/A         | 作为外部来源标识保留 open string，不纳入封闭枚举。 |
| `EX56D1-E2-D2-D3-DEFERRED`   | Low   | project cost and commission enum-like fields               | Codex       | `EX-56D2/D3`  | G1          | 父任务已拆分，本片不处理项目成本和提成字段。       |
| `EX56D1-E3-FIXTURE-LITERALS` | Low   | broad test fixtures and non-production examples            | Codex       | `EX-57`       | G1          | 本片优先生产代码和约束一致，测试样例广扫后置。     |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-02`
- Conditions:
  - 不新增 public route。
  - 不改变现有 enum 值集合、状态机、金额语义或权限边界。
  - 新增或调整 DB check 前必须确认开发库当前真实取值在 shared enum 内。
  - generated client 如有变化必须由 OpenAPI 生成，不手工编辑。

## 11. G3 结论

- Gate Status: `Pass`
- Approved By: `Codex`
- Approved At: `2026-05-02`
- Drift Classification:
  - `expected-alignment`: 从 shared contract 提取 `ContractTermSnapshotStatus` 和 `InvoiceRecordPatchableStatus` 后，OpenAPI 生成独立 generated enum model，替代原 inline enum。
  - `expected-alignment`: `Migration20260502100000_ex56d1_contract_finance_enum_checks` 已在开发库落地 11 个合同财务 check constraint，`migration-check` 无 schema diff。
  - `tool-noise`: OpenAPI generator 仍提示既有 `CreateCommissionRuleVersionRequest.propertyNames` 和 `AuditSnapshot.propertyNames` warning，本片未引入新 spec blocker。
  - `accepted-scope-exception`: `receipt_record.source_type` / `payment_record.source_type` 保持 open string；项目成本和提成域延后到 `EX-56D2` / `EX-56D3`。
- Completion Boundary:
  - 合同、合同条款快照、回款、应付、付款、发票、费用台账的核心状态 / 类型已进入 shared value object 和 DB check 收口。
  - 合同财务相关生产代码写入和比较路径已替换为 value object / generated enum 消费。
  - No public route surface changed.
  - G4 remains blocked only on code commit.
