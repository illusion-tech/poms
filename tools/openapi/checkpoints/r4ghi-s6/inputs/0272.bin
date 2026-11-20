import { Migration } from '@mikro-orm/migrations';

export class Migration20260405113000_init_contract_readiness_chain extends Migration {
    override async up(): Promise<void> {
        this.addSql(`
            create table "poms"."commercial_release_baseline" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "baseline_code" varchar(64) not null,
                "quotation_review_id" uuid null,
                "baseline_status" varchar(32) not null default 'effective',
                "is_current" boolean not null default true,
                "gross_margin_summary" varchar(1000) null,
                "payment_terms_summary" varchar(1000) null,
                "latest_diff_result_id" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commercial_release_baseline_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create unique index "commercial_release_baseline_project_code_unique" on "poms"."commercial_release_baseline" ("project_id", "baseline_code");`
        );
        this.addSql(
            `create index "idx_commercial_release_baseline_project_current" on "poms"."commercial_release_baseline" ("project_id", "is_current");`
        );
        this.addSql(
            `create index "idx_commercial_release_baseline_status" on "poms"."commercial_release_baseline" ("baseline_status");`
        );

        this.addSql(`
            create table "poms"."commercial_baseline_diff_result" (
                "id" uuid not null default gen_random_uuid(),
                "baseline_id" uuid not null,
                "project_id" uuid not null,
                "diff_level" varchar(32) not null,
                "review_status" varchar(32) not null,
                "diff_summary" varchar(1000) null,
                "current_review_decision" varchar(32) null,
                "reviewed_at" timestamptz null,
                "created_at" timestamptz not null default now(),
                constraint "commercial_baseline_diff_result_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create index "idx_commercial_baseline_diff_result_baseline" on "poms"."commercial_baseline_diff_result" ("baseline_id", "created_at");`
        );
        this.addSql(
            `create index "idx_commercial_baseline_diff_result_review_status" on "poms"."commercial_baseline_diff_result" ("review_status");`
        );

        this.addSql(`
            create table "poms"."commercial_baseline_diff_item" (
                "id" uuid not null default gen_random_uuid(),
                "diff_result_id" uuid not null,
                "field_key" varchar(128) not null,
                "field_label" varchar(128) not null,
                "old_value_summary" varchar(1000) null,
                "new_value_summary" varchar(1000) null,
                "diff_level" varchar(32) not null,
                "is_blocking" boolean not null default false,
                "sort_order" integer not null default 0,
                constraint "commercial_baseline_diff_item_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create index "idx_commercial_baseline_diff_item_result_sort" on "poms"."commercial_baseline_diff_item" ("diff_result_id", "sort_order");`
        );

        this.addSql(`
            create table "poms"."commercial_baseline_review_record" (
                "id" uuid not null default gen_random_uuid(),
                "baseline_id" uuid not null,
                "diff_result_id" uuid not null,
                "project_id" uuid not null,
                "decision" varchar(32) not null,
                "reviewed_field_keys" jsonb not null default '[]'::jsonb,
                "comment" varchar(1000) null,
                "reviewer_user_id" uuid not null,
                "created_at" timestamptz not null default now(),
                constraint "commercial_baseline_review_record_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create index "idx_commercial_baseline_review_record_diff_result" on "poms"."commercial_baseline_review_record" ("diff_result_id", "created_at");`
        );
        this.addSql(
            `create index "idx_commercial_baseline_review_record_project" on "poms"."commercial_baseline_review_record" ("project_id");`
        );

        this.addSql(`
            create table "poms"."contract_readiness_package" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "source_baseline_id" uuid not null,
                "latest_diff_result_id" uuid not null,
                "package_status" varchar(32) not null,
                "guard_decision" varchar(32) not null,
                "current_effective_decision_summary" varchar(1000) null,
                "blocking_reason_summary" varchar(1000) null,
                "missing_prerequisite_count" integer not null default 0,
                "initialized_contract_snapshot_id" uuid null,
                "initialized_receivable_plan_version_id" uuid null,
                "contract_snapshot_initialized_at" timestamptz null,
                "receivable_plan_initialized_at" timestamptz null,
                "is_current" boolean not null default true,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "contract_readiness_package_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create index "idx_contract_readiness_package_project_current" on "poms"."contract_readiness_package" ("project_id", "is_current");`
        );
        this.addSql(
            `create index "idx_contract_readiness_package_status" on "poms"."contract_readiness_package" ("package_status");`
        );

        this.addSql(`
            create table "poms"."contract_readiness_package_item" (
                "id" uuid not null default gen_random_uuid(),
                "package_id" uuid not null,
                "item_type" varchar(32) not null,
                "item_key" varchar(128) not null,
                "label" varchar(128) not null,
                "summary" varchar(1000) null,
                "status" varchar(32) not null,
                "responsible_role" varchar(128) null,
                "navigation_hint" varchar(255) null,
                "sort_order" integer not null default 0,
                constraint "contract_readiness_package_item_pkey" primary key ("id")
            );
        `);
        this.addSql(
            `create index "idx_contract_readiness_package_item_package_sort" on "poms"."contract_readiness_package_item" ("package_id", "sort_order");`
        );

        this.addSql(`
            alter table "poms"."commercial_release_baseline"
            add constraint "commercial_release_baseline_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_diff_result"
            add constraint "commercial_baseline_diff_result_baseline_id_foreign"
            foreign key ("baseline_id") references "poms"."commercial_release_baseline" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_diff_result"
            add constraint "commercial_baseline_diff_result_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_release_baseline"
            add constraint "commercial_release_baseline_latest_diff_result_id_foreign"
            foreign key ("latest_diff_result_id") references "poms"."commercial_baseline_diff_result" ("id")
            on update cascade on delete set null;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_diff_item"
            add constraint "commercial_baseline_diff_item_diff_result_id_foreign"
            foreign key ("diff_result_id") references "poms"."commercial_baseline_diff_result" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_review_record"
            add constraint "commercial_baseline_review_record_baseline_id_foreign"
            foreign key ("baseline_id") references "poms"."commercial_release_baseline" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_review_record"
            add constraint "commercial_baseline_review_record_diff_result_id_foreign"
            foreign key ("diff_result_id") references "poms"."commercial_baseline_diff_result" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."commercial_baseline_review_record"
            add constraint "commercial_baseline_review_record_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."contract_readiness_package"
            add constraint "contract_readiness_package_project_id_foreign"
            foreign key ("project_id") references "poms"."project" ("id")
            on update cascade on delete cascade;
        `);
        this.addSql(`
            alter table "poms"."contract_readiness_package"
            add constraint "contract_readiness_package_source_baseline_id_foreign"
            foreign key ("source_baseline_id") references "poms"."commercial_release_baseline" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."contract_readiness_package"
            add constraint "contract_readiness_package_latest_diff_result_id_foreign"
            foreign key ("latest_diff_result_id") references "poms"."commercial_baseline_diff_result" ("id")
            on update cascade on delete restrict;
        `);
        this.addSql(`
            alter table "poms"."contract_readiness_package_item"
            add constraint "contract_readiness_package_item_package_id_foreign"
            foreign key ("package_id") references "poms"."contract_readiness_package" ("id")
            on update cascade on delete cascade;
        `);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."contract_readiness_package_item" drop constraint if exists "contract_readiness_package_item_package_id_foreign";`);
        this.addSql(`alter table "poms"."contract_readiness_package" drop constraint if exists "contract_readiness_package_latest_diff_result_id_foreign";`);
        this.addSql(`alter table "poms"."contract_readiness_package" drop constraint if exists "contract_readiness_package_source_baseline_id_foreign";`);
        this.addSql(`alter table "poms"."contract_readiness_package" drop constraint if exists "contract_readiness_package_project_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_review_record" drop constraint if exists "commercial_baseline_review_record_project_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_review_record" drop constraint if exists "commercial_baseline_review_record_diff_result_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_review_record" drop constraint if exists "commercial_baseline_review_record_baseline_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_diff_item" drop constraint if exists "commercial_baseline_diff_item_diff_result_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop constraint if exists "commercial_release_baseline_latest_diff_result_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_diff_result" drop constraint if exists "commercial_baseline_diff_result_project_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_baseline_diff_result" drop constraint if exists "commercial_baseline_diff_result_baseline_id_foreign";`);
        this.addSql(`alter table "poms"."commercial_release_baseline" drop constraint if exists "commercial_release_baseline_project_id_foreign";`);

        this.addSql(`drop index if exists "poms"."idx_contract_readiness_package_item_package_sort";`);
        this.addSql(`drop table if exists "poms"."contract_readiness_package_item";`);

        this.addSql(`drop index if exists "poms"."idx_contract_readiness_package_status";`);
        this.addSql(`drop index if exists "poms"."idx_contract_readiness_package_project_current";`);
        this.addSql(`drop table if exists "poms"."contract_readiness_package";`);

        this.addSql(`drop index if exists "poms"."idx_commercial_baseline_review_record_project";`);
        this.addSql(`drop index if exists "poms"."idx_commercial_baseline_review_record_diff_result";`);
        this.addSql(`drop table if exists "poms"."commercial_baseline_review_record";`);

        this.addSql(`drop index if exists "poms"."idx_commercial_baseline_diff_item_result_sort";`);
        this.addSql(`drop table if exists "poms"."commercial_baseline_diff_item";`);

        this.addSql(`drop index if exists "poms"."idx_commercial_baseline_diff_result_review_status";`);
        this.addSql(`drop index if exists "poms"."idx_commercial_baseline_diff_result_baseline";`);
        this.addSql(`drop table if exists "poms"."commercial_baseline_diff_result";`);

        this.addSql(`drop index if exists "poms"."idx_commercial_release_baseline_status";`);
        this.addSql(`drop index if exists "poms"."idx_commercial_release_baseline_project_current";`);
        this.addSql(`drop index if exists "poms"."commercial_release_baseline_project_code_unique";`);
        this.addSql(`drop table if exists "poms"."commercial_release_baseline";`);
    }
}
