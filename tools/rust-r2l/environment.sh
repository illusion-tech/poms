#!/usr/bin/env bash
set -euo pipefail
umask 077
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly state=/home/wangzishi/.local/share/poms-r2l
readonly container=poms-r2l-pg15
readonly volume=poms-r2l-pg15-data
readonly pg_image=b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a
readonly build_image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
podman_cmd=(podman --cgroup-manager=cgroupfs)
die() { printf '%s\n' "$*" >&2; exit 1; }
[[ $# -le 1 && $(id -u) == 1000 && "$repo" == /home/wangzishi/projects/poms-rust-r2l && -d "$state/private" && ! -L "$state/private" ]] || die 'Dedicated K checkout/state required.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}|{{index .Labels "org.poms.scope"}}' "$pg_image")" == "$pg_image|rust-r0e" ]] || die 'Frozen PG image mismatch.'
[[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}|{{index .Labels "org.poms.scope"}}' "$build_image")" == "$build_image|rust-r1c" ]] || die 'Frozen build image mismatch.'
check_container() {
    local metadata
    metadata="$("${podman_cmd[@]}" inspect --format '{{.Name}}|{{.Image}}|{{json .HostConfig.PortBindings}}|{{index .Config.Labels "org.poms.scope"}}|{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$container")"
    [[ "$metadata" == 'poms-r2l-pg15|b718026138f18af7722fc66f706d64990e869a4b196508aaf4f3671786c8d93a|{"15432/tcp":[{"HostIp":"127.0.0.1","HostPort":"19432"}]}|rust-r2l|poms-r2l-pg15-data' ]] || die 'K container identity mismatch.'
    [[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' "$volume")" == rust-r2l ]] || die 'K volume identity mismatch.'
}
ensure_secret() {
    local name="$1" file="$2"
    if [[ ! -e "$file" ]]; then
        ! "${podman_cmd[@]}" secret inspect "$name" >/dev/null 2>&1 || die 'Existing secret requires original private file.'
        head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > "$file"
        chmod 600 "$file"
    fi
    [[ -f "$file" && ! -L "$file" && $(stat -c '%a' "$file") == 600 ]] || die 'Private file identity mismatch.'
    if ! "${podman_cmd[@]}" secret inspect "$name" >/dev/null 2>&1; then
        "${podman_cmd[@]}" secret create --label org.poms.scope=rust-r2l "$name" "$file" >/dev/null
    fi
    [[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' "$name")" == rust-r2l ]] || die 'K secret identity mismatch.'
}
readonly mode="${1:-status}"
case "$mode" in
    start)
        ensure_secret poms-r2l-owner-password "$state/private/owner-password"
        ensure_secret poms-r2l-app-password "$state/private/app-password"
        if "${podman_cmd[@]}" container exists "$container"; then
            check_container
            "${podman_cmd[@]}" start "$container" >/dev/null
        else
            [[ -z $(ss -H -ltn 'sport = :19432') ]] || die 'K loopback PG port already bound.'
            if ! "${podman_cmd[@]}" volume exists "$volume"; then
                "${podman_cmd[@]}" volume create --label org.poms.scope=rust-r2l "$volume" >/dev/null
            fi
            [[ "$("${podman_cmd[@]}" volume inspect --format '{{index .Labels "org.poms.scope"}}' "$volume")" == rust-r2l ]] || die 'K volume scope mismatch.'
            "${podman_cmd[@]}" run --detach --name "$container" --label org.poms.scope=rust-r2l \
                --network=slirp4netns --publish 127.0.0.1:19432:15432 --security-opt=no-new-privileges \
                --mount "type=volume,source=$volume,destination=/var/lib/postgresql/data" \
                --secret poms-r2l-owner-password,target=r0e-password,uid=1000,gid=1000,mode=0400 \
                "$pg_image" >/dev/null
            check_container
        fi
        for ((attempt=0;attempt<30;attempt++)); do
            if "${podman_cmd[@]}" exec "$container" pg_isready -h /run/postgresql -p 15432 -U poms_r0e_owner >/dev/null 2>&1; then
                printf '{"result":"ready","container":"poms-r2l-pg15","scope":"rust-r2l","hostPort":19432,"serverPort":15432,"oldPGPreserved":true}\n'
                exit 0
            fi
            sleep 1
        done
        die 'K PG readiness failed; volume retained.'
        ;;
    status)
        check_container
        "${podman_cmd[@]}" inspect --format '{{.Name}} {{.State.Status}} {{.Image}}' "$container"
        "${podman_cmd[@]}" port "$container"
        ;;
    provision|migrate|catalog|env|seed)
        check_container
        [[ "$("${podman_cmd[@]}" inspect --format '{{.State.Status}}' "$container")" == running ]] || die 'Start dedicated K PG first.'
        for name in poms-r2l-owner-password poms-r2l-app-password; do
            [[ "$("${podman_cmd[@]}" secret inspect --format '{{index .Spec.Labels "org.poms.scope"}}' "$name")" == rust-r2l ]] || die 'K secret scope mismatch.'
        done
        "${podman_cmd[@]}" run --rm --network=host --workdir=/workspace \
            --mount "type=bind,source=$repo,destination=/workspace" \
            --mount "type=bind,source=/home/wangzishi/projects/poms-rust-r2d/node_modules,destination=/home/wangzishi/projects/poms-rust-r2d/node_modules,readonly" \
            --mount "type=bind,source=$state/private,destination=/r2l-private" \
            --secret poms-r2l-owner-password,target=r2l-owner-password,uid=0,gid=0,mode=0400 \
            --secret poms-r2l-app-password,target=r2l-app-password,uid=0,gid=0,mode=0400 \
            "$build_image" node tools/rust-r2l/database-environment.mjs "$mode"
        ;;
    stop)
        check_container
        "${podman_cmd[@]}" stop --time 30 "$container" >/dev/null
        printf 'K PG stopped; volume, credentials and evidence retained.\n'
        ;;
    *) die 'Usage: environment.sh start|status|provision|migrate|catalog|env|seed|stop (no reset/drop/prune).' ;;
esac
