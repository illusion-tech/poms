# EX-34 项目归档记录撤销 / 替代版本链治理 G3/G4 收口

- Gate Status: `G4 = Pass`
- Slice Type: `docs-only / route-governance baseline`
- Owner: `Codex`
- Date: `2026-04-26`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `EX-34`

## 1. 交付范围

本次完成:

1. 新增 `EX-34` G1 baseline，冻结归档记录撤销、替代、状态机、命令、查询和持久化边界。
2. 在 authoritative route inventory 中新增 `replaceProjectArchiveRecord` 与 `voidProjectArchiveRecord` 两条 planned route。
3. 将 runtime 实现拆为后续 `EX-34A`，前端入口拆为后续 `FE-31`，避免在缺少基线时直接写 API / migration / UI。
4. 将 `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE` 从开放例外收敛为后续可执行切片。

本次未做:

1. 未修改运行时代码。
2. 未新增 migration / OpenAPI / generated client。
3. 未新增前端交互。

## 2. 一致性判断

| Checkpoint                 | Result | Notes                                                              |
| -------------------------- | ------ | ------------------------------------------------------------------ |
| Document -> code           | Pass   | 当前代码保持 `recorded` 单态；三态扩展已明确归入 `EX-34A`。        |
| ADR-015 inventory -> route | Pass   | 两条 planned route 已进入 `api-route-canonical-inventory.md`。     |
| Route -> command           | Pass   | `replace` / `void` 均绑定 top-level archive record item identity。 |
| Migration -> entity        | N/A    | docs-only；后续由 `EX-34A` 执行。                                  |
| Entity -> contract/OpenAPI | N/A    | docs-only；后续由 `EX-34A` 执行。                                  |
| Query -> view              | Pass   | baseline 冻结 timeline 只消费 current `recorded` 归档事实。        |
| Guard / permission         | Pass   | 读写边界沿用项目读 / 写权限。                                      |

## 3. Drift 判断

- Classification: `N/A`
- Existing baseline drift: 当前 runtime 只有 `recorded`，属于 `EX-34` 触发的问题本体，不作为本 docs-only 切片 drift。
- New drift introduced: none

## 4. 验证

| Command                             | Required | Result                  |
| ----------------------------------- | -------- | ----------------------- |
| `corepack pnpm run format:md`       | Yes      | Passed                  |
| `corepack pnpm run format:md:check` | Yes      | Passed                  |
| `git diff --check`                  | Yes      | Passed                  |
| API lint/build/test                 | No       | docs-only; not required |
| OpenAPI / generated client          | No       | docs-only; not required |
| Migration check                     | No       | docs-only; not required |

## 5. 例外关闭

| Exception ID                            | Status | Closure                                                      |
| --------------------------------------- | ------ | ------------------------------------------------------------ |
| `EX25-E3-ARCHIVE-REVERSAL-OUT-OF-SCOPE` | Closed | 已转化为 `EX-34` G1 baseline 与后续 `EX-34A` runtime slice。 |
| `EX34-E1-RUNTIME-DEFERRED`              | Closed | 已由 `EX-34A` runtime slice 关闭。                           |
| `EX34-E2-FRONTEND-DEFERRED`             | Open   | 转交 `FE-31`。                                               |

## 6. G4 结论

- `EX-34` 作为治理基线可标记 `Done`。
- 下游不能把 `EX-34` 误解为运行时能力已交付。
- 运行时代码必须从 `EX-34A` 重新进入 `G1/G2`；前端入口必须从 `FE-31` 重新进入 `G1/G2`。
