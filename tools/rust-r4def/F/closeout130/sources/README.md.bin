# POMS（Project Oriented Management System）

**POMS 项目导向管理系统** 是面向项目型软件销售场景的内部业务平台，以项目为中心，连接客户线索、销售推进、合同移交、回款成本、经营核算和提成结算，将公司《销售规范流程制度（试行）》与《销售提成方案制度（试行）》中的关键流程与规则落到系统中。

本仓库采用 **Nx Monorepo**，同时维护 Angular 管理后台 `poms-admin`、NestJS 后端 `poms-api`、前后端共享契约、生成式 API 客户端、数据库迁移及自动化测试。

## 业务能力

主要业务链路：

**客户与线索 → 立项与评估 → 技术、成本及报价评审 → 签约与移交 → 执行、回款与经营核算 → 提成发放与最终结算**。

| 领域       | 已有实现                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| 客户与销售 | 客户、联系人、线索、销售跟进、销售情报与业务讨论                                                           |
| 项目管理   | 项目列表与详情、负责人调整、签约前总览、技术与成本、招投标与商务竞标、报价与毛利评审、验收、完工与归档记录 |
| 合同与移交 | 合同管理、签约就绪检查、合同承接、项目移交确认、移交附件清单与打包下载                                     |
| 资金与经营 | 应收与回款、应付与付款、发票台账、实际成本归集、项目经营总览、偏差与风险解释                               |
| 提成治理   | 规则版本、角色分配与冻结、冻结争议处理、提成计算与重算、分阶段发放审批与记录、质保金及最终结算             |
| 平台管理   | 用户、角色与权限、组织、导航、字典、系统设置、个人资料、外部身份提供方及组织同步，含飞书适配               |
| 公共支撑   | 工作台与待办、审批、附件中心、运行时审计、业务历史及敏感字段可见性控制                                     |

关键业务动作由后端校验前置条件。例如，提成角色冻结关联已确认的项目移交及有效快照；提成计算要求规则版本已激活、角色分配已冻结，并保留计算版本与重算关系。

财务相关功能以业务登记、确认和台账跟踪为基础。提成发放记录与实际银行付款有不同职责，具体边界见 [ADR-007：第一期财务联动与业务登记边界](docs/adr/007-phase1-finance-integration-and-recording-boundary.md)。模块存在不代表所有设计目标或外部集成均已完成验收。

## 技术栈

下表版本对应当前 `package.json` 的依赖声明；精确依赖解析以 `pnpm-lock.yaml` 为准。

| 层次         | 技术与用途                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------- |
| 前端         | Angular 22，Standalone 组件、路由懒加载、Signals 状态管理，配合 RxJS 处理异步数据               |
| 界面         | PrimeNG 22、PrimeUIX 主题、Poseidon 布局资源、Tailwind CSS 4、SCSS、Chart.js                    |
| 后端         | NestJS 12，按业务领域组织模块，提供 REST API 与 Swagger 文档                                    |
| 数据持久化   | PostgreSQL、MikroORM 7，使用实体、数据库迁移与种子数据管理持久化结构及初始化数据                |
| 接口契约     | Zod 4、仓库内维护的 `@poms/vendor-nestjs-zod`、OpenAPI、OpenAPI Generator 生成的 Angular 客户端 |
| 认证与授权   | 服务端会话、HttpOnly Cookie、CSRF 校验、权限守卫及敏感字段投影                                  |
| 工作区与语言 | Nx 23、pnpm 12、TypeScript 6；包管理器版本由 `packageManager` 固定                              |
| 测试与检查   | Jest、Playwright、ESLint，以及仓库内的 Markdown 表格和枚举字符串检查工具                        |
| 发布运维     | Nginx、PM2、Deno 本地发布编排脚本，包含迁移检查、发布验证和回滚入口                             |

## 架构与数据流

后端采用模块化单体结构，由 `AppModule` 统一装配项目、合同、提成、平台治理等领域模块。前端页面通过 `libs/admin/data-access` 中的 Store 与生成客户端访问 API，Store 使用 Angular Signals 管理页面状态。

接口契约的维护链路为：

```text
后端 DTO / Zod Schema 与控制器
    → OpenAPI 规范（libs/shared/api-spec/openapi.json）
    → 生成的 Angular API 客户端（libs/shared/api-client）
    → 前端数据访问层（libs/admin/data-access）
    → 管理后台业务页面（apps/poms-admin）
```

- `libs/shared/contracts` 保存前后端共享的权限键、状态枚举等业务定义。
- `libs/api/contracts` 保存后端领域 DTO 与校验契约。
- `libs/shared/api-client` 是生成产物，应通过生成任务更新。
- Web 登录使用会话 Cookie；写请求携带 CSRF Token，后端统一执行认证、CSRF 和权限检查。
- 数据库结构变更由 `apps/poms-api/src/migrations` 中的迁移管理，种子数据用于开发、测试或特定环境初始化。

## 目录结构

```text
poms/
├─ apps/
│  ├─ poms-admin/                  # Angular 管理后台
│  │  └─ src/
│  │     ├─ app.routes.ts          # 应用路由及权限要求
│  │     └─ app/
│  │        ├─ core/              # 认证等前端基础能力
│  │        ├─ features/          # 客户、线索、项目、合同、提成、平台等页面
│  │        ├─ layout/            # 应用布局
│  │        └─ demo/              # UI 模板示例
│  ├─ poms-admin-e2e/              # Playwright 页面流程与权限场景测试
│  ├─ poms-api/                    # NestJS 后端
│  │  └─ src/
│  │     ├─ app/core/             # 认证、持久化、健康检查、审计、敏感字段控制
│  │     ├─ app/features/         # 各业务领域模块
│  │     ├─ config/               # 环境变量校验、加载与 OpenAPI 配置
│  │     ├─ migrations/           # 数据库迁移
│  │     └─ seeders/              # 开发、测试与业务试用初始化
│  └─ poms-api-e2e/                # 按业务领域组织的 API 端到端测试
├─ libs/
│  ├─ admin/data-access/           # 前端 Store、API 集成与 CSRF 拦截器
│  ├─ api/contracts/               # 后端领域 DTO 与 Zod 契约
│  ├─ shared/
│  │  ├─ contracts/               # 共享业务定义
│  │  ├─ api-spec/                # OpenAPI 规范
│  │  └─ api-client/              # 自动生成的 Angular API 客户端
│  └─ vendor/nestjs-zod/           # 仓库内维护的 NestJS / Zod 适配库
├─ docs/
│  ├─ adr/                        # 架构决策
│  ├─ design/                     # 系统与业务域设计、实施治理及历史归档
│  ├─ modules/                    # 模块详细设计入口
│  ├─ operations/                 # 部署、发布、回滚与运行手册
│  └─ reference/                  # 术语、字典、模板与参考材料
├─ deploy/                        # Nginx、PM2、环境配置模板与 Deno 发布脚本
├─ tools/                         # OpenAPI 生成、Markdown 表格、枚举检查工具
├─ .agents/skills/                # 项目实施、GitHub 任务与提交规范技能
├─ nx.json                        # Nx 任务编排与缓存配置
├─ package.json                   # 依赖、常用脚本与包管理器版本
├─ pnpm-workspace.yaml            # pnpm 工作区与依赖构建策略
├─ tsconfig.base.json             # TypeScript 基础配置与路径别名
└─ deno.jsonc                     # 文档维护与部署任务
```

业务制度源文档位于 `docs/` 根目录。构建与测试生成的 `dist/`、缓存及本地环境文件不属于业务源码。

## 本地开发

### 环境与依赖

准备与当前依赖兼容的 Node.js，以及 `package.json` 中 `packageManager` 指定版本的 pnpm。文档维护与发布脚本还需要 Deno；API 客户端生成任务使用 PowerShell 和 OpenAPI Generator，需准备 Java 运行环境。

```bash
pnpm install
```

后端业务运行需要可访问的 PostgreSQL。环境变量可放在仓库根目录 `.env` 或 `apps/poms-api/.env`，也可通过 `POMS_ENV_FILE` 显式指定文件；默认查找时根目录 `.env` 优先。

参考 [环境变量模板](deploy/env/poms-api.env.example)，按本地环境配置数据库连接、`DB_CONNECT=true`、端口及 Cookie 参数。配置项以 [environment.schema.ts](apps/poms-api/src/config/environment.schema.ts) 为准；部署模板中的域名、路径和安全 Cookie 设置需要按本地环境调整。

在独立开发数据库上执行迁移，并按需初始化开发数据：

```bash
pnpm nx run poms-api:migration-up
pnpm nx run poms-api:seeder-run
```

种子数据用途见 [Seeders 说明](apps/poms-api/src/seeders/README.md)。默认 `DatabaseSeeder` 用于本地开发和 E2E，不用于共享业务试用环境。

### 启动前后端

分别在两个终端中运行：

```bash
# 后端
pnpm nx serve poms-api
```

```bash
# 前端，等价于 pnpm nx serve poms-admin
pnpm start
```

- 管理后台默认地址：`http://localhost:4200/`。
- API 默认地址：`http://localhost:3333/api`。
- Swagger 默认地址：`http://localhost:3333/api-docs`。
- 前端开发服务器将 `/api` 代理到 `http://127.0.0.1:3333`，可通过 `POMS_API_PROXY_TARGET` 修改目标地址。

### 构建与检查

```bash
# 构建前端与后端
pnpm build
pnpm nx build poms-api

# 前端与后端单元测试
pnpm test
pnpm nx test poms-api

# 前端与后端 lint
pnpm lint
pnpm nx lint poms-api
```

根目录的 `build`、`test`、`lint` 脚本只针对 `poms-admin`；后端通过对应 Nx 任务单独执行。前端构建产物位于 `dist/apps/poms-admin/browser`，后端产物位于 `dist/apps/poms-api`。

端到端测试：

```bash
# 首次运行浏览器测试时安装 Chromium
pnpm exec playwright install chromium

pnpm nx e2e poms-admin-e2e
pnpm nx e2e poms-api-e2e
```

两个 E2E 任务都会先执行 `poms-api:seeder-run`，测试也会创建或清理业务记录，应连接独立测试数据库。浏览器测试配置见 [playwright.config.ts](apps/poms-admin-e2e/playwright.config.ts)，后端测试约定见 [API E2E 说明](apps/poms-api-e2e/README.md)。

### 接口规范与客户端

```bash
# 生成 OpenAPI 规范
pnpm nx run poms-api:openapi

# 生成客户端；该任务会先生成 OpenAPI
pnpm nx run shared-api-client:generate

# 检查客户端与当前接口规范是否一致
pnpm nx run shared-api-client:check
```

### 文档检查

```bash
# 检查 docs/ 下的 Markdown 表格格式
pnpm run format:md:check

# 单独检查根 README 的表格格式
deno run --allow-read tools/format-md-tables.ts --check README.md
```

## 部署与文档入口

`deploy/` 保存部署模板和本地 Deno 编排脚本。测试环境使用 Nginx 托管前端并代理 API，PM2 管理后端进程；发布流程在切换 release 目录前执行数据库迁移检查，并提供验证及回滚任务。

- [部署模板与命令](deploy/README.md)
- [发布脚本说明](deploy/scripts/README.md)
- [运维文档入口](docs/operations/README.md)
- [业务与设计文档总览](docs/README.md)
- [需求说明](docs/design/poms-requirements-spec.md)
- [系统高层设计](docs/design/poms-hld.md)
- [实施治理规则](docs/design/implementation-governance-gates.md)

仓库只保存配置模板和文档，不提交真实证书、私钥、数据库密码、会话凭据或对象存储密钥。功能范围应结合当前代码和对应验收证据判断，历史设计与归档材料用于说明决策及演进过程。
