#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r1c"
readonly build_image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || die 'Use the ordinary WSL user.'
[[ "$repo" == /home/* && "$state" == /home/*/.local/share/poms-r1c ]] || die 'Use a Linux checkout and the dedicated R1C state directory.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r1c ]] || die 'Build image scope mismatch.'
mkdir -p "$state/target" "$state/cargo-registry" "$state/cargo-git" "$state/logs"
run_args=(run --rm --workdir=/workspace/apps/poms-api-rust
    --mount "type=bind,source=$repo,destination=/workspace"
    --mount "type=bind,source=$state/target,destination=/target"
    --mount "type=bind,source=$state/cargo-registry,destination=/usr/local/cargo/registry"
    --mount "type=bind,source=$state/cargo-git,destination=/usr/local/cargo/git"
    -e CARGO_TARGET_DIR=/target)
case "${1:-check}" in
    fetch)
        "${podman_cmd[@]}" "${run_args[@]}" --network=slirp4netns "$build_image" cargo fetch --locked
        ;;
    fmt)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" cargo fmt
        ;;
    check)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" bash -c \
            'set -e; cargo fmt --check; cargo clippy --locked --all-targets -- -D warnings; cargo test --locked; cargo build --locked --release'
        ;;
    oracles)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" bash -c \
            'set -e; cd /workspace; node --test tools/rust-r1b/export-shared.test.mjs tools/rust-r1c/crypto-oracle.test.mjs tools/rust-r1c/database-environment.test.mjs; node tools/rust-r1b/export-shared.mjs --check; node tools/rust-r1b/scalar-compat-oracle.mjs --check; node tools/rust-r1b/json-compat-oracle.mjs --check; node tools/rust-r0f-auth-compat/run.mjs --check; node tools/rust-r1c/crypto-oracle.mjs --check; node tools/rust-r1c/projection-oracle.mjs --check; node tools/rust-r1c/session-bridge.mjs --check; node tools/rust-r1c/http-oracle.mjs --check; node tools/rust-r1c/http-database.mjs --check'
        ;;
    openapi)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" cargo run --locked -- --openapi
        ;;
    crypto-roundtrip)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" bash -c \
            'set -e; mkdir -p /workspace/tmp/rust-r1c; cargo test --locked --test auth_crypto runtime_encrypt_outputs_for_ts -- --exact --nocapture > /workspace/tmp/rust-r1c/crypto-rust.log; cd /workspace; node tools/rust-r1c/crypto-oracle.mjs --verify-rust tmp/rust-r1c/crypto-rust.log'
        ;;
    db)
        bash "$repo/tools/rust-r1c/environment.sh" status
        run_args+=(--network=container:poms-r0e-pg15
            --secret poms-r1c-app-password,target=r1c-app-password,uid=0,gid=0,mode=0400)
        "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
            'set -e; export POMS_R1C_DATABASE_TEST=1; export POMS_R1C_DATABASE_TEST_URL="postgres://poms_r1c_app:$(cat /run/secrets/r1c-app-password)@127.0.0.1:15432/poms_r1c_rust"; cargo test --locked --test auth_database -- --ignored --test-threads=1; cargo test --locked --test auth_projection_db -- --ignored --test-threads=1'
        ;;
    http-db)
        bash "$repo/tools/rust-r1c/environment.sh" status
        run_args+=(--network=container:poms-r0e-pg15
            --secret poms-r1c-app-password,target=r1c-app-password,uid=0,gid=0,mode=0400)
        "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
            'set -e; export POMS_R1C_DATABASE_TEST=1; export POMS_R1C_DATABASE_TEST_URL="postgres://poms_r1c_app:$(cat /run/secrets/r1c-app-password)@127.0.0.1:15432/poms_r1c_rust"; node /workspace/tools/rust-r1c/http-database.mjs --execute'
        ;;
    foundation-db|foundation-system)
        bash "$repo/tools/rust-r1c/environment.sh" status
        run_args+=(--network=container:poms-r0e-pg15
            --secret poms-r0e-app-password,target=r1a-app-password,uid=0,gid=0,mode=0400)
        if [[ "$1" == foundation-db ]]; then
            "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
                'set -e; export POMS_R1A_DATABASE_TEST=1; export POMS_R1A_DATABASE_TEST_URL="postgres://poms_r0e_app:$(cat /run/secrets/r1a-app-password)@127.0.0.1:15432/poms_r0e_rust"; cargo test --locked --test database -- --ignored --test-threads=1'
        else
            "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
                'set -e; export DB_PASSWORD="$(cat /run/secrets/r1a-app-password)"; node /workspace/tools/rust-r1a/system-test.mjs'
        fi
        ;;
    *) die 'Usage: check.sh fetch|fmt|check|oracles|openapi|crypto-roundtrip|db|http-db|foundation-db|foundation-system' ;;
esac
