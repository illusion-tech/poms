# GOV-17 vendored nestjs-zod 转换层适配 zod >=4.4 实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `refactor-only`（vendored 库内部适配 + 依赖解 pin，不改对外契约语义）
- G1 Reviewer: Codex
- G1 Date: 2026-09-12
- GitHub Issue: `#51`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-17`

## 1. 范围

- 本次目标:
  - 在 `libs/vendor/nestjs-zod/src`（GOV-16 vendored，上游 v5.5.0 基础）完成 zod >=4.4 序列化适配：
    1. **根内联修法**（已验证）：`dto.ts` `generateJsonSchema` 中，`z.toJSONSchema` 根为自引用 `$ref`（`#/$defs/<键>` 且键在 `$defs`）时内联回该条目、其余 `$defs` 保留——恢复 zod 4.3.6 根内联形态。
    2. **phone mangling 修复**（待定位）：GOV-15 证据显示 DTO 路径将 `phone: z.string().nullable()` 序列化为 `array<string>`；本切片在源码级定位并修复。
  - 解除 GOV13-E1：`zod` 精确 `4.3.6` → `^4.6.1`（package.json + lib package.json）。
  - 通过标准见第 8 节；spec diff 逐项归类，client 零类型变化为硬闸。
- 本次明确不做:
  - 不修改业务 schema、DTO、契约语义或公共路由。
  - 不做"上游对齐"以外的重构（保留 zodV3ToOpenApi 等未触及路径原样）。
  - 不向上游提交 PR（独立动作，另行授权）。
  - 不动 mikro-orm（GOV14-E1）、不部署测试环境。
- 下游可依赖的交付边界:
  - zod ^4.6.1 下 OpenAPI 导出链路可用；spec 与 4.3.6 基线的差异全部归类且 client 零类型变化。
- 不允许下游依赖的留白:
  - 不承诺 zod 4.4-4.6 全量行为审计（以矩阵与 diff 归类为准）。

## 2. 正式输入

| Input Type      | Document / Source                                                           | Section / Anchor | Status | Notes                                              |
| --------------- | --------------------------------------------------------------------------- | ---------------- | ------ | -------------------------------------------------- |
| Business design | GitHub issue `#51`                                                          | 背景 / G0 边界   | Pass   | —                                                  |
| GOV-15 证据链   | `docs/design/archive/slices/gov-15-nestjs-zod-root-ref-patch-baseline.md`   | 第 11 节         | Pass   | 根提升形态、自引用碰撞 dump、phone mangling dump。 |
| GOV-16 交付     | `@poms/vendor-nestjs-zod`（上游 v5.5.0）                                    | 第 11 节适配清单 | Pass   | 源码工作面 + 9 处已记录语法适配。                  |
| vendored 源码   | `libs/vendor/nestjs-zod/src/{dto,cleanupOpenApiDoc,symbols,utils,types}.ts` | —                | Pass   | 修改落点。                                         |

## 3. 本次 SSOT

| Concern                     | SSOT                                               | Implementation Rule                                          |
| --------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Business semantics          | 既有产品行为                                       | 适配不得改变任何业务行为（806+358 测试 + 矩阵拦截）。        |
| OpenAPI 契约语义            | HEAD 的 `openapi.json` + `shared-api-client:check` | spec diff 仅允许 zod 版本表述差异；client 零类型变化为硬闸。 |
| 根内联修法                  | GOV-15 第 11 节已验证语义                          | 原样移植为 TS 源码。                                         |
| 依赖版本                    | package.json                                       | `zod ^4.6.1`。                                               |
| Public route canonical path | N/A                                                | 不触及 public route。                                        |

## 4-6. 命令 / 读侧 / 持久化边界

N/A——不新增或修改任何 route、command、DTO、guard、query、view、migration。

## 7. 一致性结论

- OpenAPI / generated client: `shared-api-client:check` 零类型变化为硬闸；spec diff 逐项归类（预期 pattern 等表述项）。
- 模块解析: 仅 vendored lib 内部实现变化；对外 API（`createZodDto` 等 4 符号）签名不变。
- 其余边界 N/A。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                    | Result                     | Gap / Reason                                         |
| ------------------------ | -------- | --------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| OpenAPI generation       | 是       | `corepack pnpm nx run poms-api:openapi`                               | 通过                       | zod 4.6.1 下导出成功。                               |
| Client diff              | 是       | `corepack pnpm nx run shared-api-client:check`                        | 通过                       | 完全同步、零类型变化（硬闸守住）。                   |
| Lint                     | 是       | `corepack pnpm nx lint poms-api` / `poms-admin` / `vendor-nestjs-zod` | 通过                       | —                                                    |
| Build                    | 是       | `corepack pnpm nx build poms-api` / `poms-admin`                      | 通过                       | —                                                    |
| Unit tests               | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                       | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言（EX-79A 已记录）。 |
| Migration / schema check | 是       | `corepack pnpm nx run poms-api:migration-check`                       | 通过                       | —                                                    |
| Markdown format          | 是       | `corepack pnpm run format:md:check`                                   | 通过                       | —                                                    |

## 9. 例外与风险

| Exception ID | Level | Scope                          | Approved By | Cleanup Owner        | Cleanup Due | Notes                                       |
| ------------ | ----- | ------------------------------ | ----------- | -------------------- | ----------- | ------------------------------------------- |
| 风险         | —     | zod 4.3.6→4.6.1 运行时行为变化 | —           | 测试矩阵拦截         | —           | 矩阵外行为差异 → 停止升级 corrective。      |
| 风险         | —     | mangling 根因若为 zod 自身缺陷 | —           | 定位后重新评估可行性 | —           | 若是,记录证据并回归 pin(同 GOV-15 止损线)。 |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-12
- Conditions: client 非零类型变化即阻断；phone mangling 若证实为 zod 自身缺陷,按止损线回归 pin 并收口证据。

## 11. 实施记录

### 修法落地（`libs/vendor/nestjs-zod/src/dto.ts`，两处 vendored adaptation）

1. **根自引用内联**（修法一，GOV-15 已验证语义）：`generateJsonSchema` 在 `toJSONSchema` 根为 `{$ref: '#/$defs/<自身>'}` 时内联回该 `$defs` 条目。
2. **type 数组归一化**（修法二，本片新定位）：

   **根因链**（源码级插桩 + 最小复现定位）：zod >=4.4 对**裸可空原语**（如 `z.string().nullable()`）的序列化从 `anyOf:[X, null]` 改为 `type: ['X','null']` 数组（带约束的可空如 `.email().nullable()` 仍为 anyOf——实测两种形态并存）。`@nestjs/swagger` 的 metadata-factory 消费路径会把 type 数组错误折叠为 `{type:'array', items:{type:第一元素}}`（最小复现确认：`phone: z.string().nullable()` 进组件后变成 `array<string>`），而 `convertToOpenApi3Point0` 只理解 anyOf+null 形态。GOV-15 观测到的 `SanitizedUserWithOrgUnits.phone` mangling 即此机制。

   **修复**：新增 `normalizeTypeArrays`，经 `walkJsonSchema` 在根 schema 与每个 `$defs` 条目上把 type 数组归一为 anyOf 形态（非 null 分支保留 format/pattern/enum 等约束），恢复管线端到端理解的形态。

### spec diff 归类

结构化深度 diff：old/new schema 数 585/585、paths 数 237/237，全部差异为 **`pattern` 值 346 处**（zod 4.6 更新内置正则：`iso.datetime` 秒段从可选改为必填、email 正则重写）→ 分类 `accepted`（zod 版本序列化表述差异，`shared-api-client:check` 证明消费方零类型影响）。

### 调试痕迹清理

源码级插桩（MF/R1/R2/COMP dump）与最小复现脚本已全部移除，vendored 源码内 `console.error` 计数为零。
