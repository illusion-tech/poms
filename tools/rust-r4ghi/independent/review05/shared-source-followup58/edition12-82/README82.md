82 仅修复已提升81在005514只读准备停点暴露的NUMERIC类型判据。原partial e1d8d970db761edd49edd02b976bc414d8580940639b0f1ac6e7b45a85619920和81不改。Root phase已exit1，尚未到纠正POST；已实际发生的登录等HTTP原件仍保留。

真实PG JSON的allocation_weight是数字，原始lexeme为1.000000/2.000000；普通JSON.parse结果是1/2。新共享helper使用Node24 JSON.parse context.source直接取该列原数字字节，只把精确1(.0...)或2(.0...)的准入结果标作'1'/'2'。Stage准备和deriveSharedFacts两个判据都读取pinned result row.raw调用它。没有Number/string往返、舍入、权重更新或金额算法变更；原后置金额/权重/ratio/measurement逐原字节比较保留。

四个精确delta为inventory、preparation、相关测试、required-source58，当前152个business helper/155个helper pins、Source12/API135、406/5263和binary de8不变。source58重新pin三个变动mjs；其它当前Root helper逐SHA核不变。Root应按manifest82.files的beforeSHA精确提升这四个文件，以新phase重新从未消费的真实Stage停点继续，重新真实登录/读preparation；不能复用旧失败或称已FI。

新增两项测试覆盖真实numeric六位小数形状、JSON.parse为数字的原反例，以及text/exponent/fraction/被浮点舍入成2的原始近似值拒绝。Windows全部130、Linux新增27通过，三个mjs解析0。另FS-only核真实003079 after的basis/result/source-slot/cost全字段：三金额层和measurement按BigInt平衡、ratio6精确合1、2/1原lexeme、原源版本与币种、NUMERIC字段实际存在全部通过，明确仍是134历史形状检查，非135 HTTP。

Tax的保旧指标判据只有在每个真实affected target旧context已消费该批份额时才适用。新同日E/F事实可能合法进入旧同日root，不能为等于旧指标丢弃事实或裁剪target。按Root顺序先Stage82实际完成，再Taxfixture/prep；真实完整targetPreparations须在Tax纠正POST前另行审阅，当前82不预授Tax sweep。所有Root SQL/HTTP、产品、旧原件及Git均由Root独占；作者没有执行这些动作，G3/G4未签。
