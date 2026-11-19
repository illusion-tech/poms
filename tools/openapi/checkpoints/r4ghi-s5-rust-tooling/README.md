# S5 Rust 导出工具准入

固定输入为 A `883f88fdf4fd609bb8b0725b28bda011d408d6ee`；本提交只登记完整 shared enum 导出工具。Root 已复核独立审查发现的 foreign-prefix 与 parent-underflow 修正并复跑反例。注册、来源和同值不同名义类型边界保持原样。实际 write/check、Rust 编译及业务 G3/G4 另行留证。
