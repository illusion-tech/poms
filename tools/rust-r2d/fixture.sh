#!/usr/bin/env bash
set -euo pipefail
umask 077
die() { printf '%s\n' '{"formatVersion":1,"code":"fixture_environment"}' >&2; exit 1; }
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state="$HOME/.local/share/poms-r2d"
readonly image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
[[ $# == 0 && "$(id -u)" == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r2d && "$state" == /home/wangzishi/.local/share/poms-r2d ]] || die
podman_cmd=(podman --cgroup-manager=cgroupfs)
# Batch read-only metadata fields so Windows/WSL does not repeatedly pay
# Podman startup latency. Keep every R0E container/volume identity check.
readonly container_metadata="$("${podman_cmd[@]}" inspect --format '{{.Name}}|{{.State.Status}}|{{.Image}}|{{json .HostConfig.PortBindings}}|{{index .Config.Labels "org.poms.scope"}}|{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' poms-r0e-pg15)"
[[ "$container_metadata" == 'poms-r0e-pg15|running|b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a|{"15432/tcp":[{"HostIp":"127.0.0.1","HostPort":"15432"}]}|rust-r0e|poms-r0e-pg15-data' ]] || die
[[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' poms-r0e-pg15-data)" == rust-r0e ]] || die
[[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}|{{index .Config.Labels "org.poms.scope"}}' "$image")" == "$image|rust-r1c" ]] || die
readonly secret_metadata="$("${podman_cmd[@]}" secret inspect --format '{{.Spec.Name}}|{{index .Spec.Labels "org.poms.scope"}}' poms-r2d-app-password poms-r0e-owner-password)"
[[ "$secret_metadata" == $'poms-r2d-app-password|rust-r2d\npoms-r0e-owner-password|rust-r0e' ]] || die
[[ -d "$state/private" && ! -L "$state/private" ]] || die
exec "${podman_cmd[@]}" run -i --rm --network=container:poms-r0e-pg15 --workdir=/workspace \
    --mount "type=bind,source=$repo,destination=/workspace,readonly" \
    --mount "type=bind,source=$state/private,destination=/r2d-private" \
    --secret poms-r0e-owner-password,target=r2d-owner-password,uid=0,gid=0,mode=0400 \
    --secret poms-r2d-app-password,target=r2d-app-password,uid=0,gid=0,mode=0400 \
    "$image" node tools/rust-r2d/fixture-cli.mjs
