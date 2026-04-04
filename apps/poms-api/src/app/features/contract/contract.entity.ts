import { defineEntity } from '@mikro-orm/core';
import type { ContractStatus } from '@poms/shared-contracts';
import { Project } from '../project/project.entity';

const p = defineEntity.properties;

export const ContractSchema = defineEntity({
    name: 'Contract',
    tableName: 'contract',
    schema: 'poms',
    comment: 'POMS 第一阶段合同主表',
    indexes: [
        { name: 'idx_contract_project_id', properties: ['projectId'] },
        { name: 'idx_contract_status', properties: ['status'] }
    ],
    properties: {
        id: p.uuid().primary().defaultRaw('gen_random_uuid()').comment('合同主键'),
        projectId: () =>
            p
                .manyToOne(Project)
                .mapToPk()
                .fieldName('project_id')
                .foreignKeyName('contract_project_id_foreign')
                .updateRule('cascade')
                .deleteRule('restrict')
                .comment('所属项目标识'),
        contractNo: p.string().length(64).unique().fieldName('contract_no').comment('合同编号'),
        status: p.string().$type<ContractStatus>().length(32).comment('合同状态'),
        signedAmount: p.string().columnType('numeric(18,2)').defaultRaw('0').fieldName('signed_amount').comment('合同签约金额'),
        currencyCode: p.string().length(16).default('CNY').fieldName('currency_code').comment('币种代码'),
        currentSnapshotId: p.uuid().nullable().fieldName('current_snapshot_id').comment('当前生效条款快照标识'),
        signedAt: p.datetime().nullable().fieldName('signed_at').comment('签约时间'),
        rowVersion: p.integer().version().default(1).fieldName('row_version').comment('乐观锁版本号'),
        createdAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .fieldName('created_at')
            .comment('创建时间'),
        createdBy: p.uuid().nullable().fieldName('created_by').comment('创建人标识'),
        updatedAt: p
            .datetime()
            .defaultRaw('now()')
            .onCreate(() => new Date())
            .onUpdate(() => new Date())
            .fieldName('updated_at')
            .comment('最后更新时间'),
        updatedBy: p.uuid().nullable().fieldName('updated_by').comment('最后更新人标识')
    }
});

export class Contract extends ContractSchema.class {}

ContractSchema.setClass(Contract);
