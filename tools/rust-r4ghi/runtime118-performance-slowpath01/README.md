# #118 现存R输入与慢路径组件证据

`retention-index.json`保留原件与副本身份，初始26对包含错误/不匹配的盘点、失败正向和已完成R组件；后续03材料单独追加索引。未将旧失败覆盖或改成通过。

开发驱动原路径后被03版本复用的事实另由`retention-origin-path-correction.json`记录；旧版本bin字节完整，但旧Full3原路径不再匹配，不认证复制件为原件别名。旧索引保持，详细纠正在交付文档。

420源码清单68385B/SHA4f20c984…、528编译清单83968B/SHA3197f243…均从现存R文件重建并与既有描述符精确匹配。这些组件副本不是原P清单Full3身份，不能作实际samePin准入。

详细数据、模型路径桥、样本数、未覆盖项见[交付文档](E:/projects/worktrees/poms-r3hijk-next28/poms/docs/design/rust-r4ghi/runtime118-performance-review-and-slowpath-2026-11-16.md)。本机Windows R文件段包含完整现存420/528/229/284文件与原函数体，不是完整CP/close，也不含M、P历史、ELF、当前进程或数据库。

可串行重放组件（仍非实际预算入口）：

```powershell
& 'C:/Users/ynh2/AppData/Roaming/fnm/node-versions/v24.19.0/installation/node.exe' 'tools/rust-r4ghi/runtime118-performance-slowpath01/replay-r-files.mjs' '03'
```

读取同一工作树真实文件并校验固定清单，新的输出仅写R/tmp专属目录；不启动Debian、不运行pnpm、不实际SQL/HTTP/Auth/新快照/探针、不清理OS缓存。原测driver原字节以bin保留，公开replay只调整输入/输出位置与显式候选选择，不替换实际Source/Native身份。
