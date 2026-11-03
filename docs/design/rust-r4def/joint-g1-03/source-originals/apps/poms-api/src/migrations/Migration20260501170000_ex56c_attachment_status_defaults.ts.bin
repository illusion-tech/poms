import { Migration } from '@mikro-orm/migrations';

export class Migration20260501170000_ex56c_attachment_status_defaults extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."attachment" alter column "status" set default 'active';`);
        this.addSql(`alter table "poms"."attachment_link" alter column "status" set default 'active';`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."attachment_link" alter column "status" drop default;`);
        this.addSql(`alter table "poms"."attachment" alter column "status" drop default;`);
    }
}
