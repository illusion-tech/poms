#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state=/home/wangzishi/.local/share/poms-r2ij
readonly image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
die() { printf '{"formatVersion":1,"code":"fixture_environment"}\n' >&2; exit 1; }
[[ $# == 0 && $(id -u) == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r2ij && -d "$state/private" && ! -L "$state/private" ]] || die
podman_cmd=(podman --cgroup-manager=cgroupfs)
readonly metadata="$("${podman_cmd[@]}" inspect --format '{{.Name}}|{{.State.Status}}|{{.Image}}|{{json .HostConfig.PortBindings}}|{{index .Config.Labels "org.poms.scope"}}|{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' poms-r2ij-pg15)"
[[ "$metadata" == 'poms-r2ij-pg15|running|b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a|{"15432/tcp":[{"HostIp":"127.0.0.1","HostPort":"16432"}]}|rust-r2ij|poms-r2ij-pg15-data' ]] || die
[[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' poms-r2ij-pg15-data)" == rust-r2ij ]] || die
[[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}|{{index .Labels "org.poms.scope"}}' "$image")" == "$image|rust-r1c" ]] || die
for name in poms-r2ij-owner-password poms-r2ij-app-password; do
    [[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' "$name")" == rust-r2ij ]] || die
done
exec "${podman_cmd[@]}" run -i --rm --network=host --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace,readonly" \
    --mount "type=bind,source=/home/wangzishi/projects/poms-rust-r2d/node_modules,destination=/home/wangzishi/projects/poms-rust-r2d/node_modules,readonly" \
    --mount "type=bind,source=$state/private,destination=/r2ij-private" \
    --secret poms-r2ij-owner-password,target=r2ij-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r2ij-app-password,target=r2ij-app-password,uid=0,gid=0,mode=0400 \
    "$image" node tools/rust-r2ij/fixture-cli.mjs
