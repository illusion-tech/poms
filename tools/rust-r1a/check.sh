#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r1a"
readonly build_image=f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 ]] || die 'Use the ordinary WSL user.'
[[ "$repo" == /home/* && "$state" == /home/*/.local/share/poms-r1a ]] || die 'Use a Linux checkout and the dedicated R1A state directory.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r0e ]] || die 'Build image scope mismatch.'
mkdir -p "$state/target" "$state/cargo-registry" "$state/cargo-git" "$state/logs"
run_args=(run --rm --workdir=/workspace/apps/poms-api-rust
    --mount "type=bind,source=$repo,destination=/workspace"
    --mount "type=bind,source=$state/target,destination=/target"
    --mount "type=bind,source=$state/cargo-registry,destination=/usr/local/cargo/registry"
    --mount "type=bind,source=$state/cargo-git,destination=/usr/local/cargo/git"
    -e CARGO_TARGET_DIR=/target)
verify_database() {
    bash "$repo/tools/rust-r0e/environment.sh" status
    # The app role cannot read r0e_control. Verify its immutable marker through
    # the existing local owner connection in a read-only transaction; no grants.
    local verified
    verified="$("${podman_cmd[@]}" exec poms-r0e-pg15 psql -X --no-psqlrc -Atq \
        --set=ON_ERROR_STOP=1 --host=/run/postgresql --port=15432 \
        --username=poms_r0e_owner --dbname=poms_r0e_rust --command="
        BEGIN READ ONLY;
        SET LOCAL statement_timeout='5s';
        SELECT current_database()='poms_r0e_rust'
          AND current_setting('server_version_num')='150012'
          AND current_setting('poms.r0e_isolated', true)='on'
          AND EXISTS (SELECT 1 FROM r0e_control.marker
                      WHERE database_name=current_database()
                        AND instance_id='f055884e-5eaf-44ad-a51e-ab9d3a2627ff');
        ROLLBACK;")"
    [[ "$verified" == t ]] || die 'R0E database identity changed; review the baseline before testing.'
}
case "${1:-check}" in
    lock)
        "${podman_cmd[@]}" "${run_args[@]}" --network=slirp4netns "$build_image" cargo generate-lockfile
        ;;
    fmt)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" cargo fmt
        ;;
    check)
        "${podman_cmd[@]}" "${run_args[@]}" --network=slirp4netns "$build_image" bash -c \
            'set -e; cargo fmt --check; cargo clippy --locked --all-targets -- -D warnings; cargo test --locked; cargo build --locked --release'
        ;;
    db)
        # Container identity is checked before credentials or database access.
        verify_database
        run_args+=(--network=container:poms-r0e-pg15
            --secret poms-r0e-app-password,target=r1a-app-password,uid=0,gid=0,mode=0400)
        "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
            'set -e; export POMS_R1A_DATABASE_TEST=1; export POMS_R1A_DATABASE_TEST_URL="postgres://poms_r0e_app:$(cat /run/secrets/r1a-app-password)@127.0.0.1:15432/poms_r0e_rust"; cargo test --locked --test database -- --ignored --test-threads=1'
        ;;
    openapi)
        "${podman_cmd[@]}" "${run_args[@]}" --network=none "$build_image" cargo run --locked -- --openapi
        ;;
    system)
        verify_database
        run_args+=(--network=container:poms-r0e-pg15
            --mount "type=bind,source=$repo/tools/rust-r1a,destination=/checks,ro=true"
            --secret poms-r0e-app-password,target=r1a-app-password,uid=0,gid=0,mode=0400)
        "${podman_cmd[@]}" "${run_args[@]}" "$build_image" bash -c \
            'set -e; export DB_PASSWORD="$(cat /run/secrets/r1a-app-password)"; node /checks/system-test.mjs'
        ;;
    *) die 'Usage: check.sh lock|fmt|check|db|openapi|system' ;;
esac
