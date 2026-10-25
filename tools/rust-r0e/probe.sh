#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly state="$HOME/.local/share/poms-r0e"
readonly source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly build_image=f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244
readonly runtime_image=docker.io/library/debian@sha256:7ff6ba31527b9e336162fa061746c366c4b2032f4d2cff2078bea43f78efe3f8
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || die 'Run as the ordinary WSL user.'
[[ "$state" == /home/*/.local/share/poms-r0e ]] || die 'Unexpected state root.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r0e ]] || die 'Build image scope mismatch.'

case "${1:-run}" in
    build)
        mkdir -p "$state/probe/src" "$state/target" "$state/cargo-registry" "$state/cargo-git" "$state/logs"
        cp "$source_dir/probe/Cargo.toml" "$source_dir/probe/Cargo.lock" "$source_dir/probe/rust-toolchain.toml" "$state/probe/"
        cp "$source_dir/probe/src/main.rs" "$state/probe/src/"
        "${podman_cmd[@]}" run --rm --network=slirp4netns \
            --mount "type=bind,source=$state/probe,destination=/workspace" \
            --mount "type=bind,source=$state/target,destination=/target" \
            --mount "type=bind,source=$state/cargo-registry,destination=/usr/local/cargo/registry" \
            --mount "type=bind,source=$state/cargo-git,destination=/usr/local/cargo/git" \
            -e CARGO_TARGET_DIR=/target "$build_image" bash -c \
            'set -e; cargo fmt --check; cargo clippy --locked --all-targets -- -D warnings; cargo build --locked --release'
        ;;
    run)
        bash "$source_dir/environment.sh" status
        database="${2:-poms_r0e_rust}"
        [[ "$database" == poms_r0e_rust || "$database" == poms_r0e_nest ]] || die 'Only R0E databases are allowed.'
        "${podman_cmd[@]}" run --rm --network=container:poms-r0e-pg15 \
            --mount "type=bind,source=$state/target,destination=/target,ro=true" \
            --secret poms-r0e-app-password,target=r0e-app-password,uid=0,gid=0,mode=0400 \
            -e "R0E_EXPECT_DATABASE=$database" "$runtime_image" sh -c \
            'export R0E_DATABASE_URL="postgres://poms_r0e_app:$(cat /run/secrets/r0e-app-password)@127.0.0.1:15432/$R0E_EXPECT_DATABASE"; exec /target/release/poms-r0e-dependency-probe'
        ;;
    abi)
        "${podman_cmd[@]}" run --rm --network=none \
            --mount "type=bind,source=$state/target,destination=/target,ro=true" "$build_image" sh -c \
            'set -e; getconf GNU_LIBC_VERSION; readelf -h /target/release/poms-r0e-dependency-probe; readelf -l /target/release/poms-r0e-dependency-probe; readelf -d /target/release/poms-r0e-dependency-probe; readelf --version-info /target/release/poms-r0e-dependency-probe; ldd /target/release/poms-r0e-dependency-probe'
        ;;
    guards)
        "${podman_cmd[@]}" run --rm --network=none \
            --mount "type=bind,source=$state/target,destination=/target,ro=true" \
            --mount "type=bind,source=$source_dir/verify-refusals.sh,destination=/verify-refusals.sh,ro=true" \
            "$runtime_image" sh /verify-refusals.sh
        ;;
    tools)
        "${podman_cmd[@]}" run --rm --network=none "$build_image" sh -c \
            'set -e; cat /etc/os-release; getconf GNU_LIBC_VERSION; rustc -Vv; cargo -V; cargo fmt --version; cargo clippy --version; node -v; pnpm -v; corepack --version; corepack pnpm --version; deno --version; java -version; psql --version'
        ;;
    *) die 'Usage: probe.sh build|run [poms_r0e_rust|poms_r0e_nest]|guards|abi|tools' ;;
esac
