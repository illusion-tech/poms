# 22 决策8真实组织承接创建生产链候选

仅I工具内Root-owned六个完整Rust候选，Root产品/DB/HTTP未改。按manifest精确当前Root29 beforeSHA应用；服务update开始至reassign helper之前完整byte相等，保留UpdateProjectMetadata OwnerWrite/Common/audit/noop与Reassign200。21税务候选另封，Lead逻辑不改。

CreateProjectRequest.initialOwnership可选非nullable，缺省creator、显式creator保持原责任。organization真正ownerNULL，ownerOrg从当前DB账号primaryOrg读取并锁定，后由原责任helper核activeOrg和真实creator M。NewProject将nullable owner与真creator分开，created_by/updated_by固定真creator。现有外TX真实插入project→v1origin→必要创建audit→pendingauth；错误整体回滚（原独立编号留号合同保持）。

同TX新插入证明只在origin生产当场检查实际project.xmin/current physical xid，不拿HTTP requestId当TX，不给普通旧row补v1。Scope direct-create增加合法org-owned空owner分支，个人origin永久非bootstrap；长期不依赖历史xmin。精确来源/字段/hash/liveorg/M/nohistory及创建audit全部保留/补核，完整合法分支见bootstrap-source-audit-matrix22.json。audit缺失/歧义/SQL错误失败关闭。

Root先Shared131/delta03/S6导出ProjectInitialOwnership同名生成enum（无重复手写模型），M97 SQL-first仅CREATE OR REPLACE现insert guard，不改已执行M95/M96，不增表列/回填。m97-initial-ownership.sql未执行，139表不变；09 FIXED.migrations97。Native若不支持组织模式须明确422，不能忽略字段制造个人项目，Root统一处理。

5个真实Rust parser/source分支回归已准备，Rustfmt检查通过；作者未Cargo/PG/HTTP/M97。真实默认/组织producer、首派耗尽、双首派CAS/UIspare在独立tool23准备，Root统一执行，非G3/G4。
