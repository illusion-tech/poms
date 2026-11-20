03仅关闭IR107-02：原02虽正确区分Root inventory-copy和mirror实际编译，仍会把help/version/test --no-run等exit0路径当四项完整检查。01/02原封不改，03只改assertBuildFacts13内的Cargo argv核验；其余B0→总receipt108→plan108→R3→另wx B1协议逐字保留。

采用Root明确授权的固定实际协议，不使用命令名推断或选项黑名单。每项实际记录仍须kind=actual-owned-mirror-cargo-command、准确command、cwd=/home/wangzishi/projects/poms-rust-r4ghi、exitCode=0。argv必须完整逐元素等于：

- 固定前缀：`['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', <command>, '--manifest-path', '/home/wangzishi/projects/poms-rust-r4ghi/apps/poms-api-rust/Cargo.toml']`。
- fmt追加`['--', '--check']`。
- clippy追加`['--all-targets', '--', '-D', 'warnings']`。
- test追加`['--all-targets']`。
- build追加`['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08']`。

因此help/version（包括-h/-V）、test --list/--no-run、遗漏检查/示例、错toolchain/manifest/可执行文件、附加筛选参数等均拒绝，即使实际记录exitCode=0。构造器不执行任何Cargo命令，也不补true、exit0、测试数或实际结果。CARGO_HOME/CARGO_TARGET_DIR/RUSTUP_HOME由Root将来180实际原件与G2 source pin约束；本增量不猜其实际值。

Root侧仍只作完整source inventory及复制源/目标逐叶SHA观察，不称Root编译；mirror侧按上述协议真实运行一次四命令，同时重新构建API binary和r4ghi_summary_producer08例子。两个独立原件、绝对根/input/copy SHA、动态完整source数组、process/binary/ready链等02守卫均保留。

`build-shapes03.json`列的是预期命令规范，所有actual字段仍null。`input-templates13.json`与02原字节相同。Root应直接晋升03最终full candidate（若未晋升01/02，目标必须不存在；若02已晋升，before必须精确64587795…），并在G2.supportingTools.source13Constructor登记本次最终SHA。不可继续用02 pin执行03字节。

作者验证12项纯回归（原9项保留、新增help/version、test非执行路径及精确协议替代反例），syntax/help及139 index/state/after三pin只读重核。未运行constructor实际模式/Cargo/SQL/HTTP/Root写/进程操作；Source13、API136、B0/R3/B1实际输入仍null。
