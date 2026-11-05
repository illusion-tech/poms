-- READ-ONLY STATEMENT TEMPLATES. Author has not executed these.
-- Root uses its actual guarded new namespace connection and one READ ONLY Tx.
-- For blocks 2..6: $1=actual Attachment UUID; $2=actual owning Session UUID;
-- $3=actual base Attachment UUID or NULL; $4=actual project UUID.
-- No API field or hash supplied by the caller substitutes for these PG rows.

-- 1. Bind identity.instanceId to the actual marker, never a copied literal.
SELECT current_database() AS database,
       current_user::text AS principal,
       current_setting('port') AS server_port,
       current_setting('server_version_num') AS server_version_num,
       current_setting('poms.r0e_isolated', true) AS isolated,
       (SELECT count(*)::integer FROM poms.poms_migrations) AS migration_count,
       m.instance_id::text, m.namespace, m.source_base
FROM r4def_control.marker m;
-- Root requires database=poms_r4def_rust, server_port15432, 150012, isolated on,
-- 94, namespace poms-r4def and its current owned instance/base756d/host25433.

-- 2. body.attachment: actual storage binding and metadata (nonsecret columns).
SELECT id, row_version, storage_provider, storage_bucket, storage_key,
       size_bytes, checksum_sha256, status, category, security_level,
       version_group_id, version_no, previous_attachment_id, is_latest, is_final,
       uploaded_by, uploaded_at, deleted_at
FROM poms.attachment WHERE id=$1::uuid;

-- 3. body.session: staging identity stays staging after genuine complete.
SELECT id, row_version, status, operation_type, upload_mode, provider_type,
       storage_bucket, storage_key, size_bytes, checksum_sha256, base_attachment_id,
       completed_attachment_id, created_by, target_type, target_id,
       expires_at, uploaded_at, completed_at, aborted_at, failed_reason
FROM poms.attachment_upload_session WHERE id=$2::uuid;

-- 4. body.activeLinks: exact actual active link set, not a count or inferred link.
SELECT id, attachment_id, target_type, target_id, relation_type, status,
       linked_by, linked_at, unlinked_by, unlinked_at
FROM poms.attachment_link
WHERE attachment_id=$1::uuid AND status='active' ORDER BY id;

-- 5. body.baseActiveLinks: new-version inheritance proof, source set independently.
SELECT id, attachment_id, target_type, target_id, relation_type, status,
       linked_by, linked_at, unlinked_by, unlinked_at
FROM poms.attachment_link
WHERE attachment_id=$3::uuid AND status='active' ORDER BY id;

-- 6. body.groupRows includes voided history, never only active rows.
SELECT id, COALESCE(version_group_id,id) AS canonical_group, row_version,
       version_no, previous_attachment_id, status, is_latest, is_final,
       storage_provider, storage_bucket, storage_key, size_bytes, checksum_sha256
FROM poms.attachment
WHERE COALESCE(version_group_id,id)=(
    SELECT COALESCE(version_group_id,id) FROM poms.attachment WHERE id=$1::uuid
) ORDER BY id;

-- 7. Independent explicit project/link guard, $1 Attachment, $4 actual project.
SELECT id, attachment_id, target_type, target_id, relation_type
FROM poms.attachment_link
WHERE attachment_id=$1::uuid AND target_type='project'
  AND target_id=$4::uuid AND status='active' ORDER BY id;

-- 8. observeBasis uses its own bindings: $1 actual basis UUID, $2 actual project.
SELECT id, project_id, source_payload, payload_hash, source_hash
FROM poms.project_handover_basis_snapshot
WHERE id=$1::uuid AND project_id=$2::uuid;

-- No storage credentials/config ciphertext are selected. Raw storage paths and
-- row originals belong in Root new private proof. Public receipts can keep only
-- actual row identity/status, count, original-file reference and raw bytes SHA.
