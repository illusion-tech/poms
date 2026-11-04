# R4 二批附件生产链纠偏

真实附件验收52的前五阶段已通过：首版普通与敏感附件均由正式上传完成入口创建，直接项目和合同关联、非空最终版移交包、字节 checksum、敏感默认排除及冻结材料均有真实回执。新版本 complete 返回500。原失败保留，不重放已确认的 PUT。

独立定位53确认一项 P1：原 store 为复刻 Native，先 INSERT 新 latest 再 UPDATE 旧 latest，违反 `uq_attachment_latest_active`。新附件与继承关联使用的 UUID 本身有效。原 complete 还把 validating、附件/关联、audit 和 completed 分成多次提交，catch 会再次 flush 失败的新实体。这不符合用户要求的业务正确性和必要写入整体回滚。

本纠偏只涉及既有 `attachments/service.rs` 与 `attachments/store.rs` 的必要支持机制，不增加或重计公开操作，不改 DTO、DDL、依赖或永久 S4。精确原件、提案与独立复核由54输入记录约束。

完成规则如下：

1. 上传完成先验证已有对象；仅暂存新附件、继承关联及完成状态。成功时新附件/关联、旧 latest 交接、session completed、必要 audit 与 pending auth 在同一数据库事务提交。必要写失败时恢复请求内 dirty context，不再次 flush 失败的新实体，不把 SQL 失败持久化为伪成功或终态。已上传对象仍可按真实会话状态与 CAS重试。
2. 事务内先锁定/复核真实上传会话的版本和状态，再锁定版本组；有序释放旧 latest/final 后再占用新标记。旧附件继续 active，非最终新版本不得清除旧 final。版本冲突返回409，不能绕过唯一约束或先在另一事务撤旧标记。
3. 与该链相关的附件 metadata、mark/clear final、void、link/unlink 及 upload-session 创建/中止，把必要 audit 与原业务变更合并到已有单次 flush。中止必须先成功提交终态，再尽力移除暂存对象；失败或输给完成命令时不得删除有效附件对象。保持公开权限、实际字节校验、版本身份及历史冻结材料规则。
4. 原 validating 会话只按实际 GET 的版本和状态恢复；已完成步骤不得自动重放。SQL、audit、继承关联及提交阶段故障须证明所有业务行回滚；真实并发须保持唯一 latest/final、完整版本/关联、无错误 completed 或对象删除。

实现前独立复核精确提案；实现后重跑相关 Rust 检查、真实二进制上传/下载、版本切换、旧本人确认失效、final/hash稳定性、必要写回滚和受控并发。仍须完成独立 G3/G4。#106/#107 与 #101/#57 保持开放。
