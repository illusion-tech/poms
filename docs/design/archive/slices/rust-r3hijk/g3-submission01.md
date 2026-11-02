# R3H–K 提交前 G3 证据

本记录提交非作者独立 G3；G3、固定提交复核和 G4 结果分别保留独立签署。当前正式交付仍为 30/58，#93–96 尚未关闭，#85/#57 保持 Open。类型为 cross-layer-high-risk，采用 solo worktree checkpoint。

## 本批边界与业务裁决

交付 H 线索及评分 14、I 情报 10、J 讨论 2、K 项目引导／时间线 2，共 28 个既有 canonical 操作。联合 G1、原字节输入及线上冻结均保留；验收准则由用户明确覆盖为业务语义、正确性和合理性。业务状态、评分快照和必要审计同命令整体提交或回滚；编号预留保持既有独立边界。CAS 失败明确 409；不会为了复刻 Node 缺陷保留双批准、分段提交或失真的金额。

必要依赖纠偏包含：Contact 显式 gender 透传、FollowUp 源锁及状态／Todo／必要审计原子性、成本／竞标／报价的唯一 current 与完整版本链、成本及报价的精确十进制。金额最多 2 位、数量／单价最多 4 位、比率最多 8 位；grossMarginRate 保持调用者提供的 signed decimal，不新增计算或区间规则。此前数量 8 位的错误前提在执行前撤回，正式 DTO、两端 validator 的数量 4 位边界未扩大。

## 最终候选与检查

最终候选为 `cb19cff248fdb44ac27269bb5f681ab24887c85b077af14032fc30a0fc8101aa`，43,654,928 B；`evidence/rust-check09` 的 fmt、Clippy（-D warnings）、all-targets test、release 均实际通过，288 passed / 54 ignored。54 ignored 保留原标签，不作为已执行通过。

`final-integrity02` 实际运行该二进制导出 OpenAPI：173 operations / 138 paths / 585 schemas；本批 28 操作与现有 Native 契约投影完全相同。1373 份 Native/UI/contracts/client 保护输入逐字节一致；客户端 579 文件、原 92 migration 不变，两实际 PG15 库的 columns/constraints/indexes/migration/428 权限完整相同。Rust 以 Cargo 为工程入口，无 Nx lint target，backend lint 由 Clippy 完成；未修改 Native/UI 工程，原构建及四 UI cell 使用冻结源，不重复生成或修改原契约。Markdown 和 diff 检查另附实际 receipt。

## 实际业务证据及候选因果边界

最终 candidate04 的 phase43 大金额原缺陷复验、phase44 的 17 组金额边界、phase45 的 17 组版本链并发／9 必要写故障／2 过期引用、phase46 的旧 30 操作及辅助回归 56 组、phase47 的业务原子性／语义去重／CAS／16 并发编号 14 组均实际通过。金额拒绝用例的七张业务表原 JSON 前后完全一致；版本故障比较全部历史父子行及 project，不只检查 current。

candidate03 的 phase34 真实本地四附件上传、Lead/I/Contact/FollowUp/Todo→转换→J/K 链及三必要写故障整体回滚通过；phase36 全 28 权限／CSRF／路由 149 请求、phase37 H80、phase38 I68 均有原件。candidate02 的 J/K95 组定义、phase24/25 实际执行保留；phase31 定向补齐 cleanupAfter、K.T05 及全部受影响 timeline 选择断言，独审确认九表只读与完整时间精度。phase42 三组 FollowUp 实际源行锁竞态全部 200/409，赢家唯一记录／Todo／必要审计。

四份新原 UI cell 为 Linux/Windows 浏览器 × Native/Rust 后端类型，均 79 个观察；实际网络分别 259/259/259/261。Windows Native 使用 win32 服务，Windows Rust cell 使用 Linux API:12500，未认证 Windows Rust 新二进制。Rust UI 证据属于 candidate03；最终相对该候选仅三金额源文件变化，其余 228 源 pin、五共享 helper 及全部 H/I/J/K/UI 源保持一致，由 C 独立决定限域因果复用，不能冒称全部在 candidate04 重跑。

## 漂移与留白

用户业务裁决覆盖旧 bug parity 冻结；旧 Native、候选及原审查保持其当时时点。旧 30 缺陷为 existing-baseline-drift，经实际复验及限定纠偏修复。额外 Zod issue 和 HTML404 正文不作为业务阻断；错误 fixture、SQL metadata 误分类及旧 pg_stat_activity 缓存分别按 tool-noise 保留。

旧单价 fixture 越界、错误枚举、失败／partial／stopped／uncertified 原件不改；误含 synthetic session hash 的 phase21 原件只留本轮 private/quarantine，公开 public02 为明确的脱敏派生，不能当原件或通过。公开 JSON corpus audit 无凭据值发现。

首次 staged diff 检查仅因两份冻结 Native excerpt 的行号后空格报错；以四个精确 current/archive 路径的 whitespace 属性保留原字节，未清洗引用原件，也未豁免产品源码。失败 common-checks01 原件与修正后的检查分别保留。

真实附件链只认证 local storage 的实际字节及本批转换复制。Native 旧附件 create-version 的 unique 失败属于旧 R2 留白；R4 只准备读取投影事实，不认证命令、审批处理器或完整阶段链。原 UI 非空日期控件、没有 UI 入口的 I PATCH/J 关联选择、Windows Rust server、本批外部署／切流／性能均未冒称已验收。HTTP58/58 仍不能关闭完整 R3 或总体迁移。

E1 五机器兼容输入 419264 B，由本批 C 明确复审并续准新增的一个纯回归消费者（22→23），Root 负责、2026-11-09 原期限不延长。G4 按 origin-map 保留执行原件并提供 canonical hash 校验入口，不新增大树兼容镜像。

## 终态与独立签署顺序

新 G2 Native/Rust 两库分别清理 1265/2371 条自有行，107 张 seed 表原 JSON 精确恢复，428 个单表权限各自恢复；原 G1 Native cohort 的独立终态原件也保留。对象、私密原始 HTTP/SQL、最终候选二进制和 PG15 卷留存，六个 Linux runtime、Windows Native、全部 UI browser/proxy 停止，五个自有端口释放，QA SQL logging 恢复 none，PG15 停止；旧 PG17/private 未触及。

只有独立 G3 Pass 后才提交；固定 commit 独审通过后集成 main，归档全部生命周期原字节，再申请独立 G4 关闭许可。实际线上只关闭 #93–96，读回 checklist/状态并回写本地，#85/#57 继续 Open。当前没有 G4 认证。
