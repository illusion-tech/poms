-- K55 DESIGN ONLY. These are bound SELECT statement templates, NOT executed.
-- All UUIDs, keys, provider names and versions come from real request receipts.
-- No DDL, trigger, business UPDATE/INSERT, credentials or fake producer states.
-- Each numbered block is a separate statement with its own stated bindings.

-- 1. Session proof, before snapshot and again inside Tx after Session row lock.
-- $1 = actual Session UUID. Inside Tx append FOR UPDATE to this single-table read.
SELECT id, row_version, created_by, status, expires_at, operation_type, upload_mode,
       provider_type, storage_bucket, storage_key, base_attachment_id,
       completed_attachment_id, target_type, target_id, size_bytes, max_size_bytes,
       checksum_sha256, original_name, display_name, extension, mime_type,
       category, security_level, relation_type, description, change_note,
       uploaded_at, completed_at, aborted_at, failed_reason, created_at, updated_at
FROM poms.attachment_upload_session
WHERE id = $1::uuid;

-- 2. Discovery only: actual Attachment UUIDs touched by dirty/new Links or intent.
-- $1 = UUID[]; no row locks until sorted group advisory locks have been acquired.
SELECT id, COALESCE(version_group_id, id) AS canonical_group
FROM poms.attachment
WHERE id = ANY($1::uuid[])
ORDER BY id;

-- 3. Under sorted group advisory locks: group/history and exact head proof.
-- $1 = UUID[] of canonical groups. Lock rows in this ORDER BY id using FOR UPDATE.
SELECT id, COALESCE(version_group_id, id) AS canonical_group, row_version,
       version_no, status, is_latest, is_final, previous_attachment_id,
       security_level, uploaded_by, storage_provider, storage_bucket, storage_key,
       size_bytes, checksum_sha256, uploaded_at, deleted_at, updated_at
FROM poms.attachment
WHERE COALESCE(version_group_id, id) = ANY($1::uuid[])
ORDER BY id;

-- 4. All-history max, never filtered to active rows.
-- $1 = real canonical group UUID. Overflow is checked before max + 1.
SELECT count(*)::bigint AS history_count, max(version_no) AS max_version_no
FROM poms.attachment
WHERE COALESCE(version_group_id, id) = $1::uuid;

-- 5. Under the same group locks: complete active link set, compare all fields.
-- $1 = actual head Attachment UUID. Append FOR UPDATE inside Tx.
-- Head.row_version is not a substitute for this set proof.
SELECT id, attachment_id, target_type, target_id, relation_type, status,
       linked_by, linked_at, unlinked_by, unlinked_at
FROM poms.attachment_link
WHERE attachment_id = $1::uuid AND status = 'active'
ORDER BY id;

-- 6. Nonsecret config candidates on the SAME borrowed connection in business Tx.
-- $1 = original provider; $2 = normalized bucket (null for implicit local).
-- Registry's exact normalize/matches_prefix/UTF16-longest-prefix selection is
-- applied to these rows, not a different SQL collation/length approximation.
-- Never select encrypted credentials or emit endpoint/access details in proof.
SELECT id, row_version, provider_type, bucket, key_prefix
FROM poms.attachment_storage_provider_config
WHERE provider_type = $1::text AND bucket IS NOT DISTINCT FROM $2::text
ORDER BY created_at DESC;

-- 7. Fresh independent FINAL cleanup probe, main SQL connection already released.
-- $1 = prepared Attachment UUID; $2/$3/$4 = its provider/bucket/final key.
-- Only evaluate cleanup after KnownNotCommitted. An empty result never upgrades
-- Unknown COMMIT to KnownNotCommitted. Every Attachment status is a blocker.
SELECT
  EXISTS (
    SELECT 1 FROM poms.attachment a
    WHERE a.id = $1::uuid OR
      (a.storage_provider = $2::text AND
       a.storage_bucket IS NOT DISTINCT FROM $3::text AND a.storage_key = $4::text)
  ) AS attachment_reference,
  EXISTS (
    SELECT 1 FROM poms.attachment_upload_session s
    WHERE s.completed_attachment_id = $1::uuid OR
      (s.provider_type = $2::text AND
       s.storage_bucket IS NOT DISTINCT FROM $3::text AND s.storage_key = $4::text)
  ) AS session_reference,
  EXISTS (
    SELECT 1 FROM poms.attachment_download_package p
    WHERE p.storage_provider = $2::text AND
      p.storage_bucket IS NOT DISTINCT FROM $3::text AND p.storage_key = $4::text
  ) AS package_reference;

-- 8. Fresh ABORT staging cleanup probe, only after terminal+audit COMMIT ACK.
-- $1 = owning Session UUID; $2 = committed aborted row_version;
-- $3/$4/$5 = captured original provider/bucket/staging key.
-- Its own aborted historical pointer is expected, not a blocker. Any other
-- Session pointer or any Attachment/package pointer blocks deletion.
SELECT
  EXISTS (
    SELECT 1 FROM poms.attachment_upload_session s
    WHERE s.id = $1::uuid AND s.row_version = $2::integer
      AND s.status = 'aborted' AND s.completed_attachment_id IS NULL
      AND s.provider_type = $3::text
      AND s.storage_bucket IS NOT DISTINCT FROM $4::text AND s.storage_key = $5::text
  ) AS own_aborted_version,
  EXISTS (
    SELECT 1 FROM poms.attachment a
    WHERE a.storage_provider = $3::text
      AND a.storage_bucket IS NOT DISTINCT FROM $4::text AND a.storage_key = $5::text
  ) AS attachment_reference,
  EXISTS (
    SELECT 1 FROM poms.attachment_upload_session s
    WHERE s.id <> $1::uuid AND s.provider_type = $3::text
      AND s.storage_bucket IS NOT DISTINCT FROM $4::text AND s.storage_key = $5::text
  ) AS other_session_reference,
  EXISTS (
    SELECT 1 FROM poms.attachment_download_package p
    WHERE p.storage_provider = $3::text
      AND p.storage_bucket IS NOT DISTINCT FROM $4::text AND p.storage_key = $5::text
  ) AS package_reference;

-- 9. Necessary success audit: compare count to pre-request baseline using the
-- real request_id/owned target IDs. Do not treat total audit count as isolation.
-- $1 = actual request ID; $2 = exact planned existing event_type string.
SELECT id, event_type, target_type, target_id, operator_id, request_id, result,
       metadata, occurred_at
FROM poms.audit_log
WHERE request_id = $1::text AND event_type = $2::text
ORDER BY id;

-- 10. Catalog protections remain unchanged. This is metadata, not live credentials.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'poms' AND indexname = ANY(ARRAY[
  'uq_attachment_latest_active', 'uq_attachment_final_active',
  'uq_attachment_version_no', 'uq_attachment_link_active_relation'
])
ORDER BY indexname;
