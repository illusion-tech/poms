# EX-59 后端与 shared contracts 枚举回归扫描扩展收口

- Task ID: `EX-59`
- Slice type: `governance`
- Owner: `Codex`
- Tracker row: `docs/design/phase2-development-execution-tracker.md` / `EX-59`
- Public route surface: no new, changed or removed public route
- Status: `G4`
- G4 Date: 2026-05-04

## 1. Delivered Scope

本片完成扫描器扩展和分类基线：

1. `check:enum-like-strings` 新增后端 features、API contracts、shared contracts 扫描根。
2. 新增 `inline-string-union` 规则，捕捉后端 entity-local 字符串 union。
3. 新增 `inline-z-enum` 内容级规则，捕捉直接内联数组的 zod enum。
4. `AllowlistEntry` 新增 `maxMatches`，对历史债分类建立数量上限。
5. 新增 `EX59-A1` 到 `EX59-A7` allowlist 分类，覆盖后端当前历史 finding 与 shared helper 例外。
6. 回写 EX-59 baseline / closeout 和 tracker。

## 2. Governance Outcome

| Area                    | Outcome                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Backend scan coverage   | 后端 service / repository / controller / entity / spec 已进入 enum-like 回归扫描。                    |
| Shared contracts scan   | shared contracts 中 inline `z.enum([...])` 和 helper 例外已进入扫描分类。                             |
| Broad allowlist control | 后端历史债使用 `maxMatches` 控制数量，新增同类 finding 会触发 overflow。                              |
| Follow-up debt          | 后端 runtime comparisons、entity unions 和 typed fixtures 归入 future backend enum hardening slices。 |

## 3. Validation Evidence

| Check                                       | Result                                            |
| ------------------------------------------- | ------------------------------------------------- |
| `corepack pnpm run check:enum-like-strings` | Passed, `1184` findings / `29` allowlist entries. |
| `corepack pnpm run format:md:check`         | Passed.                                           |
| `git diff --check`                          | Passed.                                           |

## 4. G4 Conclusion

- Gate Status: `Pass`.
- `EX-59` does not alter runtime behavior, OpenAPI, generated client, database schema or public route surface.
