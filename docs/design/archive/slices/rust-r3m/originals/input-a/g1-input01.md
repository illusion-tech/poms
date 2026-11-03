# RUST-R3-CO A / #98 — G1 输入 01（候选，未认证）

基线 `5041275d7ad82af4becbb4462e7213ffe465bc7a`，Root 已登记 `#85 → #97 → #98`，分支 `codex/poms-r3-closeout`。A 只读审计并只写本目录；没有构建、测试、HTTP、DB、浏览器、WSL、旧 private 读取或产品修改。尚未获得本批 G2。机器矩阵见 [g1-input01.json](g1-input01.json)，逐文件原字节 pin 见 [input-pins01.json](input-pins01.json)，纯场景定义见 [lead-stage-cases01.mjs](lead-stage-cases01.mjs)。三者都不是已执行报告。

## 实质发现

**A-P2-01：系统评分和解释快照可能来自不同事实时点。** `leads/service.rs:859–868` 的 `refresh_score` 收集一次 I/F/附件事实并更新 `lead.score/rating/reason`；`:1064–1102` 的 `build_snapshot` 又收集一次事实计算 `componentBreakdown`，但 `systemScore/systemRating` 直接取已存 Lead 值。系统写路径在两个集合间允许其他真实 producer 提交；更短的顺序触发是“真实 Lead 创建 → 真实 I/F/附件增加评分事实、不 touch Lead → 提交并批准覆盖”。批准时会读取新 breakdown，却保留旧 stored score。撤销也走同一 builder。

这是静态数据流推导，**尚未执行实际失败见证**。EX54 §5.2 要求系统评分结果与其解释，EX55A-R §5 要求刷新和快照使用同一 breakdown。历史最终 phase56 的去重、原子性和 CAS，以及 phase61 的真实上传转换，都没有断言此未刷新 manual 场景或两次事实集合间的交错；不能把其绿色结果升级为本项已通过。原 TS `lead-score.service.ts:325–350` 也有相同重读方式，按本轮业务正确性规则不作为保留缺陷的理由。

正常有匹配系统 tuple 的最小方向：系统写命令一次 materialize score/breakdown，再同时写 Lead 与 system snapshot；manual/revoked 沿用对应已存 system tuple 的 formula、score/rating、breakdown/gates，另写本次覆盖的 actor/source/effective 字段。EX54 §5.1 的系统触发列出 create、评分组件更新、owner、qualify/close/convert 与公式重算；§6.2 把 approve 定义为覆盖生效及 manual snapshot、revoke 为回退系统分。EX55A-R §5 继续既有 Lead 重算路径，没有给批准/撤销追加隐式系统重算义务。因此修复不应把 GET 或 I/F/上传变成新的自动刷新入口。

**历史 Lead 缺少可匹配 tuple 的策略已由用户直接裁决。** Root 在01尚未交付时回传用户原话：**“审批事务内先补算系统评分并留快照，再执行覆盖审批；任一必要写入失败整体回滚（推荐）”**。此 fallback 仅适用于缺少可匹配系统 tuple 的历史行；正常匹配路径沿用已存 tuple，不增加无条件 manual refresh。S12明确准备带真实新事实、无可匹配快照的历史样本，审批同TX先补系统分/system snapshot，再approved/manual snapshot/既有audit，任一必要写失败全部回滚。本次只冻结输入方向，不据此自行进入G2。

另有 **A-DOC-01 输入不一致（seal前已由Root纠正）**：初始审计时，`rust-r3-scope-and-dependencies.md` 和迁移计划无日期的当前顶部写30/58、剩28，`rust-r3-operation-slices.json.nonHttpScope.future` 列 Lead 转换。Root已在01封存前修正active scope/plan/operation摘要，最终pin读取纠正后的当前原件；带日期的历史叙述保留。此项已解决，不列为当前未决产品缺口，不据此发明缺少的28项或新的转换任务。

## 真实归属与事务矩阵

所有行的精确 source/caller/guard/CAS/query/noop/evidence/stage ID 在 JSON 中逐项列出，以下为可扫描摘要。`leads/*` 均指 `apps/poms-api-rust/src/leads/*`。

| 矩阵  | 真实生产者 / 调用者                        | 同一业务事务                                                                               | 冲突、查询与空操作边界                                                                                       | 既有证据 / 本批断言                         |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| A-M01 | existing create → `create:332`             | Lead、初始 system snapshot、pending session                                                | 用户/owner/customer/source 外部预检；独立号码在主 TX 前完成；不发明创建审计                                  | E-56/E-61；S01/S08/S10                      |
| A-M02 | existing PATCH → `update:426`              | Lead CAS、`lead.updated`、必要 snapshot、session                                           | id/version/status CAS失败409；准确 noop不写；name-only 不虚增 semantic snapshot；有 P2 双重事实集合          | E-SNAPSHOT-NOOP/E-LEAD-CAS；S03/S04/S06/S08 |
| A-M03 | existing claim/assign → `assign_main:563`  | owner字段、assignment record、必要 snapshot、session                                       | public-pool/owner/org资格；同owner拒绝；真实写CAS                                                            | E-56；S04/S08/S11                           |
| A-M04 | existing qualify/close → `612/648`         | 状态、actor/time/reason、score、gate snapshot、session                                     | 已注册/可变状态与硬闸口；无DTO expectedVersion仍有数据库写CAS                                                | E-56/E-61；S01/S04/S08/S11                  |
| A-M05 | existing convert → `1188` / store `481`    | 真实 Project、Lead pointer/status/score、copy links、既有copy audit、snapshot、session     | 外部短预检释放连接 → 独立项目号 → TX重新读取资格；active/latest、排除finance/internal-assessment、保留原链接 | E-61；S01/S07/S09/S10                       |
| A-M06 | I七bool / F / upload → `collect_facts:412` | 消费者查询借同一命令连接；每个 producer 有自己的事务                                       | 多请求旅程不伪称全局单TX；I/F/upload不保证即时刷新H；GET只读stored score                                     | E-61/E-BUILD11；S01/S02/S03                 |
| A-M07 | score-overrides submit → `1256`            | pending override、submitted audit、session                                                 | 必填Lead版本+FOR SHARE、单pending唯一索引；仅已知unique冲突409                                               | E-56；S02/S05/S08/S11                       |
| A-M08 | direct approve → `1330`                    | old approved CAS supersede、pending CAS approved、manual snapshot、approved audit、session | 必填override版本、pending状态；同版本两请求200/409，单snapshot/audit；manual tuple有P2                       | E-OVERRIDE-CAS；S02/S05/S08                 |
| A-M09 | direct reject/revoke → `1399/1440`         | status/actor/reason、既有audit、session；仅revoke加snapshot                                | pending才能reject、approved才能revoke；不删除历史；revoke回退stored系统分                                    | E-56；S02/S05/S08                           |
| A-M10 | list/detail/history                        | 业务只读，不刷新或回填score/history                                                        | 先repo filter再scope/page，summary/facets在scope/page前；mine覆盖显式owner；public为null owner               | E-56/E-61；S01/S02/S06                      |
| A-M11 | existing HTTP → local validation           | 非法本地数据在预留号/业务写前拒绝                                                          | NUL/lone surrogate、money18,2、0001–9999、presence/null/UUID；公共DTO不增                                    | E-56/E-BUILD11；S10/S11                     |
| A-M12 | generic `approval/domain.rs:510`           | CommonSession机制已在R2；不是H direct override caller                                      | 三支为contract review、commission payout/adjustment；真实提交生产者属R4/R5                                   | 对A/R3 handler/job为N/A；不新增kind/job     |

人工覆盖是专用 `lead_score_override` 生命周期，不创建通用 `ApprovalRecord` 或审批 Todo。现有事件使用真实登记的 `lead.updated`、`lead-score-override.submitted/approved/rejected/revoked`、有附件复制时的 `attachment.link_copied_to_project`。`lead_owner_assignment_record` 和快照本身有actor/time/source追溯。不能为“必要审计”自行增加未经登记的 lead.created 或 snapshot-created 事件，更不能为了凑 R3 handler 把 direct override 接入 generic approval。

## 可复用证据与限制

已逐字节对比当前 H 7文件、号码、附件/存储、情报、opportunity context、Project model/store 与 `rust-check11.before` 冻结 pin，均相同；完整所选清单及实时SHA见 `input-pins01.json`。因此可以按原断言边界引用 scoped G4，不能把历史执行伪装本批执行。任何产品补丁之后，应重新按真实受影响调用链决定重跑，尤其 P2 共用 builder 和所有系统重算路径。

| ID        | 公开原件                                                                     | SHA256                                                             |
| --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| E-BUILD11 | `docs/design/archive/slices/rust-r3hijk/evidence/rust-check11/report01.json` | `076005ecbd9832ed81cf0740211822bb3075d5304af7a683f753123f8750c1e0` |
| E-56      | `…/acceptance-rust-candidate06-56/report01.json`，14组/65HTTP                | `64b2c88a63c3e70af37e023e758032dedab05219ecbb1d6c6266bf22ffe51035` |
| E-61      | `…/acceptance-rust-candidate06-61/report01.json`，2组/32HTTP                 | `82ca54730ba02adb013ab70ab73ddee2ba26aa1b61b1119cdb477c3d48f6d00f` |
| E-G4      | `docs/design/archive/slices/rust-r3hijk/g4-gate-authority01.json`            | `3f343bf1156068cc6d230c5233264e98292fbeaf43a005f81948ac6674c4df40` |

E-61 的四份文件确由真实本地 initiate/PUT/complete 产生，相关 Lead/I/F/Project/J/K 引用均来自实际 HTTP；`cloudCertification=false`。其公开报告引用 private 路径不等于本次读取 private。历史G4原件明确 `fullStageCertified=false`，因此 HTTP58/58 不替代父 #85、总体 #57 或 R4/R5 认证。

## 本批最小必要实际场景

纯定义共12组，Root 可以合并 fixture/请求，不能省略各自不变量。新增必要项是 S02 的“真实新增事实、不touchLead、direct approve/revoke”、S03 的两次事实集合间受控并发，以及用户裁决后的 S12 历史缺口 fallback。S03 可由 Root 在隔离库持有 `lead_score_override ACCESS EXCLUSIVE`，使 PATCH 在 refresh之后、读取 approved override时等待；确认 `pg_stat_activity` 等待点，再用真实 I HTTP提交改变得分的事实，释放锁。不能只凭 sleep 宣称制造交错。无mock、产品hook或新DDL；S12 prepared 历史事实按其真实标签记录，不伪称HTTP生产者。

阶段集成S01重跑真实 customer→Lead→I/F/Todo→本地上传→H刷新→qualify→真实Project→J/K。S04覆盖所有重算触发、active override保留及name/noop；S05覆盖Lead CAS、replacement approval CAS与单pending提交；S06确认同一真实stage ID在workbench/detail/history的所有权、scope和只读性；S07同Lead双转换最多一个Project。S08/S09分别故障拒绝必要snapshot/assignment/registered audit与转换copy-link写入，核业务状态/版本/历史/owner/session整体回滚，号码跳号单列。S10一次超pool容量的真实create防自锁；验证源码不变时无需机械重跑80个DTO向量。S11用真实权限和状态fixture确认双转换权限、owner资格、硬闸口不被manual高分绕过及stale409。

R4合同提交/条款/签约、R5提成提交/结算、新generic审批kind、异步评分job、云租户认证、部署和性能均N/A于本A产品补缺。本输入默认0新HTTP/DTO/DDL。完成输入后A暂停；用户历史fallback裁决已记入，但联合独立G1与线上freeze通过后，仍由Root另给明确G2及独立产品工作树。
