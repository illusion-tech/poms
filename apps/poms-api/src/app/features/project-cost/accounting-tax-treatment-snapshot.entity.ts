import { defineEntity } from '@mikro-orm/core';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const AccountingTaxTreatmentSnapshotSchema = defineEntity({
    name: 'AccountingTaxTreatmentSnapshot',
    tableName: 'accounting_tax_treatment_snapshot',
    schema: 'poms',
    comment: '税务处理与核算口径快照',
    indexes: [
        { name: 'idx_atts_project_status', properties: ['projectId', 'status'] },
        { name: 'idx_atts_type_deductibility', properties: ['taxTreatmentType', 'deductibilityStatus'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        projectId: () => p.manyToOne(Project).mapToPk().fieldName('project_id').comment('关联项目'),
        taxTreatmentType: p.string().length(64).fieldName('tax_treatment_type').comment('税务处理类型'),
        deductibilityStatus: p.string().length(32).fieldName('deductibility_status').comment('可抵扣状态'),
        taxImpactAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_amount').comment('税务影响金额'),
        taxPendingFlag: p.boolean().default(false).fieldName('tax_pending_flag').comment('是否存在待确认税务影响'),
        taxImpactSummary: p.text().fieldName('tax_impact_summary').comment('税务影响摘要（供 L4/L5 稳定消费）'),
        taxImpactPendingAmount: p.decimal().precision(18).scale(2).default(0).fieldName('tax_impact_pending_amount').comment('待确认税务影响金额'),
        basisSummary: p.text().nullable().fieldName('basis_summary').comment('判断依据摘要'),
        status: p.string().length(32).default('pending').comment('状态：pending/active/superseded/voided'),
        supersedesId: p.uuid().nullable().fieldName('supersedes_id').comment('被替代的旧税务处理快照 ID'),
        confirmedAt: p.datetime().nullable().fieldName('confirmed_at').comment('确认时间'),
        confirmedBy: p.uuid().nullable().fieldName('confirmed_by').comment('确认人'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class AccountingTaxTreatmentSnapshot extends AccountingTaxTreatmentSnapshotSchema.class {}

AccountingTaxTreatmentSnapshotSchema.setClass(AccountingTaxTreatmentSnapshot);
