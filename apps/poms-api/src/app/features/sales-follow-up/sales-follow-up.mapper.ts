import type { SalesFollowUpRecordSummary } from '@poms/shared-contracts';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';

export interface SalesFollowUpRecordContext {
    customer: Customer | null;
    lead: Lead | null;
    project: Project | null;
    ownerUser: PlatformUser | null;
    ownerOrg: OrgUnit | null;
    voidedByUser?: PlatformUser | null;
}

export function mapSalesFollowUpRecordToSummary(record: SalesFollowUpRecord, context: SalesFollowUpRecordContext): SalesFollowUpRecordSummary {
    return {
        id: record.id,
        customerId: record.customerId,
        customerName: context.customer?.displayName ?? '',
        leadId: record.leadId ?? null,
        leadName: context.lead?.leadName ?? null,
        projectId: record.projectId ?? null,
        projectName: context.project?.projectName ?? null,
        followUpType: record.followUpType,
        status: record.status,
        occurredAt: record.occurredAt.toISOString(),
        summary: record.summary,
        detail: record.detail ?? null,
        outcome: record.outcome,
        nextFollowUpAt: record.nextFollowUpAt?.toISOString() ?? null,
        ownerOrgId: record.ownerOrgId ?? null,
        ownerOrgName: context.ownerOrg?.name ?? null,
        ownerUserId: record.ownerUserId ?? null,
        ownerName: context.ownerUser?.displayName ?? null,
        supersedesId: record.supersedesRecordId ?? null,
        replacedById: record.replacedByRecordId ?? null,
        replacementReason: record.replacementReason ?? null,
        voidedAt: record.voidedAt?.toISOString() ?? null,
        voidedBy: record.voidedBy ?? null,
        voidedByName: context.voidedByUser?.displayName ?? null,
        voidReason: record.voidReason ?? null,
        rowVersion: record.rowVersion,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null
    };
}
