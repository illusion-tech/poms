//! A real child process checks teardown of a started blocking worker. No
//! password benchmark, product test hook, database or new HTTP route is used.
#![cfg(unix)]

use std::{
    error::Error,
    io::{BufRead, BufReader, Write},
    process::{Command, ExitCode, Stdio},
    sync::mpsc,
    thread,
    time::{Duration, Instant},
};

#[test]
#[ignore = "child fixture: explicitly executed by blocking_worker_does_not_extend_process_shutdown"]
fn blocking_child_fixture() -> Result<(), Box<dyn Error>> {
    if std::env::var("POMS_R1C_BLOCKING_CHILD").as_deref() != Ok("1") {
        return Err("run through the owned child regression".into());
    }
    let result = poms_api_rust::process_runtime::run(async {
        let shutdown = match poms_api_rust::lifecycle::shutdown_signal() {
            Ok(signal) => signal,
            Err(_) => return ExitCode::FAILURE,
        };
        let (started, ready) = tokio::sync::oneshot::channel();
        tokio::task::spawn_blocking(move || {
            let _ = started.send(());
            thread::sleep(Duration::from_secs(60));
        });
        if ready.await.is_err() {
            return ExitCode::FAILURE;
        }
        println!("R1C_BLOCKING_WORKER_STARTED");
        if std::io::stdout().flush().is_err() {
            return ExitCode::FAILURE;
        }
        shutdown.await;
        ExitCode::SUCCESS
    })?;
    if result != ExitCode::SUCCESS {
        return Err("child runtime failed".into());
    }
    Ok(())
}

#[test]
fn blocking_worker_does_not_extend_process_shutdown() -> Result<(), Box<dyn Error>> {
    let mut child = Command::new(std::env::current_exe()?)
        .args([
            "--ignored",
            "--exact",
            "blocking_child_fixture",
            "--nocapture",
        ])
        .env("POMS_R1C_BLOCKING_CHILD", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()?;
    let output = child.stdout.take().ok_or("owned child stdout missing")?;
    let (ready, received) = mpsc::channel();
    thread::spawn(move || {
        for line in BufReader::new(output).lines().map_while(Result::ok) {
            if line.contains("R1C_BLOCKING_WORKER_STARTED") {
                let _ = ready.send(());
            }
        }
    });
    let result = (|| -> Result<(), Box<dyn Error>> {
        received.recv_timeout(Duration::from_secs(5))?;
        let started = Instant::now();
        let status = Command::new("sh")
            .args([
                "-c",
                "kill -TERM \"$1\"",
                "r1c-owned-child",
                &child.id().to_string(),
            ])
            .status()?;
        if !status.success() {
            return Err("owned child signal failed".into());
        }
        loop {
            if let Some(status) = child.try_wait()? {
                if !status.success() {
                    return Err("owned child exited unsuccessfully".into());
                }
                break;
            }
            if started.elapsed() >= Duration::from_secs(2) {
                return Err("blocking worker extended process teardown".into());
            }
            thread::sleep(Duration::from_millis(10));
        }
        Ok(())
    })();
    // A failed assertion must not leave even this synthetic sleeping child.
    let _ = child.kill();
    let _ = child.wait();
    result
}
