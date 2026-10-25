#!/usr/bin/env sh
set -eu
# Run in a network-disabled container without any credential secret mounted.
export R0E_EXPECT_DATABASE=poms_r0e_rust
probe=/target/release/poms-r0e-dependency-probe
expect_refusal() {
    label="$1" expected="$2" url="$3"
    if output=$(R0E_DATABASE_URL="$url" "$probe" 2>&1); then
        printf 'Unexpected success: %s\n' "$label" >&2
        exit 1
    fi
    printf '%s\n' "$output" | grep -F "$expected" >/dev/null
    printf 'REFUSAL_PASS: %s\n' "$label"
}
expect_refusal pg17_port 'port must be 15432' 'postgres://poms_r0e_app:unused@127.0.0.1:5432/poms_r0e_rust'
expect_refusal existing_database 'database must match' 'postgres://poms_r0e_app:unused@127.0.0.1:15432/poms'
expect_refusal administrator_role 'dedicated runtime role' 'postgres://poms_r0e_owner:unused@127.0.0.1:15432/poms_r0e_rust'
export PGOPTIONS='-c timezone=UTC'
expect_refusal inherited_options 'refuses inherited PGOPTIONS' 'postgres://poms_r0e_app:unused@127.0.0.1:15432/poms_r0e_rust'
