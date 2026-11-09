# H261 guard02 独立复核

结论：原 C01 四个跨项目 mutable 家族及未知新行已闭合；真实 317 的完整 65 行差分通过。仅 cases 叶变化，反向恢复精确等于原 341720 字节。作者 40 个纯例与 syntax 原件已核，独立 17 项支持检查通过。

仍有 C02 / P2：H04 首次复核没有旧 review 更新时，新 review 的 supersedes_id 可指向真实保留的其它 signal review，并通过同 xmin、有效 hash 的 36 行合成模型检查。冻结 Rust writer 规定首次为 null，否则精确同 target 前驱；需以 before 记录闭合这个边。此为工具后置校验缺口，不是实际产品失败。

H04、equal、above、complete 本版不准入；已经准入且实际消费的 below01 不受影响。后续用新的外部 edition、固定入口与另审具体 input，不覆盖 below 的原四叶。实际 H04 / pending-auth 未以本轮合成测试认证，正式 Rust 240、新增 0、G3/G4 均不签。
