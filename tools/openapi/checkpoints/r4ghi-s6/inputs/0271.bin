import { Migration } from '@mikro-orm/migrations';

export class Migration20260405100000_extract_local_credential_and_add_verified_fields extends Migration {
    override async up(): Promise<void> {
        // Create local_credential table
        this.addSql(
            `create table "poms"."local_credential" ("id" uuid not null default gen_random_uuid(), "user_id" uuid not null, "password_hash" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), constraint "local_credential_pkey" primary key ("id"));`
        );
        this.addSql(`alter table "poms"."local_credential" add constraint "local_credential_user_id_unique" unique ("user_id");`);
        this.addSql(
            `alter table "poms"."local_credential" add constraint "local_credential_user_id_foreign" foreign key ("user_id") references "poms"."platform_user" ("id") on update cascade on delete cascade;`
        );

        // Migrate existing password hashes from platform_user into local_credential
        this.addSql(
            `insert into "poms"."local_credential" ("id", "user_id", "password_hash") select gen_random_uuid(), "id", "password_hash" from "poms"."platform_user" where "password_hash" is not null;`
        );

        // Drop password_hash from platform_user
        this.addSql(`alter table "poms"."platform_user" drop column "password_hash";`);

        // Add email_verified and phone_verified to platform_user
        this.addSql(`alter table "poms"."platform_user" add column "email_verified" boolean not null default false;`);
        this.addSql(`alter table "poms"."platform_user" add column "phone_verified" boolean not null default false;`);
    }

    override async down(): Promise<void> {
        // Restore password_hash column
        this.addSql(`alter table "poms"."platform_user" add column "password_hash" varchar(255) null;`);

        // Restore data from local_credential
        this.addSql(
            `update "poms"."platform_user" u set "password_hash" = lc."password_hash" from "poms"."local_credential" lc where lc."user_id" = u."id";`
        );

        // Drop verified fields
        this.addSql(`alter table "poms"."platform_user" drop column "email_verified";`);
        this.addSql(`alter table "poms"."platform_user" drop column "phone_verified";`);

        // Drop local_credential table
        this.addSql(`alter table "poms"."local_credential" drop constraint if exists "local_credential_user_id_foreign";`);
        this.addSql(`drop table if exists "poms"."local_credential";`);
    }
}
