# GOV-16 vendor nestjs-zod 5.5.0 源码入 libs 实施基线

- Gate Status: `Pass`
- Parent: N/A
- Owner: Codex
- Slice Type: `process-only`（纯搬运，零行为变化）
- G1 Reviewer: Codex
- G1 Date: 2026-09-11
- GitHub Issue: `#49`
- Tracker Link / Row: `docs/design/phase2-development-execution-tracker.md` / `GOV-16`

## 1. 范围

- 本次目标:
  - 将上游 `BenLorantfy/nestjs-zod` **v5.5.0 tag** 的 `packages/nestjs-zod/src` 下 16 个生产源文件字节原样搬运至 `libs/vendor/nestjs-zod/src/`，随附仓库根 LICENSE（MIT）与来源/版本声明（README）。
  - 建立 Nx 库项目 `@poms/vendor-nestjs-zod`（`libs/vendor/nestjs-zod/project.json` + tsconfig + `tsconfig.base.json` 路径映射，复用 `shared-contracts` 的项目惯例）。
  - 24 个导入点 `from 'nestjs-zod'` → `from '@poms/vendor-nestjs-zod'`（显式改写，不用 tsconfig alias 隐身，避免读者误认为仍是 npm 包）。
  - 移除 `nestjs-zod` npm 依赖；`deepmerge ^4.3.1`（其唯一运行时 dependency）转为仓库直接依赖。
  - 验证搬运无损：zod 维持精确 pin `4.3.6` 前提下，`poms-api:openapi` 重生成零 diff、`shared-api-client:check`、双应用 lint/build/test、`migration-check`、`format:md:check`。
- 本次明确不做:
  - 不修改任何搬运源码——包括 GOV-15 已验证的根内联补丁（归后续"转换层适配"切片，届时在一等源码上评审）。
  - 不移植库自带的 9 个单测 / e2e：其测试设施依赖上游 monorepo 的 `@nest-zod/z`（三套 zod 变体）、`supertest` 与 vitest 体系；我方行为回归网（806 个 API 测试 + 24 处使用点的 Admin 测试 + openapi 零 diff + client check）对本切片的等价性证明更强。适配切片可选择性移植 zod/v4 相关用例。
  - 不升 zod（pin 4.3.6 延续，GOV13-E1）、不动 mikro-orm（GOV14-E1）、不部署测试环境。
- 下游可依赖的交付边界:
  - `@poms/vendor-nestjs-zod` 与 npm `nestjs-zod@5.5.0` 在 zod 4.3.6 下行为等价（以零 diff 与全矩阵为证）。
  - 后续转换层适配切片有了源码级工作面。
- 不允许下游依赖的留白:
  - 不承诺与上游后续版本自动同步（同步为可选 cherry-pick）。
  - 不承诺 `guard` / `exception` / `validate` / `response` 等未使用模块的可用性测试。

## 2. 正式输入

| Input Type      | Document / Source                             | Section / Anchor          | Status | Notes                                                                                                                |
| --------------- | --------------------------------------------- | ------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Business design | GitHub issue `#49`                            | 背景 / G0 边界            | Pass   | 用户决策 vendoring 路线。                                                                                            |
| 上游源码        | `BenLorantfy/nestjs-zod` tag `v5.5.0` tarball | `packages/nestjs-zod/src` | Pass   | 16 生产 + 9 测试文件；commit `2149e22`。                                                                             |
| 许可证          | 上游仓库根 LICENSE                            | MIT                       | Pass   | 搬运需保留版权声明。                                                                                                 |
| 使用面事实      | 仓库 grep（2026-09-11）                       | 24 文件 / 4 符号          | Pass   | `createZodDto`×19、`ZodValidationPipe`×3、`cleanupOpenApiDoc`×2、`ZodSerializerInterceptor`×1；未用 `./dto` 子路径。 |
| 依赖事实        | 上游 package.json                             | dependencies              | Pass   | 仅 `deepmerge ^4.3.1`；peers（@nestjs/common、rxjs、zod、可选 @nestjs/swagger）仓库均已满足。                        |
| 项目惯例        | `libs/shared/contracts/project.json`          | Nx library 结构           | Pass   | 复用其 project.json / tsconfig 惯例。                                                                                |

## 3. 本次 SSOT

| Concern                     | SSOT                             | Implementation Rule                                        |
| --------------------------- | -------------------------------- | ---------------------------------------------------------- |
| Business semantics          | 既有产品行为                     | 搬运必须零行为变化。                                       |
| 源码内容                    | 上游 v5.5.0 tarball（`2149e22`） | 字节原样；本片不改一行动作语句。                           |
| OpenAPI 契约语义            | HEAD 的 `openapi.json`           | 重生成零 diff 为通过标准。                                 |
| 依赖                        | package.json                     | 移除 `nestjs-zod`；新增 `deepmerge ^4.3.1`；zod pin 不动。 |
| Public route canonical path | N/A                              | 不触及 public route。                                      |

## 4. 命令与接口边界

N/A——不新增或修改任何 route、command、DTO、guard；24 个导入点为纯路径改写。

## 5. 读侧边界

N/A。

## 6. 持久化边界

N/A。

## 7. 一致性结论

- Document -> code: N/A。
- ADR-015 inventory -> route: N/A。
- Migration -> entity: N/A。
- Entity -> contract: N/A。
- Route -> command: N/A。
- Query -> view: N/A。
- Guard / permission: N/A。
- OpenAPI / generated client: 重生成零 diff + client check 零类型变化为通过标准；任何差异即阻断。
- 模块解析: `zod/v4/core`、`zod/v4`、`@nestjs/common`、`deepmerge`、`rxjs` 均由仓库依赖满足；`zod/v3` 仅被 `zodV3ToOpenApi.ts` 引用（zod4 包内含 v3 入口，可解析）。

## 8. 测试与校验

| Check                    | Required | Command / Evidence                                                         | Result                     | Gap / Reason                                         |
| ------------------------ | -------- | -------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------- |
| OpenAPI generation       | 是       | `corepack pnpm nx run poms-api:openapi` + `git diff libs/shared/api-spec/` | 通过，零 diff              | —                                                    |
| Client diff              | 是       | `corepack pnpm nx run shared-api-client:check`                             | 通过                       | 完全同步、零类型变化。                               |
| Lint                     | 是       | `corepack pnpm nx lint poms-api` / `poms-admin` / `vendor-nestjs-zod`      | 通过                       | vendor 库余 2 条 warning（上游风格），无 error。     |
| Build                    | 是       | `corepack pnpm nx build poms-api` / `poms-admin` / `vendor-nestjs-zod`     | 通过                       | —                                                    |
| Unit tests               | 是       | `corepack pnpm nx test poms-api` / `poms-admin`                            | API 806/806；Admin 358/359 | Admin 唯一失败为既有 UTC 时区断言（EX-79A 已记录）。 |
| Migration / schema check | 是       | `corepack pnpm nx run poms-api:migration-check`                            | 通过                       | —                                                    |
| 导入残留                 | 是       | `grep -r "from 'nestjs-zod'"`                                              | 为零                       | —                                                    |
| Markdown format          | 是       | `corepack pnpm run format:md:check`                                        | 通过                       | —                                                    |

## 9. 例外与风险

| Exception ID     | Level       | Scope                                          | Approved By          | Cleanup Owner                | Cleanup Due | Notes                                |
| ---------------- | ----------- | ---------------------------------------------- | -------------------- | ---------------------------- | ----------- | ------------------------------------ |
| GOV16-E1         | lightweight | 库自带单测不随迁（上游 monorepo 测试设施依赖） | 用户（会话指令授权） | 转换层适配切片按需选择性移植 | 待排期      | 行为等价性由我方矩阵与零 diff 承担。 |
| GOV13-E1（延续） | medium      | zod 精确 pin `4.3.6`                           | —                    | 后续适配切片解除             | —           | 本片不动 zod。                       |

## 10. G1 结论

- Gate Status: `Pass`
- Approved By: Codex（用户会话指令授权）
- Approved At: 2026-09-11
- Conditions: openapi 产物任何非零 diff 即阻断；源码搬运必须可追溯到上游 commit `2149e22`。

## 11. 实施适配清单（相对上游 v5.5.0 的全部偏离）

源码级（均为语法/注释级，零语句语义变化）：

| 位置                                                  | 偏离                                                                                                                                                                                                                                    | 级别   |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `response.ts` ×2                                      | `@ts-expect-error FIXME` 指令从 `assert(` 行前移至符号索引参数行前（TS 5.9.3 将错误定位到参数行，原位置指令失效）                                                                                                                       | 注释级 |
| `dto.ts` ×3、`cleanupOpenApiDoc.ts` ×3、`utils.ts` ×1 | 点访问改括号访问（`.type`→`['type']`、`.properties.root`→`.properties['root']`、`.propertyNames`→`['propertyNames']`）——消费方（ts-node/jest/webpack）按应用 tsconfig 编译 vendored 源码，`noPropertyAccessFromIndexSignature` 全局生效 | 语法级 |

未搬运：`testUtils.ts`（依赖上游 monorepo 测试设施）与 9 个测试文件（GOV16-E1）。

配置级（新增文件，不属于源码偏离）：

- vendored lib tsconfig 对齐上游严检（关闭仓库 base 继承的 `noPropertyAccessFromIndexSignature` 等四项、开启 decorators 元数据、`skipLibCheck`）。
- `apps/poms-api/tsconfig.app.json` target `es2021` → `es2022`：上游使用 ES2022 `Error(msg, { cause })`，且仓库 lint 规则 `preserve-caught-error` 要求保留 cause 链；与 base tsconfig 的 ES2022 对齐，Node 24 原生支持。
- vendored lib eslint 关闭 `@typescript-eslint/no-inferrable-types`（上游保留字面量类型标注的风格）。
- lib tags 定为 `scope:shared` + `type:contracts`（模块边界规则：`type:app` 仅可依赖 `type:contracts`/`type:data-access`，`scope:api` 仅可依赖 `scope:api`/`scope:shared`）。
- lib package.json 声明直接依赖 `zod`、`deepmerge`、`@nestjs/common`、`rxjs`、`@nestjs/swagger`；根 package.json 移除 `nestjs-zod`、新增 `deepmerge ^4.3.1`。

曾尝试后撤销（不留偏离）：移除 `{ cause: err }` 以绕开 es2021 类型限制——被 lint 规则 `preserve-caught-error` 否决，最终以 target 升级解决并恢复与上游一致。
