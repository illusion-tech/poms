//! Process bootstrap owns runtime teardown after the HTTP/database lifecycle
//! has drained or exhausted its deadline. Started blocking workers cannot be
//! aborted, so implicit Runtime::drop must not add an unbounded second wait.

use std::{future::Future, io, process::ExitCode, time::Duration};

pub fn run(future: impl Future<Output = ExitCode>) -> io::Result<ExitCode> {
    let runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()?;
    let result = runtime.block_on(future);
    // This does not claim to cancel an in-flight bcrypt worker. The process
    // exits immediately after returning; its existing lifecycle already owns
    // the complete grace period and reports a missed deadline as failure.
    runtime.shutdown_timeout(Duration::ZERO);
    Ok(result)
}
