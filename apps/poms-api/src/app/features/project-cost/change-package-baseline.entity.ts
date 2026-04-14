import { defineEntity } from '@mikro-orm/core';
import { OperatingBaselinePackage } from './operating-baseline-package.entity';

const p = defineEntity.properties;

export const ChangePackageBaselineSchema = defineEntity({
    name: 'ChangePackageBaseline',
    tableName: 'change_package_baseline',
    schema: 'poms',
    comment: '已批准变更包基线明细',
    indexes: [
        { name: 'idx_cpb_baseline_package', properties: ['baselinePackageId', 'status'] }
    ],
    uniques: [
        { name: 'uq_cpb_package_change', properties: ['baselinePackageId', 'changePackageId'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('主键'),
        baselinePackageId: () => p.manyToOne(OperatingBaselinePackage).mapToPk().fieldName('baseline_package_id').comment('关联经营基线包'),
        changePackageId: p.uuid().fieldName('change_package_id').comment('变更包标识'),
        changeAmount: p.decimal().precision(18).scale(2).default(0).fieldName('change_amount').comment('变更金额（正增负减）'),
        changeSummary: p.text().nullable().fieldName('change_summary').comment('变更包说明'),
        status: p.string().length(32).default('active').comment('状态：active/voided'),
        effectiveAt: p.datetime().nullable().fieldName('effective_at').comment('生效时间'),
        createdAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).fieldName('created_at').comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人'),
        updatedAt: p.datetime().defaultRaw('now()').onCreate(() => new Date()).onUpdate(() => new Date()).fieldName('updated_at').comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号')
    }
});

export class ChangePackageBaseline extends ChangePackageBaselineSchema.class {}

ChangePackageBaselineSchema.setClass(ChangePackageBaseline);
