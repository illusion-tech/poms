# 17a 实际 AUTH 配置绑定补充

仅5文件，追加在16→17之后；fault-sweep.mjs 的 beforeSHA 必须是17已冻结 after。原17未改。按 apply-manifest17a.json 逐文件安全晋升。

修正17仅读 /proc/environ 的错误假设：当前 Rust Config::from_sources 把显式 POMS_ENV_FILE 内容直接 override 进本地map，不写回进程。源代码实际优先级、dotenv17.4.2/26向量和 seconds safeinteger语义均已绑定。默认60/900仅在进程及实际选中文件均缺失对应key时采用。

运行时核实际PID/startTime/binary/cwd及private启动record；严格同edition private env文件、regular/no redirect/nlink1/实际process UID/mode0600以及mtime/ctime/birth不晚于启动。源码wx launcher与config/main/process_runtime、mirror源码都须精确SHA。完整env只在内存读，保留的只有两非秘密AUTH key和POMS路径；完整fileSHA/stat/proc环境hash只写本run private配置receipt，不外传env字节。后续每次比较该immutable receipt。

作者通过31纯测试（含26原Node/Rustdotenv oracle向量）与3syntax；只读核API131 env两key均缺失，未打印/复制其它字段，未替Root执行Linux配置绑定、DB、HTTP、FI。实际认证coflush覆盖仍需Root命中与整库回滚原件。
