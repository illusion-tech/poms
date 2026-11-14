# #118 G3装配补充：完成已冻纯数据入口

[有限装配合同](../../../tools/rust-r4ghi/runtime118-data-assembly-corrective01/Root-G3-data-entry-assembly118-01.json)补齐80ea已声明的Root HD7/C10/B5收束职责，只改既有runtime支持叶，不添加第四脚本或业务操作。旧效果13flags和所有原记录闭形保持；唯一新增私有数据入口为`--prepare-data --input FILE --input-sha SHA`，只按固定HD7/C9/B7的kind分派。

HD7调用既有holder collector；C9在全部真实步骤、source读回、原Origin和单字段X已存后生成C10；实际独审再签R8，B7才接受为B5；Source随后才能生成S4。不预造未来pin，不自签审查，不把consumer能读取当成writer已经存在。

CMD15由Root外层工具的真实wrapper退出及分别封口stdout/stderr记录，不能由仍活的WSL/holder自报。审批、R8与modelEvidence的实际核对仍由具名Root/独审承担。数据命令只wx自有固定目录，不创建锁、服务或ctx，不调用SQL、不改canonical。失败保真实已写项与主错，无新数据审批虚构；模型和实际资格分开。

新支持manifest用assemblyInputs绑定此合同；图内9和数据2仍用原CI，Q11/SQ12/Tax8不加槽，冻结G1和01候选不改。新增入口须独立定向验收，本件不授任何实际G2。
