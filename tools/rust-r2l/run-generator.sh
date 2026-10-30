#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /home/wangzishi/projects/poms-rust-r2l-generator
readonly image=ccc653bf370674de7f5d929d818737740f9eb555dcaf20deeb19d4f749cd0273
readonly modules=/home/wangzishi/projects/poms-rust-r2d/node_modules
readonly node_binary=/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin/node
readonly source_head=1a941e8047c6269b52ef4ae8174e5f450f1db2f6
[[ "$(git rev-parse HEAD)" == "$source_head" ]]
container=(podman --cgroup-manager=cgroupfs run --rm --network=none --userns=keep-id --user 1000:1000 --workdir=/workspace --mount type=bind,source=/home/wangzishi/projects/poms-rust-r2l-generator,destination=/workspace --mount "type=bind,source=$modules,destination=$modules,readonly" --mount "type=bind,source=$node_binary,destination=/host-node,readonly" --mount type=bind,source=/home/wangzishi/.local/share/poms-r2l/bootstrap/7.20.0.jar,destination=/generator/7.20.0.jar,readonly --env POMS_OPENAPI_JAVA=/usr/bin/java --env POMS_OPENAPI_GENERATOR_JAR=/generator/7.20.0.jar --entrypoint /host-node "$image")
for mode in write check; do
  [[ ! -e "tmp/rust-r2l/client-${mode}01.json" && ! -e "tmp/rust-r2l/client-${mode}01.stderr" ]]
  set +e
  "${container[@]}" tools/openapi/shared-api-client.mjs --"$mode" >"tmp/rust-r2l/client-${mode}01.json" 2>"tmp/rust-r2l/client-${mode}01.stderr"
  code=$?
  set -e
  printf '{"formatVersion":1,"mode":"%s","exitCode":%s,"sourceCheckpoint":"%s","network":"none","oldDependencyMountReadOnly":true,"privateOrDatabaseMounted":false}\n' "$mode" "$code" "$source_head" >"tmp/rust-r2l/client-${mode}01-exit.json"
  cat "tmp/rust-r2l/client-${mode}01-exit.json"
  [[ "$code" == 0 ]] || exit "$code"
done
