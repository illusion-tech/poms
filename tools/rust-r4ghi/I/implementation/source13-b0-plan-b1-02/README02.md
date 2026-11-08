02只关闭A107的P2：原5e59构造器允许同一个receipt和同三pointer配完整相对source数组重复当Root/mirror。原1b74/5e59封件保留为该缺口原件，不改标通过。最终构造器只有assertBuildFacts13这一函数变化，其余B0、migrationReceipt、108 plan、B1、wx/no-state/no-counter/H0/139 pin语义逐字不变。

Root实际流程是一次真实mirror编译：Root侧只做完整source inventory读回及复制来源/目标SHA对照，不要求Root目录再编译，不称Root cargo exit0。mirror侧才执行真实owned mirror fmt/clippy/test/build。不能把一个完成记录复制成两种label，也不要求为满足构造器写伪true。

build-shapes02.json给准确字段形状，所有实际pins/结果均null。actualBuild新kind为actual-Source13-source-inventory-and-owned-mirror-build-binding。

- Root.receipt与mirror.receipt必须不同绝对file且不同rawSHA。实际读取仍由read13校验regular单link/realpath/hash；合并receipt不属于本次Root选定流程。两个不同文件同一内容也不能计两次。
- Root原件kind=actual-Source13-source-inventory-and-copy、operation=source-inventory-and-copy、root=Root绝对根、destinationRoot=owned mirror。沿Root.sourceStablePointer核真实稳定观察，inputsPointer读取Root下canonical绝对文件/SHA，copiedInputsPointer读取mirror下canonical绝对目标/SHA，每个Source13叶都须一致。不要求Root cargo记录或Root exitCodePointer。
- mirror原件kind=actual-Source13-owned-mirror-cargo-checks-and-build、operation=fmt-clippy-test-build、root=owned mirror。mirror.inputsPointer必须记录mirror根下canonical绝对文件/SHA，每叶须与Root源及Root实际copied target hash一致；相对数组、跨根、路径别名、重复或缺叶都拒绝。
- mirror.stepPointers四个不同pointer分别指真实fmt/clippy/test/build command原件中的记录。每项kind=actual-owned-mirror-cargo-command、command准确、cwd为owned mirror、exitCode=0，argv是实际绝对cargo入口及相符子命令（可有+toolchain）。一份build step不能借四个pointer或标签充四次。指针对应真实记录，不在此执行cargo。
- mirror.binaryPointer读取该真实build产物file/rawSHA，必须等B0实际运行process.record.binary/binarySha256及top-level binding.binary；不能拿旧535/composed或旧1351输出。

Root按实际观察写上面两个独立原件，当前实际shape中sourceStable/inputs/copy/steps/binary全部仍null。若实际原件使用不同字段名，可在binding的明确pointer字段映射，实际kind/root/operation/cwd/argv/exitCode规则固定。所有输入必须源于Root实际读回/复制/命令完成，不由构造器填true或运行第二次编译。

其余原README13顺序仍适用：真实139→正常168bundle→164after→总receipt108→actual新136/build/ready/B0→final plan→R3→另wx B1→私有85 JSON。R3.consumer.candidateReceipt永远B0，不倒写B1；H0不变、没有H1；G2.supportingTools.source13Constructor应改为02最终代码pin，G2不含最终source digest，actualSource13输入仍全null。

验证9项纯回归、syntax/help、实际139 index/state/after三pin FS重核；覆盖一次mirror happy path、同receipt/同SHA/同raw重复、相对source数组、错copy目标/摘要、错根、错cargo退出码/命令/pointer和旧binary拒绝。未运行constructor实际mode、编译、Root写、SQL、HTTP或进程。
