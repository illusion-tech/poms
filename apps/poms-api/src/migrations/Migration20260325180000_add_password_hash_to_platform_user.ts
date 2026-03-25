import { Migration } from '@mikro-orm/migrations';

export class Migration20260325180000_add_password_hash_to_platform_user extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."platform_user" add column "password_hash" varchar(255) null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."platform_user" drop column "password_hash";`);
    }
}
