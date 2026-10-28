#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r2gh"
readonly build_image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ $# -le 1 && "$(id -u)" == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r2gh && "$state" == /home/wangzishi/.local/share/poms-r2gh ]] || die 'Use the dedicated R2GH Linux checkout as the ordinary WSL user.'
bash "$repo/tools/rust-r0e/environment.sh" status
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a)" == rust-r0e ]] || die 'PG15 image scope mismatch.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$build_image")" == rust-r1c ]] || die 'Build image scope mismatch.'
case "${1:-status}" in
    resume)
        # Metadata guards above apply to the existing container and volume.
        # This mode cannot create a replacement cluster or execute SQL.
        "${podman_cmd[@]}" start poms-r0e-pg15 >/dev/null
        for ((attempt=0; attempt<30; attempt++)); do
            if "${podman_cmd[@]}" exec poms-r0e-pg15 pg_isready -h /run/postgresql -p 15432 -U poms_r0e_owner >/dev/null 2>&1; then
                printf 'Existing controlled PG15 container is ready; no SQL executed.\n'
                exit 0
            fi
            sleep 1
        done
        die 'Existing controlled PG15 container did not become ready.'
        ;;
    provision|status|migrate|catalog|seed|env) mode="${1:-status}" ;;
    *) die 'Usage: environment.sh resume|provision|status|migrate|catalog|seed|env (no reset or drop).' ;;
esac
[[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' poms-r0e-owner-password)" == rust-r0e ]] || die 'Owner credential scope mismatch.'
if [[ "$mode" == provision ]]; then
    mkdir -p "$state/private" "$state/logs"
    chmod 700 "$state/private"
    if "${podman_cmd[@]}" secret inspect poms-r2gh-app-password >/dev/null 2>&1; then
        [[ -s "$state/private/app-password" ]] || die 'Existing R2GH secret requires its original private credential file.'
    else
        [[ ! -e "$state/private/app-password" ]] || die 'Review an existing credential before creating a missing secret.'
        head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$state/private/app-password"
        chmod 600 "$state/private/app-password"
        "${podman_cmd[@]}" secret create --label org.poms.scope=rust-r2gh poms-r2gh-app-password "$state/private/app-password" >/dev/null
    fi
fi
[[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' poms-r2gh-app-password)" == rust-r2gh ]] || die 'R2GH credential scope mismatch.'
"${podman_cmd[@]}" run --rm --network=container:poms-r0e-pg15 --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace" \
    --mount "type=bind,source=/home/wangzishi/projects/poms-rust-r2d/node_modules,destination=/home/wangzishi/projects/poms-rust-r2d/node_modules,readonly" \
    --mount "type=bind,source=$state/private,destination=/r2gh-private" \
    --secret poms-r0e-owner-password,target=r2gh-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r2gh-app-password,target=r2gh-app-password,uid=0,gid=0,mode=0400 \
    "$build_image" node tools/rust-r2gh/database-environment.mjs "$mode"
