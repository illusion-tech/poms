import { Migration } from '@mikro-orm/migrations';

export class Migration20261117200000_commission_contract_allocation_release extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table poms.commission_payout
            add column source_contract_scope jsonb null,
            add column approved_contract_allocations jsonb null,
            add column paid_contract_allocations jsonb null;`);
        this.addSql(`create table poms.commission_low_down_payment_release (
            id uuid primary key default gen_random_uuid(),
            project_id uuid not null references poms.project(id) on delete restrict,
            freeze_version_id uuid not null references poms.commission_role_assignment(id) on delete restrict,
            freeze_row_version integer not null check (freeze_row_version > 0),
            source_handover_id uuid not null references poms.project_handover(id) on delete restrict,
            contract_ids jsonb not null check (jsonb_typeof(contract_ids)='array' and jsonb_array_length(contract_ids)>0),
            source_contract_scope jsonb not null check (jsonb_typeof(source_contract_scope)='array'),
            decision varchar(32) not null check (decision in ('raise-first-cap','release-standard')),
            reason text not null check (length(btrim(reason)) between 1 and 2000),
            conditions_confirmed boolean not null check (conditions_confirmed),
            criteria jsonb not null,
            approved_by uuid not null references poms.platform_user(id) on delete restrict,
            approved_at timestamptz not null default now(),
            row_version integer not null default 1 check (row_version=1),
            unique(freeze_version_id,decision,contract_ids)
        );`);
        this.addSql('create index idx_commission_low_down_release_project on poms.commission_low_down_payment_release(project_id,approved_at desc);');
        this.addSql(`create function poms.commission_low_down_release_immutable() returns trigger language plpgsql as $$
            begin raise exception 'management approval history is immutable' using errcode='23514'; end $$;
            create trigger commission_low_down_release_immutable before update or delete on poms.commission_low_down_payment_release
            for each row execute function poms.commission_low_down_release_immutable();`);
    }

    override async down(): Promise<void> {
        this.addSql(`do $$ begin
            if exists(select 1 from poms.commission_low_down_payment_release)
                or exists(select 1 from poms.commission_payout where source_contract_scope is not null or approved_contract_allocations is not null or paid_contract_allocations is not null)
            then raise exception 'commission approval and allocation history must be preserved'; end if;
        end $$;`);
        this.addSql('drop table poms.commission_low_down_payment_release; drop function poms.commission_low_down_release_immutable();');
        this.addSql('alter table poms.commission_payout drop column source_contract_scope, drop column approved_contract_allocations, drop column paid_contract_allocations;');
    }
}
