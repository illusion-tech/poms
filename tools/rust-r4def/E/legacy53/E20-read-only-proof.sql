-- Root only: READ-ONLY proof contract, never an invoice producer.
-- Bind $1 = actual Native invoice UUID, $2 = actual project UUID.
-- Execute before/after Rust mapping in the same owned DB94 namespace.
BEGIN READ ONLY;

SELECT current_database() AS database, current_user::text AS principal,
       current_setting('port') AS server_port,
       current_setting('server_version_num') AS server_version_num,
       current_setting('poms.r0e_isolated', true) AS isolated;
SELECT instance_id, namespace, source_base FROM r4def_control.marker;
SELECT count(*)::int AS migration_count FROM poms.poms_migrations;

SELECT to_jsonb(i) || jsonb_build_object(
         'invoice_amount', i.invoice_amount::text,
         'invoice_date', i.invoice_date::text
       ) AS invoice
FROM poms.invoice_record i
WHERE i.id=$1::uuid AND i.project_id=$2::uuid;

SELECT id,project_id,source_type,source_id,record_status,row_version
FROM poms.project_actual_cost_record
WHERE source_type='invoice-record' AND source_id=$1::text
  AND record_status IN ('registered','confirmed','included')
ORDER BY id;

SELECT column_name,is_nullable,data_type,character_maximum_length,
       numeric_precision,numeric_scale,column_default
FROM information_schema.columns
WHERE table_schema='poms' AND table_name='invoice_record'
  AND column_name IN ('currency_code','currency_source','currency_source_snapshot_id','invoice_amount')
ORDER BY column_name;

SELECT conname,pg_get_constraintdef(oid,true) AS definition
FROM pg_constraint
WHERE conrelid='poms.invoice_record'::regclass
  AND conname='chk_r4e_invoice_currency';

ROLLBACK;
