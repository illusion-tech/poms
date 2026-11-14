# #118 实际恢复：holder、原PG与源码前完整只读基线

[Root实际检查点](../../../tools/rust-r4ghi/runtime118-early-actual01/Root-current-early-actual118-01.json)保留真实三步E9、各Root/peer链和独立读回：holder、原Podman/卷/PG15及两库readiness、源码前两份完整只读快照已通过。raw/xmin/meta/sequence/object与唯一最后成功准备关闭基线完整一致；不主张两库跨库原子性。

外层命令记录器因后代继承输出管道而未获自然EOF。Root只读已拥有Node recorder，实际取得wrapper退出码0及signal=null，另取590/0B捕获原件与完整唯一成功JSON；独立审查同意在核身份和字节不变后仅关闭本进程两个捕获读端，让原close handler封口。封后的raw逐字节不变，WSL holder没有重启或杀停，临时本机Inspector已关闭。naturalEOF=false、实际进程退出时刻UNKNOWN；CMD15 endedAt只表示实际close/封口时间，不认证精确退出耗时。

原11/284仍为交付before。Source输入已由真实RO回执和当前具名SQ构造，须另获准确Root及named peer后才交付9+2；随后才是API、源码后RO、单字段X、C/R/B/S4、NativeFS得Y和预算探针。此检查点尚无这些后续效果，CP0、全FI预算UNKNOWN、FI/normal/Main未授。#118/#57及完整R5 #116保持开放，#119/#121历史技术G4不改，业务认证0/G3G4未签。
