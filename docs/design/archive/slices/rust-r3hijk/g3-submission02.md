# R3H–K G3 补正后复审提交

本提交覆盖原[首审提交](g3-submission01.md)的当前候选与终态；首审原件、manifest01/02、失败或 partial 原件不改。非作者完整 G3 首审为 Needs-correction，P1=0、P2=2，不允许提交；对应 I UUID 身份与 F 空提醒流并发，除此未发现其他新 P1/P2。当前仅请求独立 G3 复审，未认证 G4，正式仍30/58，#93–96及父#85/#57保持Open。

## 最终候选及两项补正

候选06：`66db94ce84778e4cbf7b1141b34ba5211ecc229ff40f17f8950933d5034aef67`，43,734,144 B；build11 fmt/clippy（-D warnings）/test/release均0，294 passed / 54 ignored。相对首审候选04只改变 sales_intelligence/service.rs 和 sales_follow_up/reminder.rs 两个产品文件，其余229份源 pin相同；金额修复源码、H/J/K、公开HTTP/契约/UI不变。

I 内部归属比较使用解析后的 UUID，None/非法输入不相等，保留既有 raw 显示／错误，不做全局改写。候选05与06的 I 源完全相同：phase49 前14组及 phase51 后14组共同完成28组业务断言，覆盖六个 uppercase 真实POST及相同FK、大小写list/gap相同、真正跨客户400/有效缺失404/非法400、PATCH/no-op、三类必要PATCH审计失败八表范围内的既定业务图回滚，以及新I事实→H刷新与J关联消费；phase52重跑I68定义为69组73HTTP。旧定义仍保留 Native 的400期望名，新实际成功按用户正确性裁决和本补正解释，不改旧用例标签。

F 在现有事务内先取得最具体 targetType＋UUID 的事务 advisory 锁，再读写任何提醒；source 行锁和版本重验仍在前，owner分流、生命周期及审计注册不改。候选06 phase58六组18HTTP以 SHARE Todo blocker实际看到一名INSERT等待、一名advisory等待，project/lead/customer同owner均2×201、两事实、仅一个open和一个completed；不同owner分别open。两种必要写故障全图回滚，随后同target正常提交证明事务锁释放。phase59 原同source三组3/12仍严格200/409、唯一赢家事实/Todo/必要审计。

phase55 I三类CAS及J同会话并发4/18；phase56业务原子性／语义去重／编号并发14/65；phase57旧30操作及辅助回归56/56；phase61真实四附件local字节上传、I/F/Todo→转换→J/K及三必要写故障2/32全部通过。final-integrity04实际核173操作/138路径/585schemas，本批28精确契约投影、1373保护源、579客户端、92migration、两实际schema及428权限一致。其余无变动面的历史证据按精确源差异申请因果复用，四UI仍绑定其原候选和已核平台轴，不冒称在06重跑。

## 原件和终态

I create没有既有created审计要求；EX-63B仅注册实际字段变化的PATCH updated。phase49拒绝audit权限后create201属于正常成功，Root误期望500导致partial，已保留实际成功行及前14组，后续phase51只对必要PATCH审计做故障注入；不新增created事件。

首审发现两P2后，Root仅恢复同一有标记PG15与卷，未重新迁移或seed；独立新cohort `cc20b1df-63f7-40db-b558-521474f53fb5` 从已恢复的107表快照开始。新增389行（包含两次错误探针的真实结果）已完整清理，107 seed原JSON、428权限再次精确恢复，12个Rust对象留存，全部8个Linux runtime/WindowsNative/browser/proxy停止、五自有端口释放，SQL logging none，PG15停止。先前两G2 cohort的1265/2371行和原G1 cohort终态保持各自原件；旧PG17/private未触及。

新增原始证据以 public-evidence-origin-map02 增量保全，不改首批1473文件／180442225 B及其map。候选04/05两份旧产品源码由原manifest pin比对保全，为首审和后续archive解析提供明确原件。最终294/54、各候选／原件／prepared R4／未认证WindowsRust server及既有留白均分列，不据HTTP58/58关闭完整阶段。

增量保全把已保留的失败stdout原件也复制到evidence位置，首次staged check因此重复识别其中引用的空格；同 verification 一样，将 current/archive 的 evidence 原始 .bin 流明确标为 binary，保留原字节和失败common04，最终检查另附。该属性只覆盖本批原始命令流，不豁免产品源码。

只有本次独立 G3复审Pass后才提交；固定提交、main集成、归档、独立G4关闭许可和线上实际读回另行执行。当前无提交许可或G4认证。
