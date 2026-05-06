# EX-57 枚举治理回归扫描与例外清单 Closeout

**文档状态**: Review / G3
**最后更新**: 2026-05-03
**所属父切片**: `EX-56`
**适用范围**: enum-like 字符串静态扫描、allowlist、回归校验命令

---

## 1. 本次交付

| 文件                                                                | 交付内容                                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/check-enum-like-strings.ts`                                  | 新增 Deno 扫描工具，扫描 enum-like 比较、fixture 字面量、`as const` 字符串、`Record<string, string>`、`Object.entries(*LABELS)` 和 generated client string gap。 |
| `tools/enum-like-string-allowlist.json`                             | 新增显式 allowlist，记录 query params、Promise settlement、UI-only severity、demo/template UI、开放 taxonomy 和 generated client string gap。                    |
| `package.json`                                                      | 新增 `check:enum-like-strings` 本地校验命令。                                                                                                                    |
| `apps/poms-admin/src/app/features/project/project-detail.ts`        | 项目时间线归档 / 阶段完成事件比较改为 generated enum。                                                                                                           |
| `libs/admin/data-access/src/lib/auth/auth.store.ts`                 | 导航菜单类型比较改为 `NavigationItemTypeEnum`。                                                                                                                  |
| `apps/poms-admin/src/app/features/commission/project-commission.ts` | 敏感投影 mode 比较改为 `SensitiveProjectionMode`。                                                                                                               |
| `libs/admin/data-access/src/index.ts`                               | 补齐 `SensitiveProjectionMode` re-export。                                                                                                                       |

---

## 2. 扫描规则

当前工具扫描四类 POMS 高风险裸字符串：

1. `status/type/sourceType/targetType/stage/decision/mode/category/priority/...` 的字符串比较。
2. 同类字段在 specs / fixtures / object literal 中直接写字符串值。
3. `Record<string, string>` 和 `Object.entries(*LABELS)` 造成闭合枚举退化的 label map。
4. generated client model 中仍暴露为 `string` 或 `string/null` 的业务字段。

未命中 allowlist 的 finding 会导致命令失败。allowlist 不是兼容历史值，而是明确分类当前不应在前端伪造 enum 的位置。

---

## 3. 允许清单分类

| 类别                                              | Allowlist ID                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| 路由参数 / 浏览器 API / Promise 标准 discriminant | `EX57-A1`、`EX57-A2`、`EX57-A3`、`EX57-A22`                        |
| 泛型展示 helper / UI-only severity                | `EX57-A4`、`EX57-A5`、`EX57-A10`                                   |
| demo/template UI                                  | `EX57-A6`、`EX57-A7`、`EX57-A8`、`EX57-A9`、`EX57-A17`、`EX57-A18` |
| 开放 taxonomy / generated string gap              | `EX57-A11`、`EX57-A12`、`EX57-A13`、`EX57-A16`、`EX57-A21`         |
| 本地 UI mode / 测试 fixture helper                | `EX57-A19`、`EX57-A20`                                             |
| 负向测试输入                                      | `EX57-A15`                                                         |

---

## 4. 验证记录

| 命令                                                | 结果                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `corepack pnpm run check:enum-like-strings`         | 通过，199 findings 全部由 22 条 allowlist 分类。 |
| `corepack pnpm nx lint poms-admin`                  | 通过                                             |
| `corepack pnpm nx test poms-admin --runInBand`      | 通过，29 suites / 164 tests                      |
| `corepack pnpm nx build poms-admin --skip-nx-cache` | 通过；仍有既有 initial bundle budget warning     |
| `corepack pnpm run format:md:check`                 | 通过                                             |
| `git diff --check`                                  | 通过；仅有本地换行策略提示                       |

---

## 5. G3 结论

`EX-57` 已形成可执行 enum-like 字符串回归扫描、显式 allowlist 和 package script。后续业务切片新增裸字符串时，必须改用 shared value object / generated enum，或把真实例外显式登记到 allowlist 并说明 cleanup owner。
