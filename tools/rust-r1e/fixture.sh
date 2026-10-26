#!/usr/bin/env bash
set -euo pipefail
umask 077
die() { printf '%s\n' '{"formatVersion":1,"code":"fixture_environment"}' >&2; exit 1; }
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r1e"
readonly image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
[[ $# == 0 && "$(id -u)" == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r1e && "$state" == /home/wangzishi/.local/share/poms-r1e ]] || die
podman_cmd=(podman --cgroup-manager=cgroupfs)
# All diagnostics go to stderr; stdout is exclusively the fixture JSON reply.
bash "$repo/tools/rust-r0e/environment.sh" status >&2 || die
[[ "$("${podman_cmd[@]}" image inspect --format '{{index .Config.Labels "org.poms.scope"}}' "$image")" == rust-r1c ]] || die
[[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' poms-r1e-app-password)" == rust-r1e ]] || die
[[ -d "$state/private" && ! -L "$state/private" ]] || die
exec "${podman_cmd[@]}" run -i --rm --network=container:poms-r0e-pg15 --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace,readonly" \
    --mount "type=bind,source=$state/private,destination=/r1e-private" \
    --secret poms-r0e-owner-password,target=r1e-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r1e-app-password,target=r1e-app-password,uid=0,gid=0,mode=0400 \
    "$image" node tools/rust-r1e/fixture-cli.mjs
