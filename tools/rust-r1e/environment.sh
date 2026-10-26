#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r1e"
readonly build_image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ "$(id -u)" != 0 && "$repo" == /home/* && "$state" == /home/*/.local/share/poms-r1e ]] || die 'Use the dedicated Linux checkout as the ordinary WSL user.'
bash "$repo/tools/rust-r0e/environment.sh" status
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r1c ]] || die 'Build image scope mismatch.'
case "${1:-status}" in
    provision|status|migrate|catalog|seed|env) mode="${1:-status}" ;;
    *) die 'Usage: environment.sh provision|status|migrate|catalog|seed|env (no reset or drop).' ;;
esac
if [[ "$mode" == provision ]]; then
    mkdir -p "$state/private" "$state/logs"
    chmod 700 "$state/private"
    if "${podman_cmd[@]}" secret inspect poms-r1e-app-password >/dev/null 2>&1; then
        [[ -s "$state/private/app-password" ]] || die 'Existing R1E secret requires its original private credential file.'
    else
        [[ ! -e "$state/private/app-password" ]] || die 'Review an existing credential before creating a missing secret.'
        head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$state/private/app-password"
        chmod 600 "$state/private/app-password"
        "${podman_cmd[@]}" secret create --label org.poms.scope=rust-r1e poms-r1e-app-password "$state/private/app-password" >/dev/null
    fi
fi
[[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' poms-r1e-app-password)" == rust-r1e ]] || die 'R1E credential scope mismatch.'
"${podman_cmd[@]}" run --rm --network=container:poms-r0e-pg15 --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace" \
    --mount "type=bind,source=$state/private,destination=/r1e-private" \
    --secret poms-r0e-owner-password,target=r1e-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r1e-app-password,target=r1e-app-password,uid=0,gid=0,mode=0400 \
    "$build_image" node tools/rust-r1e/database-environment.mjs "$mode"
