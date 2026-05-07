# FE-59A3 Provider 官方 Logo 资产实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59A3`

## 1. 范围

本片负责把 provider 卡片中的飞书入口从通用 PrimeIcon 调整为本地 SVG logo 资产。

Included:

1. 新增飞书 SVG logo 静态资产，放入 `apps/poms-admin/public/identity-providers/`。
2. `IdentityProviderCard` 使用 provider -> logo asset 映射渲染品牌图标；无资产映射的 provider 继续使用通用 fallback icon。
3. 保留 configured / unconfigured card、编辑、测试连接和配置动作行为。
4. 补充 focused test，覆盖飞书卡片使用 SVG logo 资产。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider enum、DTO、OpenAPI 或 generated client。
3. 不新增钉钉、企业微信等 provider 资产。
4. 不实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 2. 正式输入

| Input Type     | Document / Source                                                     | Status | Notes                                |
| -------------- | --------------------------------------------------------------------- | ------ | ------------------------------------ |
| Previous slice | `fe-59a2-provider-fixed-card-entry-frontend-closeout.md`              | G4     | provider 固定卡片入口已完成          |
| User feedback  | Current thread                                                        | Active | 飞书最好使用官方提供的 logo SVG 资源 |
| Card component | `apps/poms-admin/src/app/features/platform/identity-provider-card.ts` | Active | 替换 provider visual mark            |
| Asset pipeline | `apps/poms-admin/project.json`                                        | Stable | `public/**/*` 会复制到应用根路径     |

## 3. SSOT

| Concern          | SSOT                               | Implementation Rule                            |
| ---------------- | ---------------------------------- | ---------------------------------------------- |
| Provider asset   | `PROVIDER_LOGOS` in card component | provider logo 路径集中映射，不散落模板条件     |
| Feishu asset URL | `/identity-providers/feishu.svg`   | 运行时引用本地 public asset，不依赖远程 CDN    |
| Fallback icon    | `PROVIDER_ICONS`                   | 未来 provider 没有 logo asset 时仍可正常渲染   |
| Card actions     | `IdentityProviderList`             | 本片不改变 edit / test / configure output 语义 |

## 4. 路由与权限边界

No Admin route or public API route is added or changed in this slice.

Existing route `/platform/identity-providers` and permission `platform:identity-providers:manage` remain unchanged.

## 5. 读写边界

N/A. 本片只新增静态资产并调整展示组件，不触及 API 读写。

## 6. 持久化边界

N/A. 本片不触及 migration、entity、DDL 或 seed。

## 7. 测试与校验

| Check               | Required | Command / Evidence                                                                       | Result     |
| ------------------- | -------- | ---------------------------------------------------------------------------------------- | ---------- |
| Card focused tests  | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-card` | Pending G3 |
| Page focused tests  | Yes      | `corepack pnpm nx test poms-admin --runInBand --testPathPatterns=identity-provider-list` | Pending G3 |
| Admin lint          | Yes      | `corepack pnpm nx lint poms-admin`                                                       | Pending G3 |
| Admin build         | Yes      | `corepack pnpm nx build poms-admin`                                                      | Pending G3 |
| Markdown            | Yes      | `corepack pnpm run format:md:check`; `git diff --check`                                  | Pending G3 |
| API lint / build    | No       | N/A                                                                                      | N/A        |
| OpenAPI / migration | No       | N/A                                                                                      | N/A        |

## 8. 例外与风险

| Exception ID | Level | Scope | Approved By | Cleanup Owner | Cleanup Due | Notes              |
| ------------ | ----- | ----- | ----------- | ------------- | ----------- | ------------------ |
| N/A          | N/A   | N/A   | N/A         | N/A           | N/A         | No exception at G1 |

## 9. G1 结论

- Gate Status: `Pass`
- Approved By: `Codex local`
- Approved At: `2026-05-07`
- Conditions:
  - SVG 作为本地静态资产交付，避免生产运行时依赖远程资源。
  - Provider logo 映射保持模块化，后续 provider 只补资产和映射。
