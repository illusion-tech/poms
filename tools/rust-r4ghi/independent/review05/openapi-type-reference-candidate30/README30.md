单文件候选在 PomsSchemaGenerator 顶部增加标准 `/// <reference types="../../../types/mikro-orm-schema" />`。直接把真实类型桥加入单入口编译图，解决 ts-node 默认 files=false 不读 app include glob 的情况；没有 runtime d.ts import 或工具 --files 覆盖。

真实 app Node10 options、仅 helper 单入口的 VFS 探针：baseline 不加载 bridge，复现6错；候选自动加载现有 bridge，0诊断。当前 ESLint lintText 为0error/0warning，未加 suppression；去注释后的实际 emitted JS 完全相同。最初 path reference 被现有 triple-slash-reference lint 规则拒绝，原失败保留，故采用规则允许且实际解析成功的 types reference。

exact pins、patch、proof30.json 俱在。Root 非作者审查并精确应用后，应重跑实际 Nx OpenAPI 入口，保留 export10 原失败；本候选自身不宣称 OpenAPI 已导出，不改 Root 产品/SDK/shared 或 Rust epoch08。
