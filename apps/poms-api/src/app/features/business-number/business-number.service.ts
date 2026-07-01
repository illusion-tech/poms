import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

interface BusinessNumberEntityManager {
    getConnection(): {
        execute(query: string, params?: unknown[]): Promise<unknown>;
    };
}

export type BusinessNumberScope = 'customer' | 'lead' | 'project' | 'contract' | 'cost-payment-fact' | 'cost-invoice' | 'cost-expense' | 'cost-procurement' | 'cost-labor';

interface BusinessNumberSpec {
    prefix: string;
    padding: number;
    description: string;
}

const BUSINESS_NUMBER_SPECS: Record<BusinessNumberScope, BusinessNumberSpec> = {
    customer: { prefix: 'CUST', padding: 6, description: '客户编号' },
    lead: { prefix: 'LD', padding: 6, description: '线索编号' },
    project: { prefix: 'PRJ', padding: 6, description: '项目编号' },
    contract: { prefix: 'CT', padding: 6, description: '合同编号' },
    'cost-payment-fact': { prefix: 'AC-PAY', padding: 6, description: '付款事实实际成本编号' },
    'cost-invoice': { prefix: 'AC-INV', padding: 6, description: '发票实际成本编号' },
    'cost-expense': { prefix: 'AC-EXP', padding: 6, description: '费用实际成本编号' },
    'cost-procurement': { prefix: 'AC-PRC', padding: 6, description: '采购实际成本编号' },
    'cost-labor': { prefix: 'AC-LBR', padding: 6, description: '人力实际成本编号' }
};

@Injectable()
export class BusinessNumberService {
    constructor(@Inject(EntityManager) private readonly entityManager: EntityManager) {}

    async next(scope: BusinessNumberScope, at = new Date(), em: BusinessNumberEntityManager = this.entityManager): Promise<string> {
        const spec = BUSINESS_NUMBER_SPECS[scope];
        const period = String(at.getUTCFullYear());
        const rows = (await em.getConnection().execute(
            `
                insert into "poms"."business_number_sequence"
                    ("scope", "period", "next_value", "prefix", "padding", "description", "created_at", "updated_at")
                values (?, ?, 2, ?, ?, ?, now(), now())
                on conflict ("scope", "period")
                do update set
                    "next_value" = "poms"."business_number_sequence"."next_value" + 1,
                    "prefix" = excluded."prefix",
                    "padding" = excluded."padding",
                    "description" = excluded."description",
                    "updated_at" = now()
                returning "next_value" - 1 as "sequence_value";
            `,
            [scope, period, spec.prefix, spec.padding, spec.description]
        )) as { sequence_value: number | string }[];
        const sequenceValue = Number(rows[0]?.sequence_value);

        return this.format(spec.prefix, period, sequenceValue, spec.padding);
    }

    format(prefix: string, period: string, value: number, padding: number): string {
        return `${prefix}-${period}-${String(value).padStart(padding, '0')}`;
    }
}
