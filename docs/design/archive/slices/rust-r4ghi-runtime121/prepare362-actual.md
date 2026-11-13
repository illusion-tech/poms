# 纠正362：唯一真实准备执行结果

同一 `6458f733-0fe1-4b5e-b2ff-076908543af3` 按已冻结的 E1、非作者具体 G2 和实际 Root9 执行一次 `prepare-only`，退出0。原始命令时间为 `2026-11-12T23:29:17.5366673Z` 至 `2026-11-13T00:51:38.9487264Z`，总耗时4941.4120591秒；stdout为524B控制JSON，stderr为0B。命令已经结束，不得重放或再次运行作为“正式准备”。

[24项安全原件与来源映射](../../../../../tools/rust-r4ghi/runtime-recovery121/prepare362-completed-actual01/provenance.json)保留真实argv、完成记录、控制stdout、空stderr、5次进程聚合采样、13次文件元数据采样及私有保全控制记录。未复制私有state、ownership、HTTP/Auth原件、请求体或环境值。

实际生成的62 prepared产物（包含body、facts和inventory）为672398B/`b7ed0bd59bef213af4a7e479055e8221231868f052820cb4cec92d31bb3a889b`，closed journal为18238B/`606f52ff7e6682ca2e50cc34d307261c554cf237a3cb9d8d182ba95bafbc914f`，K为367950B/`847fe81ffbc4cf4f73b369ac1466e3185e051a6d0d87ca429b444111767115e7`。[非作者实际读回](prepare362-actual-readback01/review-actual-prepare-continuation362.json)1334B/`565740aa32a9c8b1b41810dd134566b2f7a6646493534b174c37669ce8d8b8c6`及其封件已通过，保持原闭8键，不增加FI许可。

独立读回从278表、4938行的实际raw/logical/count/key/xmin重建1个Tax根、2个目标、全部2个peer包和CAS，整个body、facts与ordered67均等于本次保存结果及正式历史依据。bodySHA为`0f92913cd78146402e5eb3a004f10a55c8e47417d961301210d2e7d5376dcc98`；新路径61生成的126094B完整清单确为`fdb957d8c82c0630eefa8ef0517bfa24cc0ec073fcf33bd923c78da09440946b`。相同内容并未冒充旧文件重新生成。真实命令、构造/私有能力、entry/exit/closed和K关系链均通过；K bootstrap只消费181–183原始关系段，不读取184去制造自身review。

7次HTTP实际为3次认证和4次准备GET；14份双库捕获各278表（共3892个表捕获）逐项比较后，数据库变化仅为同一新owned auth_session的一次创建及五次更新。14份捕获中的真实manager权限均为完整37项且逐值一致，GET cookie均关联同一真实actor/session。14actors仅manager cookie变化，其他字段及另外13actors保持。最终8/284源码与Root、固定mirror各420/528源/编译输入、sequence39→65的26项产物、before/after、intent、所有锁与canonical原字节均复核通过。

Root已将实际after-state及ownership原字节保存在私有目录，副本与canonical异inode。after-state为15045544B/`6c1fabbacebc43fea8636c8fd91afac81dd66e8b6200ca5a769c08ae41401b3b`，ownership为13016B/`1da85861708f1d1c37389385f6c86741e46a7053d5c0eb034260ff8c01aba517`，sequence为65。不可变before `dcac`、完整7456B/`eb4a`及原5560B/`b76` ownership前缀均已独立复核；旧owned、823/1899、old26、13/14、Main13一次201和其他全部状态保持。保全与读回均不修改应用状态。

E1总体耗时、HTTP/快照/原件时间书挡与进程聚合IO不是单checkpoint高尾样本，也不是业务接口延迟。[独立计时判断](prepare362-actual-readback01/judgment-E1-actual-prepare362.json)保留直接书挡并明确直接CP样本数为0；不能由本次准备推出618个checkpoint的全FI预算。完整67项FI仍须另外满足DDL、捕获、回滚、末次复核和关闭的整体预算；实际idle900/absolute28800/throttle60约束保持。当前预算未证明，不授FI、正常Tax或Main命令，不新增PG、迁移、重登录策略、TTL或clock改动。E1本次执行结果、计时与独立读回已归档，未测余量如实保留。

[归档来源映射](prepare362-actual-readback01/archive.json)保留原始工具停止、修正版及非作者原件。Reader的摘要/完整origin类型差异、mode/ledger/归档basename等审计工具纠正不改写任何真实准备原件，也不增加应用执行次数。活跃运行输入与私有原件保留原路径，继续由Root在父验收#114下负责。

正式统计仍为Rust240、R4 67/95、本批候选32、新增认证0，业务G3/G4未签；#57及完整R5 #116保持开放，#119保留历史技术G4。#121实际准备与技术G3已独立通过，G4关闭前资格仅限本技术子片；最终线上收口与非作者实际终审继续，本条不预先关闭Issue。

[逐项归档例外](archive-exceptions121.json)将仍由父#114消费的47份输入/历史参考逐项列明消费者、原因、Root归属及清理到期点；完整终态快照已原字节归档。当前入口及初始线上镜像已移入本归档目录，私有与活跃工具输入不搬移。
