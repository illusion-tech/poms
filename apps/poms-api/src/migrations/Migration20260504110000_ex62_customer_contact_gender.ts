import { Migration } from '@mikro-orm/migrations';

export class Migration20260504110000_ex62_customer_contact_gender extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."customer_contact" add column "gender" varchar(32) not null default 'unknown';`);
        this.addSql(`alter table "poms"."customer_contact" add constraint "chk_customer_contact_gender" check ("gender" in ('unknown', 'male', 'female'));`);
        this.addSql(`comment on column "poms"."customer_contact"."gender" is '联系人性别，用于业务称呼辅助';`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."customer_contact" drop constraint if exists "chk_customer_contact_gender";`);
        this.addSql(`alter table "poms"."customer_contact" drop column if exists "gender";`);
    }
}
