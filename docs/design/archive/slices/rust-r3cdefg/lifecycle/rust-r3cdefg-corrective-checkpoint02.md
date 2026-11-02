# RUST-R3C–G 第六项纠偏：成本错误消息原 UTF-16

- 类型：`new-real-drift`；范围仅 #88 成本创建错误文本，联合 G1 不变。
- 发现者：非作者 C；[正式 G3 首审](rust-r3cdefg/C/g3-independent-review01.json)为 Needs-correction，1 项 P2，未签 G3/G4。candidate01/02、旧通过与失败原件均保留。

合法的 `currencyCode: "A\ud800B"`、低位代理字符及 trim 后同类字符在成本项币种不一致时，Native 400 message 保留原 UTF-16。Rust 原先通过 `to_utf8_lossy` 插值，错误消息变为 U+FFFD。Root 在新 cohort 的真实双端 HTTP/PG 中复现三处差异；14 条矩阵其余一致，包括完整 astral、ASCII、NUL、引号、反斜杠、匹配币种的原响应与 PG 编码边界，以及 F 字典字段的 ASCII DTO 拒绝。

修复仅改 `project_technical_cost/service.rs` 和 `http.rs`。服务以 ASCII prefix 与原 code units 拼接；完整 Unicode 仍使用既有 String 错误，孤立代理字符使用内部 `BadRequestJs`，HTTP 通过既有 `ApiError::raw_json` 序列化原 message。DTO、守卫、路由、数据库编码及所有其他错误不变。新增两个真实 DTO→preflight 单元回归，同时验证币种错误先于金额错误。C 对五模块 51 个错误站点、34 处动态插值扩查，只发现这一处不受限原 UTF-16 损失点；F 字典代码已经受原 ASCII 白名单约束。

当前修复产物为 `c042513c98182fcf9e70a72cd71fd0b5231bc785fac86dac3ffd7b93d852c128`，40997296B。Root09 fmt/check/clippy/test/release 全部0，235 passed、54 ignored；新产物重跑45组语义、1691固定事件与14字符探针。1691完整响应对比和14精确 code units/400错误/指定 PG 观测对比均为0差异。当前45组的独立深核仍须由 C 在新候选签署。

Root08只有工具 PATH 缺项导致 fmt/rustc 未执行，原日志保留；09使用已有工具链的显式 PATH，不安装工具。重验编排器在全部 API 完成后因复用 SQL 日志名产生 EEXIST；其原 partial report 保留，resume03只补未执行的 SQL 提取与对比，未重复产品请求或改写旧原件。

两次修复前 cohort 各清171行，当前修复 cohort 清1410行，均核107张种子表原JSON精确恢复及428项权限恢复；9个历史/当前 Linux runtime均终止，browser0、12100/12200/12300端口释放，PG停止并保留卷及private。旧PG17和旧批private未触碰。

898条四平台 UI 网络原件继续归属于旧 ec988ff 产物。C确认既有 C UI 只读且没有成本 POST 表单；本次两文件仅影响上述400错误，守卫/router/GET/Native/client/Angular及其他Rust源码均原字节相同，因此新候选引用既有UI证据的因果边界，不声称在新产物上重跑UI。源差异证明与新验收原件见[新候选manifest03](rust-r3cdefg/g3-candidate-manifest03.json)。

G3首审不回写通过。新候选仍需独立G3、固定提交/主线复核与归档关闭前许可；只有本批 #88–92 各自实际G4后关闭，#85/#57保持Open。正式交付仍14/58，后续本批完成才计30/58，其余28及完整阶段验收仍未完成。
