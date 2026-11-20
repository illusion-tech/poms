# Runtime121 纠正361代码交付与精确源提升请求

本记录承接[纠正361冻结输入](runtime121-corrective361-code-input.md)。四个执行叶、两个图外数据适配器及 Root 源提升工具均已通过独立代码审查；实际源提升和状态续接尚未执行，业务 G3/G4 仍未通过。

## 代码与独立证据

- 联合四叶 manifest：5441 B，SHA256 `e0a6d99f3094132fc896f7c3ec72116efc4735f1764de3d0cd2f6ede66ce8f9c`；独审件 8711 B，SHA256 `63d2f46d655b85f33b03933bc0298506a7d5caa229c75d1734e0a5299c3cbca4`。
- 两个图外数据适配器 manifest：9340 B，SHA256 `8cd522e78fb72cfff665de6e0fd1464a49c64fd63f0593036b6416c049da8695`；独审件 4575 B，SHA256 `35e79639cdafc561f699d2ce8b1baf2d6ae1a0dc9b3350110d46ca29f4d5eb75`。
- Root 提升工具：14337 B，SHA256 `5f4b205f3e93391c264ce045ed7d531d50f8336c171cbb200b73c12159cd3af0`；独审件 32383 B，SHA256 `b100de3b805adc290671622057e705e00e56cb60ab3725bc621f62e98441cddf`。
- 独立验证包括 Tax02 的 33 项、Core 的 50 项、数据适配的 37 项、作者封存的 88 项新模型独立复跑、六源 syntax，以及提升工具 31 项 own-I 文件与闭形投影检查。模型不是实际运行验收。
- Tax01 的真实文件替换竞态 NOTREADY、最初模型观察器失败及修正后的封件均保留原有标签，没有替换成成功记录。

上述原字节和真实源指向可从 `tools/rust-r4ghi/runtime-recovery121/corrective361-source-request01/raw-copies-provenance.json` 的十五项映射逐项核对。没有公开私有状态正文、环境值或启动日志。

## 具体请求与权限边界

Root 已于 `2026-11-12T16:46:02Z` 完成一次 metadata-only 请求生成，退出 0。nonce 为 `a3d3040f-54ce-4f37-85ea-1aaacb18fe0d`：

- 实际 request：2901 B，SHA256 `681ea4a9af1f19c45ca740e65993cb39340fcd8ad30efb339ec821e62faed08f`。
- 实际 input：1117 B，SHA256 `cccfd8efc4bcb3f610a945ee863ab4f897b10b5368d7c19466ed11aa5ef31173`。
- 六源计划：6359 B，SHA256 `37bfc6fc1660ecb440f493e206086450a36bf504882affa3cc048e3bdf56621f`。
- 预期 Root 审批件：1460 B，SHA256 `644fc4106e79eaba99d4f6667272d1f499b023863e7ee90f0be5789990b137b8`；截至本记录尚未签署或产生。

实际请求保存在私有 `runtime121-corrective361-source-inputs/<nonce>/`，公开副本位于上述 Root 归档目录。独立精确输入审查仍需消费真实请求及已通过的代码证据，不能把代码审查件当作执行许可。

后续 Root 审批只允许四个生产 MOD、两个图外数据 MOD，以及真实新图和 witness/successor 元数据。执行图保持 helper229 / external55 / execution284，四项 raw hash 变化、其余280项保持；旧 M06、原9阶段、四旧源和原审批件保持原样。提升工具校验私有状态、所有权和失败证据的原字节，不写 canonical state，不控制 API/PG，不重试任何业务模式。

实际提升并独立读回后，才可使用新的 v2 plan、独立 peer7 和 Root12 单独审查受控状态续接。首次失败 prepare823、完整32bd状态、旧26文件及 failed-preserve journal 均保留；Main13 的原一次201不重放。

## 未完成边界

真实状态续接、全新 prepare-only 构造器与入口/出口验证、完整67项 FI、另审的唯一 Tax 正常命令及后续业务验收均未完成。官方统计仍为 Rust240、R4 67/95、候选32、新增认证0。#57 与完整 R5 #116 保持开放，#119 的历史技术 G4/CLOSED 不变。
