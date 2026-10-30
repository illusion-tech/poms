# RUST-R2L / BUSINESS-LOOKUP 联合 G3 检查点

- Gate：G3 Pass；[非作者联合决定](../../rust-r2l-g3-review01.json)已绑定冻结验收与完整保全，无未闭 P0/P1/P2。允许提交和推送分支；固定提交复核、主区集成与 G4 随后实际执行。
- 范围：#79 四个既有 L 公开操作及必要真实域消费闭包；#84 两业务号 lookup 裁决与直接契约切换。类型为 cross-layer-high-risk。
- 正式输入：[联合 G1](rust-r2l-lookup-baseline.md)、[G1 独立审查](../../rust-r2l-lookup-g1-review01.json)、[实施校准](rust-r2l-lookup-corrective-checkpoint.md)。冻结时点、原件与 Gate-only 更新分列。
- 模式：既有隔离 worktree，Root 负责集成/实际执行/保全；A/B 产品作者，C 非作者；新增 UoW 取证工具另经交叉审查。显式子代理模型请求不冒称服务层独立认证。

## 已完成的有界验证

- 最终 candidate08：fmt / check all-targets / test / Clippy deny warnings / release 全退出 0，219 passed / 54 历史 ignored；169 件编译输入与主 ELF / 验证 example 分别绑定。
- 完整受控业务链：每端 114 HTTP、127 owned objects；305477 检查、0 failure / gap / difference。两端保留原四十表的完整列、版本、金额类型、时间采样和全部响应；独立自然运行的 308 个 auth_session 差异仍为 Fail。
- 原旧/新 lookup：26 个实际配对、DTO/精确 query/权限/404/敏感投影与审计；完整 OpenAPI 291 operations / 585 schemas，非目标 289 operations / 585 schemas 深度不变；579 原生成 client 中仅两个 service 文件预期变化。
- Node 实际 API 74 suites / 863 tests、admin 56 suites / 368 tests，以及适用 lint/build 通过。原离线 Corepack 与未声明 lint target 的失败分列；受影响库以同安装 TypeScript CLI 执行的替代路径单独标注，不能称原 pnpm launcher 已通过。Windows 完整 TS 的 62 项既有诊断保持分类失败。
- 原 Angular 正常与受控取消路径、31 项基础 HTTP 对照、十二类 gate/日期/竞争/晚失败、四类共享 UoW、Todo42 与 second-freeze 反遮蔽专项分别按原 ELF、source epoch、取证等级引用机器索引；不以 owner 退出 0 代替语义核验。
- 双库迁移检查保留既有 exit 1 分类；schema dump 退出 0，完整 107 表 / 1778 列 / 207 外键及 92 迁移未变，未执行生成 DDL。

## 必须完成的独立核验

最终 UoW 四组保存证据和十二边界比较已由 C 独立重放；Todo42 五个完整 mapper 和 second-freeze 反遮蔽有 D 非作者实际补证并交 C 核心复核。日期缺失/未来/当天由既有 retention-date 三个反例覆盖，不从 second-freeze 运行另行推断。四组 UoW 的 30026 项可比检查为 0 差异，各保留一项真实 Rust SQL wire 未捕获的范围边界；编译源码、真实 PG 行和 Native SQL不能改名为 Rust wire 记录。版本/JSON 原始快照的表示差异及重叠毫秒选窗按冻结量义和确切 SDK 源码具名解释，原 strict 失败、raw 值、keys、时间和版本均保留。最终 source07→08 的两个空格修正仅复用 C 明确证实未变的单行分支路径，旧 UI / 边界运行不得冒称最终 ELF 重跑。完整保全与联合 G3 的独立签署仍待完成。

## G3 与 G4 完成条件

C 的最终产品、实际矩阵与材料复核无未闭合 P0/P1/P2，docs 格式和 diff 检查通过后才能提交。随后按 solo-worktree 流程保留 S2/S3 永久祖先、提交推送、固定提交复核、干净 primary 快进与 main 推送，完成十一件生命周期归档、证据 tar 逐成员独立验证及在线 G4 回写。

L 完整 G4 后 R2 公开操作可记 108/108。#61 仅在自己的 canonical/lookup/直接切换及三个原生子项均完成后关闭。R2M #80、父 #67 / #57 和整个 R3–R5 保持 Open；无部署、真实云租户、性能或 PG17 SQL/服务变更结论。


## 固定实现提交复核

实现 `3b154bf447df9897a934e95cb218fbdb0beaba47` 已推送分支；[C 固定提交复核](../../rust-r2l-integration-review01.json)通过。169 项编译来源与 Git blob 全部 raw 一致，579 生成文件全树一致、仅两个 service 相对原基线变化，S2/S3 永久祖先保留。G3 候选之后仅有七个 Gate 文档/机器镜像与 C 决定，应用、库和工具无差异。主区快进、归档和 G4 随后实际执行。


## 主区集成

固定提交复核后，main于2026-10-30T11:23:36.418Z从02b89567干净快进至7b6f5e1ac896b29e2d623533d1a2b5f876e30462并实际推送；[原回执](../../rust-r2l-main-integration01.json)保留前后状态和remote核验。后续仅生命周期与状态镜像，不扩大运行认证范围。
