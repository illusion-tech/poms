# FE-59A4 Provider Demo Card 风格对齐实施基线包

- Gate Status: `Pass`
- Parent: `FE-59`
- Owner: `Codex`
- Slice Type: `frontend-only`
- G1 Reviewer: `Codex local`
- G1 Date: `2026-05-07`
- Tracker Link / Row: `phase2-development-execution-tracker.md` / `FE-59A4`

## 1. 范围

本片负责把 provider 配置卡片收敛到 demo 中已有的卡片风格，避免外部身份 provider 卡片使用孤立的自定义视觉语言。

Included:

1. `IdentityProviderCard` 外层容器对齐 `demo/uikit/listdemo.ts` grid card 风格。
2. 移除未配置 provider 卡片的虚线外边框和 hover primary border 状态。
3. 未配置状态只通过 `待配置` tag、字段状态和 `配置` CTA 表达，不改变 card 容器语义。
4. 保留飞书 SVG logo、本地 provider logo 映射、configured / unconfigured card、编辑、测试连接和配置动作。
5. 补充 focused test，防止未配置卡片再次引入 dashed border。

Out of scope:

1. 不新增、修改或删除后端 public API route。
2. 不改 identity provider enum、DTO、OpenAPI 或 generated client。
3. 不改配置页 filters、dialogs、store 调用或 provider 行为。
4. 不实现 `FE-59C` 登录页外部 provider 入口或 callback 体验。

## 2. 正式输入

| Input Type     | Document / Source                                                     | Status | Notes                                     |
| -------------- | --------------------------------------------------------------------- | ------ | ----------------------------------------- |
| Previous slice | `fe-59a3-provider-official-logo-frontend-closeout.md`                 | G4     | provider logo 资产已完成                  |
| User feedback  | Current thread                                                        | Active | 要使用 demo 已有卡片风格，避免视觉混乱    |
| Demo reference | `apps/poms-admin/src/app/demo/uikit/listdemo.ts`                      | Active | grid card outer classes and card language |
| Card component | `apps/poms-admin/src/app/features/platform/identity-provider-card.ts` | Active | 调整 card style only                      |

## 3. SSOT

| Concern            | SSOT                        | Implementation Rule                               |
| ------------------ | --------------------------- | ------------------------------------------------- |
| Card outer style   | `demo/uikit/listdemo.ts`    | 使用 demo grid card 的 border / bg / rounded 组合 |
| Unconfigured state | Provider status tag and CTA | 不通过虚线边框表达占位状态                        |
| Provider visual    | `PROVIDER_LOGOS`            | 继续使用飞书 SVG logo 映射                        |
| Card actions       | `IdentityProviderList`      | 不改变 edit / test / configure output 语义        |

## 4. 路由与权限边界

No Admin route or public API route is added or changed in this slice.

Existing route `/platform/identity-providers` and permission `platform:identity-providers:manage` remain unchanged.

## 5. 读写边界

N/A. 本片只调整展示样式和 focused test，不触及 API 读写。

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
  - 卡片容器风格以 demo 现有 card language 为准。
  - 不引入新的边框语义来表达 provider 是否已配置。
