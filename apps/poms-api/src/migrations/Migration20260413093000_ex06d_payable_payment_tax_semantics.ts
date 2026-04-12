import { Migration } from '@mikro-orm/migrations';

export class Migration20260413093000_ex06d_payable_payment_tax_semantics extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "poms"."payment_record" add column "currency" varchar(16) not null default 'CNY';`);
        this.addSql(`alter table "poms"."payment_record" add column "amount_excluding_tax" decimal(18,2) null;`);
        this.addSql(`alter table "poms"."payment_record" add column "tax_amount" decimal(18,2) null;`);
        this.addSql(`alter table "poms"."payment_record" add column "amount_including_tax" decimal(18,2) null;`);
        this.addSql(`update "poms"."payment_record" set "amount_excluding_tax" = "payment_amount" where "amount_excluding_tax" is null;`);
        this.addSql(`alter table "poms"."payment_record" alter column "amount_excluding_tax" set not null;`);

        this.addSql(`alter table "poms"."payable_record" add column "amount_excluding_tax" decimal(18,2) null;`);
        this.addSql(`alter table "poms"."payable_record" add column "tax_amount" decimal(18,2) null;`);
        this.addSql(`alter table "poms"."payable_record" add column "amount_including_tax" decimal(18,2) null;`);
        this.addSql(`update "poms"."payable_record" set "amount_excluding_tax" = "registered_amount" where "amount_excluding_tax" is null;`);
        this.addSql(`alter table "poms"."payable_record" alter column "amount_excluding_tax" set not null;`);

        this.addSql(`
            update "poms"."project_actual_cost_record"
            set
                "amount_excluding_tax" = "amount_including_tax",
                "amount_including_tax" = null,
                "tax_cost_amount" = null
            where "source_type" in ('PAYMENT_RECORD', 'PAYABLE_RECORD')
              and "amount_excluding_tax" is null
              and "tax_cost_amount" is null
              and "amount_including_tax" is not null;
        `);

        this.addSql(`
            update "poms"."payable_record" p
            set "status" = case
                when totals.total_amount >= p."amount_excluding_tax" then 'completed'
                when totals.total_amount > 0 then 'partially-paid'
                else p."status"
            end
            from (
                select "payable_record_id", sum("amount_excluding_tax") as total_amount
                from "poms"."payment_record"
                where "payable_record_id" is not null and "status" = 'confirmed'
                group by "payable_record_id"
            ) totals
            where p."id" = totals."payable_record_id";
        `);
        this.addSql(`
            update "poms"."payable_record"
            set "status" = 'recorded'
            where "status" in ('partially-paid', 'completed')
              and "id" not in (
                  select distinct "payable_record_id"
                  from "poms"."payment_record"
                  where "payable_record_id" is not null and "status" = 'confirmed'
              );
        `);

        this.addSql(`alter table "poms"."payment_record" drop column "payment_amount";`);
        this.addSql(`alter table "poms"."payable_record" drop column "paid_amount";`);
        this.addSql(`alter table "poms"."payable_record" drop column "registered_amount";`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "poms"."payment_record" add column "payment_amount" decimal(18,2) null;`);
        this.addSql(`
            update "poms"."payment_record"
            set "payment_amount" = coalesce("amount_including_tax", "amount_excluding_tax");
        `);
        this.addSql(`alter table "poms"."payment_record" alter column "payment_amount" set not null;`);

        this.addSql(`alter table "poms"."payable_record" add column "registered_amount" decimal(18,2) null;`);
        this.addSql(`alter table "poms"."payable_record" add column "paid_amount" decimal(18,2) not null default '0';`);
        this.addSql(`
            update "poms"."payable_record"
            set "registered_amount" = coalesce("amount_including_tax", "amount_excluding_tax");
        `);
        this.addSql(`
            update "poms"."payable_record" p
            set "paid_amount" = coalesce(totals.total_amount, 0)
            from (
                select "payable_record_id", sum(coalesce("amount_including_tax", "amount_excluding_tax")) as total_amount
                from "poms"."payment_record"
                where "payable_record_id" is not null and "status" = 'confirmed'
                group by "payable_record_id"
            ) totals
            where p."id" = totals."payable_record_id";
        `);
        this.addSql(`alter table "poms"."payable_record" alter column "registered_amount" set not null;`);

        this.addSql(`alter table "poms"."payment_record" drop column "amount_including_tax";`);
        this.addSql(`alter table "poms"."payment_record" drop column "tax_amount";`);
        this.addSql(`alter table "poms"."payment_record" drop column "amount_excluding_tax";`);
        this.addSql(`alter table "poms"."payment_record" drop column "currency";`);

        this.addSql(`alter table "poms"."payable_record" drop column "amount_including_tax";`);
        this.addSql(`alter table "poms"."payable_record" drop column "tax_amount";`);
        this.addSql(`alter table "poms"."payable_record" drop column "amount_excluding_tax";`);
    }
}
