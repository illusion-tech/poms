#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r1b"
readonly build_image=f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || die 'Use the ordinary WSL user.'
[[ "$repo" == /home/* && "$state" == /home/*/.local/share/poms-r1b ]] || die 'Use a Linux checkout and the dedicated R1B state directory.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r0e ]] || die 'Build image scope mismatch.'
mkdir -p "$state/target" "$state/cargo-registry" "$state/cargo-git" "$state/logs"
run_args=(run --rm --workdir=/workspace/apps/poms-api-rust
    --mount "type=bind,source=$repo,destination=/workspace"
    --mount "type=bind,source=$state/target,destination=/target"
    --mount "type=bind,source=$state/cargo-registry,destination=/usr/local/cargo/registry"
    --mount "type=bind,source=$state/cargo-git,destination=/usr/local/cargo/git"
    -e CARGO_TARGET_DIR=/target)
case "${1:-check}" in
    fetch)
        # The only networked step. Existing locked versions are retained.
        "${podman_cmd[@]}" "${run_args[@]}" --network=slirp4netns "$build_image" cargo fetch
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
            'set -e; cd /workspace; node --test tools/rust-r1b/export-shared.test.mjs; node tools/rust-r1b/export-shared.mjs --check; node tools/rust-r1b/scalar-compat-oracle.mjs --check; node tools/rust-r1b/json-compat-oracle.mjs --check'
        ;;
    openapi)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" cargo run --locked -- --openapi
        ;;
    *) die 'Usage: check.sh fetch|fmt|check|oracles|openapi' ;;
esac
