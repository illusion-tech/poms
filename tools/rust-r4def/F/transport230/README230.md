# 230：小包传输差额诊断与原e5发布候选

核心原因已由离线实包复现：同一`26 ^25`默认pack为4,887,761 B／314 objects，与Root实际POST 4,887,973 B仅差212 B协议开销。仅加`-c pack.useSparse=false`后为181,330 B／151 objects，少4,706,431 B、163 objects。Root原408,385 B是新blob逐件zlib估重，不是实际Git pack；delta可以使真实小包更小，默认sparse遍历也可使其多包含对象。

26父提交确为25，e5与29的tree均为`27a0e702ab3e3fd40d1f945f77333f9297c4001b`；没有发现父链断裂或需要改e5的证据。Git官方说明默认sparse对象遍历在某些直接rename情况下会多送对象；本批原件移到archive的形态与该机制相符。[pack-objects文档](https://git-scm.com/docs/git-pack-objects)

## 现在可走的最短路线

1. Root现有Linux/private credential流程只加`-c pack.useSparse=false`；仍使用实际old SHA的lease，将moving small25依次推进26、27、28、29。每跳必须实际读回exact SHA。本包不发起push。
2. 29成功后，不假定普通e5 push已缩至1个commit：实测`e5 ^29`仍9,778,119 B／3,731 objects，path-walk也仍9,579,767 B。旁支common-tree未被完整排除，继续尝试压缩级别不能替代对象选择。
3. Root可择以下一种最后载体。两种都保留原e5及S4、均不把临时链合入main。实际服务器接受与exact SHA读回仍待Root执行。

## 最后载体A：793 B标准receive-pack请求

`final-payload230.json`描述两个互斥请求，二选一：

- `create-exact-e5-temp230.receive-pack.bin`：旧OID全0，仅创建`refs/heads/codex/poms-r4def-transfer-e5-exact230`指向原e5；要求此ref当前不存在。
- `replace-small25-after29.receive-pack.bin`：旧OID精确为29，只把已有moving small25改指原e5；属于独立临时ref的有界非FF替换，要求Root实际核其旧SHA。

两个请求均为793 B，内含`original-e5-only.pack`：640 B／1 object。此pack显式列原e5 commit对象，不做tree/history遍历；本地已核pack checksum、full-commit type、声明size、解压原字节与`cat-file commit e5`完全相同、Git对象SHA正是`e5f13b05a47766a4c6a3aa13b7fc7a39799b3e76`。未重新序列化author/date/message，原签名与所有commit header字节均保留。

严格前置为：29已实际在远端且其tree精确等于e5；d6父对象仍可用；新鲜receive-pack广告包含`report-status`；所选ref旧OID匹配。Root用既有私密认证通道POST至`https://github.com/illusion-tech/poms.git/git-receive-pack`，请求body原样二进制发送，Content-Type及Accept见plan。不得只凭HTTP200认证成功，须核`unpack ok`、`ok <exact ref>`及随后新鲜远端ref SHA读回。该包只触临时ref；原e5被远端广告后，再由Root按exact旧SHA lease正常发布原e5到main/feature。清理时以实际最后SHA为lease。

请求采用官方pkt-line command、flush、pack排列，仅请求`report-status`。[Git推送协议](https://git-scm.com/docs/gitprotocol-pack) 本地协议/对象校验已通过，GitHub实际接受尚未观测，不把它标成已发布。

## 最后载体B：一次REST tree-ref后使用原生Git

如Root希望保持最终提交由原生Git发送，可在29成功后，通过`POST /repos/illusion-tech/poms/git/refs`消费`create-tree-advert-ref230.json`，建立一个临时lightweight tag直接指向已在远端的e5 tree。该JSON只引用既有tree，不上传84 MB内容，不创建或改写commit。必须核API响应与后续Git广告确实为该tree OID；GitHub若拒绝此非commit tag引用，则不声称本分支已通过，改用载体A。

离线`e5 ^29 ^TREE`为640 B／1 object；Git 2.55的send-pack会把已广告且本地存在的OID作为negative交给pack-objects，因此新广告的tree可以显式排除整棵已在远端的树。随后仍加`pack.useSparse=false`并用原有exact旧SHA lease发布原e5，tag只作传输辅助，最后按exact tree SHA清理。[Git源码send-pack.c](https://github.com/git/git/blob/v2.55.0/send-pack.c#L96-L105)、[GitHub create reference](https://docs.github.com/en/rest/git/refs#create-a-reference)

不要用普通`git push TREE:refs/tags/...`创建这个tree-ref：本地同方向实包反而125,386,216 B／15,787 objects。REST引用既有对象与Git遍历发送tree是不同操作；该大pack仅作为已排除路线的本地诊断保留。

## 已测小包

| 输入         | 条件                       | 实际pack bytes | objects |
| ------------ | -------------------------- | -------------: | ------: |
| 26 ^25       | 默认                       |      4,887,761 |     314 |
| 26 ^25       | no-sparse                  |        181,330 |     151 |
| 26 ^25       | Root opt221参数＋no-sparse |        181,179 |     151 |
| 27 ^26       | no-sparse                  |        387,969 |      13 |
| 28 ^27       | no-sparse                  |        438,389 |      54 |
| 29 ^28       | no-sparse                  |        225,144 |     110 |
| e5 ^29       | no-sparse                  |      9,778,119 |   3,731 |
| e5 ^29 ^TREE | no-sparse                  |            640 |       1 |

逐包JSON记录命令、SHA256、对象数与耗时；`.pack`只在作者目录产生。`measure230.py`仅执行本地只读pack-objects，`prepare-final230.py`仅cat-file/rev-parse/单对象pack及本地payload校验；没有refs/index更新、凭据读取或真实push。

## 交付与采纳范围

`manifest230.json`的`supportFiles`是可由Root做guarded intake的小型支持件。`localDiagnosticPacks`及stderr只保留在F作者WT，尤其125 MB的tree诊断不得随支持包重新塞进Root metadata。旧e5、原9149原件、S4和708产品均不由本支持包改写。

本次只完成传输诊断与候选载体，未观测实际服务器成功，未取得Issue关闭许可，未认证online/Final/Seal或完整R4/R5。临时ref不进入main的父链。
