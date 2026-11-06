# #115 用户创建关联修复归档

实施 `874e35fc0af3b6cdf6f6461725eb1343152efbea`，独立 G3 已通过。固定提交、main 与线上 G4 的实际状态以独立证书和 Issue 读回为准；本归档不提前宣称 G4 完成。

仅交付既有用户创建命令：真实 UUID 及角色/组织关联、必要写同事务、引用与并发保护。Rust 416 passed / 54 ignored；实际 19 场景、11 必要写故障及重试、4 引用锁竞态。UI 有依据 N/A。精确删除121新增PK，零原件改写，两库各120表/532行及目录元数据恢复，API/PG已停止，volume/private保留。

原字节基线、输入、线上 G1 与验收位于本目录 `.bin` 文件；[原件映射](origin-map01.json)绑定原路径、字节数和 SHA256。公共运行证据保全在 evidence；private中的cookies/密码/业务行/数据库快照只以原件哈希引用，未复制进仓库。原失败、partial、ignored、既有OpenAPI200/实际201声明差异均保留原分类。

原G1基线的不可变链接仍在 `21e9124160f92dce38a5029786273fdb893759f0`；未把历史引用改写成当前业务合同。当前G3证书在 `tools/rust-r4ghi/independent/userfix-final/g3-review01.json`。R4联批#110、R5父#116/最小#117与总体#57继续开放；本片新增HTTP为0，正式Rust仍240。
