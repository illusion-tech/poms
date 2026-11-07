import { Migration } from '@mikro-orm/migrations';

export class Migration20260328120000_init_runtime_audit_and_security_event extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create table "poms"."audit_log" (
                "id" uuid not null default gen_random_uuid(),
                "event_type" varchar(128) not null,
                "target_type" varchar(64) not null,
                "target_id" varchar(128) not null,
                "operator_id" uuid null,
                "request_id" varchar(64) null,
                "result" varchar(32) not null,
                "reason" text null,
                "before_snapshot" jsonb null,
                "after_snapshot" jsonb null,
                "metadata" jsonb null,
                "occurred_at" timestamptz not null default now(),
                constraint "audit_log_pkey" primary key ("id")
            );`
        );
        this.addSql(`create index "idx_audit_log_occurred_at" on "poms"."audit_log" ("occurred_at");`);
        this.addSql(`create index "idx_audit_log_target" on "poms"."audit_log" ("target_type", "target_id", "occurred_at");`);
        this.addSql(`create index "idx_audit_log_event_type" on "poms"."audit_log" ("event_type", "occurred_at");`);
        this.addSql(`create index "idx_audit_log_operator_id" on "poms"."audit_log" ("operator_id", "occurred_at");`);

        this.addSql(
            `create table "poms"."security_event" (
                "id" uuid not null default gen_random_uuid(),
                "event_type" varchar(128) not null,
                "severity" varchar(16) not null,
                "actor_id" uuid null,
                "principal" varchar(255) null,
                "request_id" varchar(64) null,
                "path" varchar(255) not null,
                "method" varchar(16) null,
                "permission_key" varchar(128) null,
                "result" varchar(32) not null,
                "ip" varchar(64) null,
                "user_agent" varchar(512) null,
                "details" jsonb null,
                "occurred_at" timestamptz not null default now(),
                constraint "security_event_pkey" primary key ("id")
            );`
        );
        this.addSql(`create index "idx_security_event_occurred_at" on "poms"."security_event" ("occurred_at");`);
        this.addSql(`create index "idx_security_event_event_type" on "poms"."security_event" ("event_type", "occurred_at");`);
        this.addSql(`create index "idx_security_event_actor_id" on "poms"."security_event" ("actor_id", "occurred_at");`);
        this.addSql(`create index "idx_security_event_path" on "poms"."security_event" ("path", "occurred_at");`);
    }

    override async down(): Promise<void> {
        this.addSql(`drop table if exists "poms"."security_event" cascade;`);
        this.addSql(`drop table if exists "poms"."audit_log" cascade;`);
    }
}
