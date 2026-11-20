# 17 必要写逐项失败 sweep 工具提案

仅作者 worktree 的隔离候选；Root/private/product/DB 未改。按 apply-manifest17.json 的逐文件 beforeSHA 安全晋升；10 文件为完整 candidate，可复制审阅，不晋升其余 import 依赖副本。roles.mjs 的 base 是16已冻结 after，必须先晋升16。

新增 modes：roles-and-execution-sweep、lifecycle-sweep；只用于对应尚未成功的真实阶段，已有普通成功事实不得追认 FI。逐命令全部已声明必要写 primary 实际 hit1+fallback0、同 body/CAS 失败完全回滚后，才允许唯一一次成功。若 source/coverage/expiry/HTTP/ownership 不符即保留原件停止。原 audit-only mode保持历史边界。完整 source inventory 与 SQL 注入边界见候选 required-write-inventory.mjs，运行与真实原件要求见候选 README 末17节。

10命令55家族为 prepared source inventory；闭环两次条件关闭计划合计61次失败/11次成功，并非已实际运行计数。25纯测试PASS、8模块syntaxPASS，只证明工具纯规则。SQL触发/命中/ deferred commit/真实HTTP/CAS/race仍由Root运行验证；不是全32写入验收/G3/G4。第7业务裁决、G period current政策未预判。
