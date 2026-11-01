# R2M 最小原 runner 义务与继承地图

这是源码及历史索引输入，不是实际验收。冻结基线第4节要求的三组原 runner，
本轮均有明确入口，不能用 API Jest817、115入口 probe 或20联合用例代替。

| 本轮义务               | 原入口与定义                                                           | 新隔离资源                                   |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| 原 Native API 回归一次 | `poms-api-e2e:e2e` + `POMS_E2E_SUITE=nest-full`，原14文件/72项         | `poms_r2m_qa_nest_api`                       |
| 双端原 foundation 一次 | 同原 Jest 配置，`foundation` 精确1文件/13项，各端一次                  | Nest API QA库、`poms_r2m_qa_rust_foundation` |
| 适用原 legacy UI 一次  | 原 Playwright CLI、原8个 spec/36项；新QA配置只固定浏览器、私有产物路径 | `poms_r2m_qa_nest_legacy`                    |

精确命令、marker、低权角色、模板及环境文件见
[QA方案](../../../tools/rust-r2m/audit-qa-contract.md)。两个小原测试树必须进入
同一QA capsule；测试源码、原断言和原 server harness 均不改。external模式
不会读取旧 managed env；不伪造r2d/ef/gh的 fixture profile/run ID。

三个QA库从本轮已逐行双零、与原初seed完整107行集相同的M两库克隆。
每个库、角色、环境文件及对象根均先证不存在；QA
app没有M表权限，marker仅owner可读。 Native
API和legacy分库，避免重seed覆盖上一组数据。QA整体资源及每个phase的真实
pass/fail/partial数据保留；停止精确owner并核端口释放。M两库继续独立逐行双零，
并在QA前后核全部107行集和ACL不变，不能把QA整体隔离冒称107表逐行adopt。

相对L的S3提交 `1a941e8047c6269b52ef4ae8174e5f450f1db2f6`，原TS API/admin/
contracts/spec/data-access未变，两份生成client的lookup切换是随后L已批准的变化，不能
统称S3全树未变。相对最终L实现 `3b154bf447df9897a934e95cb218fbdb0beaba47`，
上述完整集合的工作树、index和新增文件检查均为空。
原legacy中5个spec与R1E受审35文件索引的hash一致，另3个不在该changed-source清单，
已另与其提交baseline同名blob核同；来源层级分开记录。R1E的35个相关输入中7个harness/config
已变化，旧运行原件不能换成当前运行标签。历史原件只从受控索引引用，当前Windows
worktree/primary的精确旧原报告路径不存在，没有冒充重新读到原件。

在该保护和当前115+20及四旅程真实集成满足后，A–L未变域内的深矩阵、Native源码
观察、既有有限Unicode/SQL-wire/OBS与ignored分类可按各自来源继承，不机械再跑全历史。
当前Rust共享URI/auth入口已变，因此双端原foundation仍要实际原runner。
旧legacy中11个route-mock及加Cookie
helper保留为Native前端回归，不能转成Rust真实验收。

本地图不增加全291操作Rust迁移、全部R3–R5生产者、真实租户、部署或性能门槛。
它也不增加四平台foundation52；冻结要求是双端13各一次，四组合原页面另按本轮UI矩阵完成。
本轮实际Node公共回归按已通过common01及retry01原件复用，源码未变时不重复。
完整file/hash、读级别、原件及命令映射见同名JSON。
