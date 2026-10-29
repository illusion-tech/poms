# RUST-R2L1 / ROUTE-K 公开证据保全

- 一份完整 tar：SHA-256 9bdc7797259e5dac8ca541e76d80aacc282345267dcd2f33783d4bd2443afbce，17154813 bytes。主区保留 tar、原 manifest/capture/transfer 回执及逐文件核验后的独立 payload。
- 2915 文件 / 113336847 payload bytes；初始机器验收不回写 G3/G4，后续小增量以独立 path/hash 映射追加。
- Linux archive mode 已验；Windows 仅核 payload 字节，不宣称保留 POSIX mode。private、整棵依赖和内部续接 checkpoint 均排除。
- 首次主区传输因命名父目录不存在，在创建 destination 前失败；原错误保留，第二次使用同 tar 校验成功。未重做完整归档。

[机器锚点](rust-r2l1-preservation.json)。独立 G3、代码提交集成、G4 与子 Issue 在线回写另行记录。
