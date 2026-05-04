# EX-52 附件移交清单与批量下载治理收口

- Task ID: `EX-52`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-52`
- Public route surface: planned route inventory only, no runtime route implementation
- Status: `G4`
- G4 Date: 2026-05-05
- Commit: `3f1f14a`

## 1. Delivered Scope

本片完成附件移交清单与批量下载的治理边界冻结：

1. 冻结项目移交附件清单来源：来源线索、项目、当前有效合同集合、销售跟进和已选择的项目移交附件。
2. 冻结版本选择规则：优先 final，缺 final 时选择 active latest 并标注原因，历史版本必须显式选择并说明。
3. 冻结 `AttachmentRelationType = handover` 的语义：只表示某个附件版本被纳入具体项目移交记录。
4. 冻结 `AttachmentTargetType = project-handover` 为后续运行时必需扩展，禁止用普通 project target 替代移交记录。
5. 冻结敏感附件默认排除和短期批量下载包的 manifest、生命周期、下载和审计边界。
6. 在 route inventory 中登记项目移交附件清单和下载包 planned routes。

## 2. Governance Outcome

| Area                | Outcome                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Handover checklist  | Future runtime slice must persist explicit version selections and source references.                                    |
| Attachment relation | `handover` is a selection relation for a project handover record, not a generic project link.                           |
| Sensitive export    | `sensitive` and above are excluded from ordinary batch packages unless a future explicit exception flow is implemented. |
| Batch download      | Package is short-lived, audited and accessed only through controlled routes.                                            |
| Route surface       | Planned routes are frozen before controller / DTO / OpenAPI implementation starts.                                      |

## 3. Deferred Runtime Slices

| Future Slice                             | Purpose                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| EX-52A backend runtime                   | Add `project-handover` attachment target, checklist selection persistence, package persistence, API and tests. |
| FE attachment handover entry             | Add checklist review, sensitive exclusion feedback and batch package actions to the project handover context.  |
| Optional sensitive export exception flow | If needed, add explicit approval / justification flow for exporting sensitive attachments.                     |

## 4. Validation Evidence

| Check                               | Result  |
| ----------------------------------- | ------- |
| `corepack pnpm run format:md:check` | Passed. |
| `git diff --check`                  | Passed. |

## 5. G4 Conclusion

- Gate Status: `Pass`.
- EX-52 remains docs-only and does not alter runtime behavior, persistence, OpenAPI, generated client or Admin UI.
- Downstream implementation must split backend runtime and frontend entry work instead of expanding this governance slice in place.
