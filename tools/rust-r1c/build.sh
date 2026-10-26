#!/usr/bin/env bash
set -euo pipefail
readonly repo="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly parent=f8284fad99901b0c71bffd7a76a58ff6f56443755ccd3deacbca488557bb7244
podman_cmd=(podman --cgroup-manager=cgroupfs)
[[ "$(id -u)" != 0 ]] || { printf '%s\n' 'Use the ordinary WSL user.' >&2; exit 1; }
[[ "$("${podman_cmd[@]}" image inspect --format '{{.Id}}' localhost/poms-r0e-build:1)" == "$parent" ]] || {
    printf '%s\n' 'R0E parent tag differs from the accepted immutable image.' >&2; exit 1;
}
"${podman_cmd[@]}" build --network=slirp4netns --pull=never \
    -t localhost/poms-r1c-build:1 -f "$repo/tools/rust-r1c/Containerfile.build" "$repo/tools/rust-r1c"
# A rebuild can have a different content ID. check.sh remains pinned to the
# certified image until the new result has been reviewed and revalidated.
"${podman_cmd[@]}" image inspect --format '{{.Id}}' localhost/poms-r1c-build:1
