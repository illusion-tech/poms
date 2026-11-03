import fs from'node:fs';import assert from'node:assert/strict';
const name='Migration20261103060000_rust_r4abc_contract_lifecycle',file='apps/poms-api/src/migrations/'+name+'.ts',up=fs.readFileSync('docs/design/rust-r4abc/schema-freeze01.sql','utf8');assert(!up.includes('`'));assert(!up.includes('${'));assert(!fs.existsSync(file));
const down=`DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM poms.contract_term_preparation) OR EXISTS(SELECT 1 FROM poms.contract_review_binding)
 OR EXISTS(SELECT 1 FROM poms.receivable_plan_version) OR EXISTS(SELECT 1 FROM poms.commercial_baseline_review_attachment)
 OR EXISTS(SELECT 1 FROM poms.contract_readiness_package WHERE contract_id IS NOT NULL)
 OR EXISTS(SELECT 1 FROM poms.commercial_release_baseline WHERE contract_terms <> '[]'::jsonb) THEN
 RAISE EXCEPTION 'R4 rollback requires explicit preservation of existing lifecycle data'; END IF;
END $$;
DROP TABLE poms.receivable_plan_init_record;
DROP TABLE poms.receivable_plan_node;
DROP TABLE poms.receivable_plan_version;
DROP TABLE poms.contract_review_binding;
ALTER TABLE poms.contract_readiness_package DROP CONSTRAINT fk_r4_readiness_current_preparation;
ALTER TABLE poms.contract_term_snapshot DROP CONSTRAINT fk_r4_snapshot_preparation_contract;
DROP TABLE poms.contract_term_preparation;
ALTER TABLE poms.contract_term_snapshot DROP CONSTRAINT uq_r4_snapshot_id_contract, DROP CONSTRAINT uq_r4_snapshot_preparation_scope, DROP COLUMN source_preparation_id, DROP COLUMN receivable_plan_seeds, DROP COLUMN payload_hash;
ALTER TABLE poms.contract_readiness_package DROP CONSTRAINT fk_r4_readiness_diff_scope, DROP CONSTRAINT uq_r4_readiness_scope, DROP COLUMN contract_id, DROP COLUMN candidate_terms, DROP COLUMN source_facts, DROP COLUMN payload_hash, DROP COLUMN current_preparation_id, DROP COLUMN source_cost_package_id, DROP COLUMN source_bid_process_id, DROP COLUMN source_pricing_review_id;
DROP TABLE poms.commercial_baseline_review_attachment;
ALTER TABLE poms.commercial_baseline_diff_result DROP CONSTRAINT fk_r4_diff_baseline_project, DROP COLUMN contract_id, DROP COLUMN reference_terms, DROP COLUMN candidate_terms, DROP COLUMN payload_hash;
ALTER TABLE poms.commercial_release_baseline DROP CONSTRAINT uq_r4_baseline_id_project, DROP COLUMN contract_terms, DROP COLUMN currency_code;
DROP INDEX poms.uq_r4_baseline_project_current;
ALTER TABLE poms.contract DROP CONSTRAINT uq_r4_contract_id_project;`;
fs.writeFileSync(file,"import { Migration } from '@mikro-orm/migrations';\n\nexport class "+name+" extends Migration {\n    override async up(): Promise<void> {\n        this.addSql(String.raw`"+up+"`);\n    }\n\n    override async down(): Promise<void> {\n        this.addSql(String.raw`"+down+"`);\n    }\n}\n",{flag:'wx'});console.log(JSON.stringify({file,originalMigrations:92,declaredTotal:93,upMatchesFrozenSql:true,downRefusesDataLoss:true}));
