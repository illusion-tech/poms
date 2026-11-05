#!/bin/bash
set -euo pipefail
export PATH=/home/wangzishi/.cargo/bin:$PATH
export CARGO_HOME=/home/wangzishi/.cache/poms-r4def-cargo-home
export CARGO_TARGET_DIR=/home/wangzishi/.cache/poms-r4def-target-F
export CARGO_BUILD_JOBS=2
cd /mnt/e/projects/worktrees/poms-r4f-cost-governance/poms
mode=${1:?check mode required}
case "$mode" in
  version)
    rustc +1.99.1 --version
    cargo +1.99.1 --version
    ;;
  fmt)
    rustfmt +1.99.1 --edition 2024 --config skip_children=true apps/poms-api-rust/src/attachments/store.rs
    ;;
  fmt-check)
    rustfmt +1.99.1 --edition 2024 --check --config skip_children=true apps/poms-api-rust/src/attachments/store.rs
    ;;
  clippy)
    cargo +1.99.1 clippy --offline --manifest-path apps/poms-api-rust/Cargo.toml --lib -- -D warnings
    ;;
  test)
    cargo +1.99.1 test --offline --manifest-path apps/poms-api-rust/Cargo.toml --lib k98 -- --nocapture
    ;;
  regression)
    cargo +1.99.1 test --offline --manifest-path apps/poms-api-rust/Cargo.toml --lib attachments:: -- --nocapture
    ;;
  *) exit 2 ;;
esac
