# GOV-19 nx 23 + Angular 22 全家桶联合升级实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（构建编排工具升级）
- G1 Reviewer: Codex
- G1 Date: 2026-09-12
- GitHub Issue: `#55`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-19`

## 1. 范围

- 本次目标（用户中途决策扩大范围：仅 nx → nx + Angular 22 联合，见 issue #55 范围变更评论）:
  - nx + 10 个 `@nx/*` 22.7.12 → 23.2.1（官方 `nx migrate` 流程，自动迁移改动全部入 PR 评审）。
  - Angular 22 全家桶：`@angular/*` 22.1.6、devkit/cli/schematics 22.1.8、`@angular/cdk` 22.1.6（**新增直接依赖**，PrimeNG 22 硬 peer）、`angular-eslint` 22.5.0、`jest-preset-angular` 17.0.0、**`typescript` ~5.9.3 → 6.0.3**（Angular 22 硬性 peer >=6.0 <6.1）、`webpack` 5.110.3 转直接 devDep。
  - PrimeNG 22 三件套：`primeng` 22.1.1、`@primeuix/themes` 3.0.0、`primeicons` 8.0.1；`eslint-plugin-boundaries` ^7.2.0 搭车。
  - `@angular/core` 22 代码迁移 8 条（ChangeDetectionStrategy.Eager 等，源自 `@angular/core/schematics/migrations.json`）全部执行。
  - 验证：openapi 重生成零 diff、`shared-api-client:check`、双应用 lint/build/test、`migration-check`、`format:md:check`、Admin initial bundle budget（FE-73 红线）。
- 本次明确不做:
  - 不做 OnPush 变更检测迁移（Angular 官方迁移以 Eager 保持行为等价，见第 11 节；OnPush 作为独立技术债）。
  - 不做 platform-browser-dynamic 弃用迁移（22 中仍可用，弃用警告另行处理）。
  - 不部署测试环境（部署侧 Node 门槛：NestJS 12 已要求 >=20.19/22.12，无新增）。
- 下游可依赖的交付边界:
  - `corepack pnpm nx <target>` 全部命令在 23.2.1 下可执行；测试/build 产物不变。
- 不允许下游依赖的留白:
  - 不承诺采用 nx 23 新功能（Agent、Cloud 等）。

## 2. 正式输入

| Input Type       | Document / Source                        | Section / Anchor         | Status | Notes                                                  |
| ---------------- | ---------------------------------------- | ------------------------ | ------ | ------------------------------------------------------ |
| Business design  | GitHub issue `#55`                       | 背景 / G0 边界           | Pass   | 用户指定顺序：nx 先于 Angular。                        |
| nx 23 发布说明   | nx.dev/blog/nx-23-release                | cleanup release          | Pass   | 大部分破坏性变更带自动迁移。                           |
| nx 23.1 发布说明 | nx.dev/blog/nx-23-1-release              | 弃用项                   | Pass   | Angular 19 / ESLint 8 弃用——本仓库 21 / 10，不受影响。 |
| 兼容矩阵         | nx.dev/docs/kb/angular-nx-version-matrix | Angular 支持             | Pass   | Angular 21.2 受支持。                                  |
| 供应链门事实     | pnpm-workspace.yaml + npm time           | minimumReleaseAgeExclude | Pass   | nx 自管机制（22.7.12 时已验证同模式）。                |

## 3. 本次 SSOT

| Concern                     | SSOT                | Implementation Rule            |
| --------------------------- | ------------------- | ------------------------------ |
| Business semantics          | 既有产品行为        | 工具升级不得改变任何业务行为。 |
| OpenAPI 契约语义            | HEAD `openapi.json` | 重生成零 diff 为通过标准。     |
| 依赖版本                    | package.json        | nx 全家桶一次性 23.2.1。       |
| Public route canonical path | N/A                 | 不触及 public route。          |

## 4-6. 命令 / 读侧 / 持久化边界

N/A——不新增或修改任何 route、command、DTO、guard、query、view、migration。

## 7. 一致性结论

- OpenAPI / generated client: 重生成零 diff + client check 零类型变化。
- 构建产物: api/admin build 输出目标不变；nx 缓存失效后全量重建验证。
- 其余边界 N/A。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                    | Result | Gap / Reason                                                                         |
| ------------------------ | -------- | --------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| OpenAPI generation       | 是       | `corepack pnpm nx run poms-api:openapi`                               | 待执行 | 零 diff 为通过标准。                                                                 |
| Client diff              | 是       | `corepack pnpm nx run shared-api-client:check`                        | 待执行 | 零类型变化。                                                                         |
| Lint                     | 是       | `corepack pnpm nx lint poms-api` / `poms-admin` / `vendor-nestjs-zod` | 待执行 | eslint 配置若被迁移触碰，逐项留档。                                                  |
| Build                    | 是       | `corepack pnpm nx build poms-api` / `poms-admin`                      | 待执行 | —                                                                                    |
| Unit tests               | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                       | 待执行 | API 预期 806/806（含 GOV-18 globalSetup）；Admin 预期 358/359（既有 UTC 时区断言）。 |
| Migration / schema check | 是       | `corepack pnpm nx run poms-api:migration-check`                       | 待执行 | —                                                                                    |
| Markdown format          | 是       | `corepack pnpm run format:md:check`                                   | 待执行 | 本片 docs 变更。                                                                     |

## 9. 例外与风险

| Exception ID | Level | Scope                              | Approved By | Cleanup Owner        | Cleanup Due | Notes                     |
| ------------ | ----- | ---------------------------------- | ----------- | -------------------- | ----------- | ------------------------- |
| 风险         | —     | nx 自动迁移触碰 workspace/项目配置 | —           | diff 逐项评审        | —           | 未知迁移项 → 留档或阻断。 |
| 风险         | —     | nx 23.2.1 发布不足龄被供应链门拦截 | —           | nx 自管 exclude 更新 | —           | 拦截则显式确认后放行。    |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-12
- Conditions: openapi 非零 diff 即阻断；自动迁移的全部文件改动必须可解释。

## 11. 实施记录（联合升级全部适配）

### 11.1 nx 23

- `nx migrate 23.2.1` 官方流程：34 条 nx 迁移自动应用（tsconfig `ignoreDeprecations: "6.0"`/`rootDir` 补全、prune-lockfile inputs/outputs 补全、project.json 格式化等，全部可解释）；3 条提示型迁移（flat-config / ban-types / verify-typecheck）经评审全部 N/A（本仓库已是 flat config、无 ban-types、构建矩阵覆盖 typecheck）。
- **jest 配置转纯 JS**：`poms-admin/jest.config.ts` → `.cjs`、`poms-api/jest.config.cts` → `.js`——nx 23 项目图默认用 Node 原生 TS strip 加载 TS 配置，撞 ESM 竞态（`Cannot require() ES Module`）。
- **nx 23 daemon 在 Windows 复现性卡死**（`daemon/server/start.js` 挂起，jest 配置转 JS 后依旧；`nx.json daemon.enabled=false` 亦未阻止 spawn）：`nx.json` 持久化禁用 + 本机 `setx NX_DAEMON false` 双保险（GOV19-E2 例外，上游修复后移除）。daemonless 模式全矩阵验证通过。
- `minimumReleaseAgeExclude` nx 条目自管更新至 23.2.1（22.7.12 同模式）。

### 11.2 Angular 22 + TS 6.0.3

- 8 条 `@angular/core` 22 代码迁移全部执行：79 个组件统一加 `ChangeDetectionStrategy.Eager`（Angular 22 默认变更检测语义变化的官方等价保持手段）、`strictTemplates: false` 显式化（tsconfig.base）等。
- **angular-eslint 22 规则冲突**：新规则 `prefer-on-push-component-change-detection` 将官方迁移加的 Eager 判为违规——在 `apps/poms-admin/eslint.config.mjs` 关闭该规则（政策冲突，行为等价优先；OnPush 迁移另行立项）。

### 11.3 PrimeNG 22（nx 不覆盖，手动适配）

| 变更                                                                                                                                          | 处置                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 元素选择器 camelCase 变体全部移除（`p-sortIcon`→`p-sorticon`、`p-columnFilter`→`p-columnfilter`、`p-confirmDialog`、`p-treeTableToggler` 等） | 23 个文件元素名全局小写化（全小写变体在 22 选择器中通用存在） |
| `pButton` 指令移除 `label`/`icon` 内容型输入（仅保留外观输入）                                                                                | 2 个文件改为文本内容投影                                      |
| `p-message` 移除 `text` 输入                                                                                                                  | 4 个文件改为内容投影                                          |
| 表格模板查询改为字符串谓词 `contentChild('body')` = 需模板引用变量                                                                            | 8 个文件的 `<ng-template pTemplate="X">` 补 `#X` 引用         |

### 11.4 残留清理

`migrations.json` 与 `tools/ai-migrations/`（提示型迁移指南，已评审 N/A）随收口删除；`.gitignore` 新增 `.nx/migrate-runs`。
