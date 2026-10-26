#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r2a"
readonly build_image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ $# -le 1 && "$(id -u)" == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r2a && "$state" == /home/wangzishi/.local/share/poms-r2a ]] || die 'Use the dedicated R2A Linux checkout as the ordinary WSL user.'
bash "$repo/tools/rust-r0e/environment.sh" status
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r1c ]] || die 'Build image scope mismatch.'
case "${1:-status}" in
    provision|status|migrate|catalog|seed|env) mode="${1:-status}" ;;
    *) die 'Usage: environment.sh provision|status|migrate|catalog|seed|env (no reset or drop).' ;;
esac
if [[ "$mode" == provision ]]; then
    mkdir -p "$state/private" "$state/logs"
    chmod 700 "$state/private"
    if "${podman_cmd[@]}" secret inspect poms-r2a-app-password >/dev/null 2>&1; then
        [[ -s "$state/private/app-password" ]] || die 'Existing R2A secret requires its original private credential file.'
    else
        [[ ! -e "$state/private/app-password" ]] || die 'Review an existing credential before creating a missing secret.'
        head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$state/private/app-password"
        chmod 600 "$state/private/app-password"
        "${podman_cmd[@]}" secret create --label org.poms.scope=rust-r2a poms-r2a-app-password "$state/private/app-password" >/dev/null
    fi
fi
[[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' poms-r2a-app-password)" == rust-r2a ]] || die 'R2A credential scope mismatch.'
"${podman_cmd[@]}" run --rm --network=container:poms-r0e-pg15 --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace" \
    --mount "type=bind,source=$state/private,destination=/r2a-private" \
    --secret poms-r0e-owner-password,target=r2a-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r2a-app-password,target=r2a-app-password,uid=0,gid=0,mode=0400 \
    "$build_image" node tools/rust-r2a/database-environment.mjs "$mode"
