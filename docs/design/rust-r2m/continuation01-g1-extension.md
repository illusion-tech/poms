# R2M continuation01 环境补充冻结

本补充承接已冻结的 R2M G1 §5/6 和失败图保全条件，保持同一 R2M 范围与公共契约。原 G1、原计划及失败运行原字节不回写；本文件与执行源、非作者复核及在线冻结回执共同构成新增资源的事前依据。当前新资源执行与 G3/G4 仍待完成。

原 Rust 运行 `561e7b81-4baa-4502-9b80-f5ce2028457a` 的外部登录审计行缺少原始 PG 出生证据。原因是旧观察器未把已证明的 `external_login_ticket` 纳入跨请求的父项闭包。已存在的审计与会话分别在事务 9302/9303 提交；不借用会话证书，不以查询所得 ID 或前后快照补造审计出生证明，也不认定该次运行通过。

## 原失败写场

保留原库 `poms_r2m_rust`、OID `17085`、owner `poms_r0e_owner`、marker `1a6b458a-2e55-4dc9-8b50-0f1947a1a7d5`、原卷、全部业务行和原始日志。完整 107 表行图 SHA-256 为 `173437bc7a1015e66ac626f2278b0a086f6b417ecadabe5e77f61dda69362459`。原始检查回执为 `tmp/rust-r2m/m5-retained-graph-inspection01.json`，SHA-256 `c1a753579e2fd544c5f707322c9a269609ba7ebd79c0452d6957fbdd13de8b55`。

Root 仅在固定身份、ACL、完整行图、零其他连接及零 prepared transaction 实时重核后，关闭该库的新连接许可。唯一允许的目录变更为 `ALLOW_CONNECTIONS false`；保持名称、OID、owner、ACL 和业务图，禁止 terminate、改名、删除、清理、认领或自动重开。先以旧库只读事务保全完整图，再关闭诊断连接，通过同一受控 PG15 的固定维护连接执行。源 `tools/rust-r2m/quarantine-m5-old-rust.mjs` 经非作者必要复核后才由 Root 执行。失败保持 incomplete，不能倒写旧清理为零。

原失败图的保全责任人为 Root，保留至 R6/R7 明确处置；阶段收口记录继续列为未认证失败证据及禁止日常连接的写场。它不作为本轮成功样本，不作为新写场模板，不妨碍在独立的新写场重做同一冻结范围。

## 新写场

同一已授权受控 PG15 使用不同名的 `poms_r2m_c01_nest` / `poms_r2m_c01_rust`，新低权角色 `poms_r2m_c01_app`，marker `abd093b8-c584-45b3-9c62-6357ad6dfa5d`，owner-only schema `r2m_c01_control`，state `/home/wangzishi/.local/share/poms-r2m-continuation01`。目录 0700、private 文件 0600，固定原端口与原协议边界。

唯一模板为已精确清理到原始完整 107 表基线的 `poms_r2m_nest`。Root 在每次 clone 前核对实际模板 OID、完整行图、ACL、零连接、零 prepared transaction 和停止的 writer 身份。原 an4c 清理回执 `tmp/rust-r2m/recovered-api-nest-an4c01.json` 已记录 117 行、6 对象、二次清理零及完整基线恢复；该回执不能代替 provision 时的实时前置检查。

新建资源必须事前不存在；不采用同名旧资源。只在新库更改 infra marker 与 ACL，撤销克隆的旧 app 权限并授新低权角色原 runtime DML 权限。新库产品 107 表在任何业务运行前必须逐行等于模板，原模板及旧 Rust 的 ACL、OID 和行图保持原状。创建失败时保留逐步资源日志，不自动 drop/reset。

低权口令、JWT、身份及 provider 密钥均新生成。仅同 cluster 的固定维护凭据可由 Root 从原 R2M 的 `private/owner-password` 以 no-follow 固定文件读取，并在新 private 以 wx/0600 存一份；不读取或复制原 env、业务 private、session、fixture、objects 或其他凭据。该有限复用不改 cluster owner 密码、不让新 guard 回读旧 private。

## 有限工具变体与重新验证

`tools/rust-r2m-continuation01` 仅承载本补充所需的固定环境变体。逐文件登记源字节、允许的 literal 环境路径/库名/role/marker/schema 替换、精确次数、派生 pin 与逆向完整字节一致；产品源码、请求、SQL、fixture 归属规则及普通 intent 校验不因变体放宽。旧加载器与新加载器分别拒绝对方身份及所有未列名身份。ambient DB/PG/MIKRO/JWT/NODE_OPTIONS 仍拒绝。

未来观察器补丁只增加已确证的 ticket 父项闭包，不回填旧事件。M4 package 子项预约只记录写前请求与唯一父 intent；最终 child.package_id 仍须绑定同一次请求实际 parent 出生证书、outer COMMIT 与独立可见性。原 list/download/package 的权限语义以现行 Native 源与原冻结输入为准，不为测试便利改变产品契约。

Native/Rust 原编译产物按原 SHA 只读复用，完整新 capsule 绑定当前有限工具源。此前合格证据保留其原环境；受影响 M4/M5 在新写场重跑。UI/Windows 如使用该变体，先绑定相应固定身份与源差异，再真实执行原四旅程矩阵。原 20 逻辑例、115 操作、URI27、UI 四组合，以及独立 G3/G4 的门槛不减少，不额外引入 R3–R7、全域生产者、部署、性能或真实云租户门槛。

设计依据：`continuation01-plan.json/md`、`m5-ticket-observation-recovery-design-review01.json`、`continuation01-design-review01.json`。具体执行源和维护凭据补充采用后续固定的 source packet 与非作者复核；在线冻结须在实际新资源创建前完成。#80/#67 继续开放，#57 保持开放。
