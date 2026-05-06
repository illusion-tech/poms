# EX-53 客户主数据合并与合同签约主体绑定治理收口

- Task ID: `EX-53`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-53`
- Public route surface: no runtime route change
- Status: `G4`
- G4 Date: 2026-05-04

## 1. Delivered Scope

本片完成客户合并与合同签约主体的治理边界冻结：

1. 明确客户合并必须通过显式命令完成，禁止用普通 PATCH 拼装合并语义。
2. 冻结未来 customer merge preview / execute 的 canonical route、权限、事务规则和审计要求。
3. 明确当前业务身份 FK 可归并，历史名称快照不回写。
4. 明确合同必须在未来切片中拥有自己的 `signing_customer_id` 和签约主体名称快照。
5. 冻结合同签约主体变更必须走显式命令，并受合同状态、权限和审计约束。
6. 明确当前开发阶段未来迁移不做旧值兼容层，不保留长期 null / unknown 签约主体运行态。

## 2. Governance Outcome

| Area                   | Outcome                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Customer merge         | Future runtime slice must implement command routes, merge record, alias dedupe and audit.    |
| Business references    | Current identity FK may move to canonical customer; snapshot fields remain historical facts. |
| Contract signing party | Contract must own signing customer binding; Project customer is only default source.         |
| Permissions            | `customer:merge` is a separate high-privilege capability, not plain `customer:write`.        |
| Compatibility          | No legacy compatibility strategy is introduced for future migrations.                        |

## 3. Deferred Runtime Slices

| Future Slice                          | Purpose                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Customer merge runtime implementation | Add merge preview / execute API, migration, service transaction, audit and tests.                |
| Contract signing customer runtime     | Add contract signing customer fields, bind command, migration, OpenAPI / client and Admin usage. |
| Customer party model expansion        | If needed later, model payer / invoice party / end user / group hierarchy separately.            |

## 4. Validation Evidence

| Check                               | Result  |
| ----------------------------------- | ------- |
| `corepack pnpm run format:md:check` | Passed. |
| `git diff --check`                  | Passed. |

## 5. G4 Conclusion

- Gate Status: `Pass`.
- `EX-53` remains docs-only and does not alter public route surface, persistence, OpenAPI or runtime behavior.
