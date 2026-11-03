import { Migration } from '@mikro-orm/migrations';

export class Migration20260404074500_add_org_unit_structure_constraints extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `create unique index "uq_org_unit_parent_name_ci" on "poms"."org_unit" ((coalesce("parent_id", '00000000-0000-0000-0000-000000000000'::uuid)), (lower("name")));`
        );
        this.addSql(`create index "idx_org_unit_parent_display_order" on "poms"."org_unit" ("parent_id", "display_order", "created_at");`);
        this.addSql(`alter table "poms"."org_unit" add constraint "chk_org_unit_parent_not_self" check ("parent_id" is null or "parent_id" <> "id");`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."org_unit" drop constraint if exists "chk_org_unit_parent_not_self";`);
        this.addSql(`drop index if exists "poms"."idx_org_unit_parent_display_order";`);
        this.addSql(`drop index if exists "poms"."uq_org_unit_parent_name_ci";`);
    }
}
