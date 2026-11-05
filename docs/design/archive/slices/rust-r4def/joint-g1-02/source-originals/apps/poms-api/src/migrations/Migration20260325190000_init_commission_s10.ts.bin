import { Migration } from '@mikro-orm/migrations';

export class Migration20260325190000_init_commission_s10 extends Migration {
    override async up(): Promise<void> {
        // commission_rule_version: versioned rule snapshots, immutable once active
        this.addSql(
            `create table "poms"."commission_rule_version" (
                "id" uuid not null default gen_random_uuid(),
                "rule_code" varchar(64) not null,
                "version" integer not null,
                "status" varchar(32) not null default 'draft',
                "tier_definition_json" jsonb not null,
                "first_stage_cap_rule_json" jsonb null,
                "second_stage_cap_rule_json" jsonb null,
                "retention_rule_json" jsonb null,
                "low_down_payment_rule_json" jsonb null,
                "exception_rule_json" jsonb null,
                "effective_from" timestamptz null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_rule_version_pkey" primary key ("id")
            );`
        );
        this.addSql(`alter table "poms"."commission_rule_version" add constraint "commission_rule_version_code_version_unique" unique ("rule_code", "version");`);
        this.addSql(`create index "idx_commission_rule_version_status" on "poms"."commission_rule_version" ("status");`);
        this.addSql(`create index "idx_commission_rule_version_effective_from" on "poms"."commission_rule_version" ("effective_from");`);

        // commission_role_assignment: per-project versioned participant set
        this.addSql(
            `create table "poms"."commission_role_assignment" (
                "id" uuid not null default gen_random_uuid(),
                "project_id" uuid not null,
                "version" integer not null,
                "is_current" boolean not null default true,
                "status" varchar(32) not null default 'draft',
                "participants_json" jsonb not null default '[]',
                "frozen_at" timestamptz null,
                "frozen_by" uuid null,
                "supersedes_id" uuid null,
                "row_version" integer not null default 1,
                "created_at" timestamptz not null default now(),
                "created_by" uuid null,
                "updated_at" timestamptz not null default now(),
                "updated_by" uuid null,
                constraint "commission_role_assignment_pkey" primary key ("id")
            );`
        );
        this.addSql(`alter table "poms"."commission_role_assignment" add constraint "commission_role_assignment_project_version_unique" unique ("project_id", "version");`);
        this.addSql(`create index "idx_commission_role_assignment_project_current" on "poms"."commission_role_assignment" ("project_id", "is_current");`);
        this.addSql(`create index "idx_commission_role_assignment_status" on "poms"."commission_role_assignment" ("status");`);

        this.addSql(`alter table "poms"."commission_role_assignment" add constraint "commission_role_assignment_project_id_foreign" foreign key ("project_id") references "poms"."project" ("id") on update cascade on delete cascade;`);
        this.addSql(`alter table "poms"."commission_role_assignment" add constraint "commission_role_assignment_supersedes_id_foreign" foreign key ("supersedes_id") references "poms"."commission_role_assignment" ("id") on update cascade on delete set null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."commission_role_assignment" drop constraint if exists "commission_role_assignment_supersedes_id_foreign";`);
        this.addSql(`alter table "poms"."commission_role_assignment" drop constraint if exists "commission_role_assignment_project_id_foreign";`);
        this.addSql(`drop table if exists "poms"."commission_role_assignment" cascade;`);
        this.addSql(`drop table if exists "poms"."commission_rule_version" cascade;`);
    }
}
