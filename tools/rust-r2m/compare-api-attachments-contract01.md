# c01 M4 完整离线比较候选

固定输入为 cap `r2m-c01-joint01`：Native `an7c01a` 的四个 M4 observed/closed
子集，以及 Rust `ar4c01a` 四例。Native 整体 partial 与 M5.2/3
原失败保留，另核实际正常恢复 `2d16e0af…` 的 143 行/7 文件、第二轮零、full107
初始基线相等。Native journal 必须读该收据的 wx originalLedger，不能拿恢复后
current journal 冒原 `cd0dd18c…`。Rust 正常关闭须有 122/7 后 0/0 原记录。旧 Rust
OID17085 不连接、不读取。

Root 独占执行：

```sh
node tools/rust-r2m/compare-api-attachments.mjs --check
node tools/rust-r2m/compare-api-attachments.mjs api an7c01a ar4c01a m4cmp01
```

`--check` 只加载公共纯模块。实际命令只读本轮新 c01 原始记录、固定 managed env
密钥和 cap.storedFile 公共 immutable source
store。没有数据库、HTTP、进程或浏览器启动。输出和原错误分别 wx 写入新 c01 public
receipt / private execution-logs；公开没有原
Error、凭据、session/token、ciphertext
或物理行值。原历史失败及本比较器纯测试失败日志保留。

Root 原 21181 B 八项比较器 `60c09334…` 静态副本保存在 original-source
附件，附完整 diff。新 reader 采用原四个比较 header 和 legacy12 的既有
bcrypt/cookie/时间语义；新增 M4 有限来源桥。没有引入未完成 SourceReady 的 B
five/M3 工具，也没有修改 Root 原 compare-api、B 源或旧助手。

比较首先逐行核两端完整初始 107 表所有列，再对四例的每个 before/after 核完整 107
表列/PK、原 baseline digest 和 outsideScope 完整扫描零差。实际注册行
admission/digest 与原 journal 证明绑定；只消费 M4 末尾已证 admissions，不把
Native 后续 M5 行塞入 M4 UUID alias。每个原 HTTP entity 的完整
bytes/length/hash/JSON 一致性均验证，再比较 whole body、status、冻结四个
header；框架/cache/date 其他 header 原字节保留，不宣称全部 header
字节相等。每个主请求还须等固定公开 metadata 的 method、pathTemplate、index、实际
backend/context；未知路由、额外 query 或 query/response ID 不能获得别名。R1A
additive request ID 沿已有分类显式列出。

普通 runtime clocks 只按同 createContext 的真实 request window
注册，后续完整物理版本按实际前后顺序及有限原 writer 注册；原三项 committed
latest/default 准备只作 literal mutation，不反转。附件 uploaded/created/updated
和 link.linkedAt 必须等同本侧真实 session 的上传时刻；保 complete 的原
createContext，不能把它改成 PUT。OBS 无代理 PUT 时只用 complete 中原
`uploadedAt ??= new Date()` 来源。DTO Date 只按实际 typed
site/选中完整物理版本作原 JS 毫秒投影，Null 保真，不按 At$ 名字通放。provider
audit 的完整 before/after snapshot 由原 `auditSnapshot` 函数重放，并绑该 audit
birth request 的精确物理 before/after；只映射 credentialsUpdatedAt 的已证来源。

K adapter 直接保留 actual
wrapper.originalKPlan、rebuildInput、journal、sourcePlanId 和整 cohort direct
birth。原 reader709/source seeder 完整纯重放后，原 parser 逐 INSERT
显式列/值验证，保一个原 baseline back-pointer UPDATE；金额按精确十进制、原
literal 日期按微秒验证。只有本 run 实际十表十八个 timestamptz DEFAULT now() 目录
site 可映射缺省 created/updated，同一 site
的重复行分别计数，不能把十八列目录当成十八行测量。Native/Rust
两份真实只读目录分别 pin，不能移植身份。没有 reshape journal 冒 clock02 的旧 K
参数接口。

ZIP/K02 冻结助手中两个历史 harness pin 不能冒当前 pin。独立 bridge 记录旧
2dc/4878、实际 cap01 7a2/2d2b 和当前 original 的四个完整 direct-cohort
方法及两个完整 journal 校验块逐字相等；实际 reader 再从 storedFile
解析重核六块。仅在此明确旧组件边界与当前 ordinary/whole-direct-cohort
独立证明同时满足后，复用原逻辑 site 验证。唯一
initialized_receivable_plan_version_id 只在精确 readiness 行/列映射，不进入全局
UUID/own/cleanup alias。

上传 payload 含 runUUID：先重放原 source builder、逐本侧完整物理 hash/name/size
和实际完整下载/ZIP entry bytes 验证，再在具名 payload slot 映射
checksum；没有任意 64hex/token/sha 替换。输入字符串只在原 constructor
完整重放或原 storage-key/错误 formatter 完整验证后给具名 slot，拒 generic
run/compact/8hex 替换。

OBS provider 两个 encrypted 字段只用已签 AES256GCM 助手对实际新 env key
解密，并核本侧原 synthetic 明文；local Null 原样。原 presigned PUT
只允许完整六参数、精确 URI 编码/typed session 路径、原 Date.now/expiry 公式和
HMAC；还核原真实 peer event 的 payload/hash/canonical
request。只在上述证明后映射这一个已证签名、日期和 payload hash site，不能把整
URL 当 opaque。已签 state 助手不在 M4 中调用。

ZIP 重用成熟 STORE/CRC reader，重算原 manifest 字节顺序、typed
IDs/sourceRefs/敏感排除和实际上传成员完整字节，再用 ZIP02 验所有
local/central/end header 和 UTC 两秒 DOS 时间桶及精确微秒 24h
TTL。比较归一后的完整 manifest/成员来源及全部已验证固定 layout；不宣称原 whole
archive 或随机 ciphertext 跨端原字节相等。

十四个有意义纯测试包括真实原 planner/public-byte fs
facade、SQL/显式值/cohort/xmin/default/1µs 反例、原 provider 真实 pure presign
及八个协议篡改、完整原 wire/JSON、生产 metadata
映射、subset/partial/normal-recovery、完整107列、copy-clock 父来源和原 draft
重放。只读公共原件，Fake model 不作为 actual
birth/ownership。实际比较尚未执行，结果不提前 Pass/G3/G4。
