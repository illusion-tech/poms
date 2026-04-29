import type { LeadDetailView, LeadListView, LeadSourceSummary, LeadSummary } from '@poms/shared-contracts';
import { toBusinessDateOnly } from '../../core/date/business-date.utils';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { Lead, LeadSource } from './lead.entity';

export function mapLeadSourceToSummary(source: LeadSource, usageCount = 0): LeadSourceSummary {
    return {
        id: source.id,
        code: source.code,
        name: source.name,
        description: source.description ?? null,
        status: source.status,
        sortOrder: source.sortOrder,
        usageCount,
        rowVersion: source.rowVersion,
        createdAt: source.createdAt.toISOString(),
        createdBy: source.createdBy ?? null,
        updatedAt: source.updatedAt.toISOString(),
        updatedBy: source.updatedBy ?? null
    };
}

export function mapLeadToSummary(lead: Lead, source: LeadSource | null = null): LeadSummary {
    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceId: lead.sourceId,
        sourceName: source?.name ?? lead.sourceChannel ?? null,
        sourceChannel: lead.sourceChannel ?? null,
        demandDescription: lead.demandDescription ?? null,
        budgetStatus: lead.budgetStatus,
        estimatedAmount: lead.estimatedAmount ?? null,
        urgency: lead.urgency,
        expectedDecisionDate: toBusinessDateOnly(lead.expectedDecisionDate),
        status: lead.status,
        ownerOrgId: lead.ownerOrgId ?? null,
        ownerUserId: lead.ownerUserId ?? null,
        qualificationSummary: lead.qualificationSummary ?? null,
        qualifiedAt: lead.qualifiedAt?.toISOString() ?? null,
        qualifiedBy: lead.qualifiedBy ?? null,
        closedReason: lead.closedReason ?? null,
        closedAt: lead.closedAt?.toISOString() ?? null,
        closedBy: lead.closedBy ?? null,
        convertedProjectId: lead.convertedProjectId ?? null,
        convertedAt: lead.convertedAt?.toISOString() ?? null,
        convertedBy: lead.convertedBy ?? null,
        rowVersion: lead.rowVersion,
        createdAt: lead.createdAt.toISOString(),
        createdBy: lead.createdBy ?? null,
        updatedAt: lead.updatedAt.toISOString(),
        updatedBy: lead.updatedBy ?? null
    };
}

export function mapLeadToListView(
    lead: Lead,
    source: LeadSource | null,
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null
): LeadListView {
    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceId: lead.sourceId,
        sourceName: source?.name ?? lead.sourceChannel ?? null,
        sourceChannel: lead.sourceChannel ?? null,
        demandDescription: lead.demandDescription ?? null,
        budgetStatus: lead.budgetStatus,
        estimatedAmount: lead.estimatedAmount ?? null,
        urgency: lead.urgency,
        expectedDecisionDate: toBusinessDateOnly(lead.expectedDecisionDate),
        status: lead.status,
        ownerName: owner?.displayName ?? null,
        ownerOrgName: ownerOrg?.name ?? null,
        qualifiedAt: lead.qualifiedAt?.toISOString() ?? null,
        convertedProjectId: lead.convertedProjectId ?? null,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString()
    };
}

export function mapLeadToDetailView(
    lead: Lead,
    source: LeadSource | null,
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null,
    convertedProject: Project | null
): LeadDetailView {
    return {
        ...mapLeadToSummary(lead, source),
        ownerName: owner?.displayName ?? null,
        ownerOrgName: ownerOrg?.name ?? null,
        sourceSummary: lead.sourceChannel ? `来源渠道：${lead.sourceChannel}` : null,
        convertedProjectSummary: convertedProject
            ? {
                  id: convertedProject.id,
                  projectNo: convertedProject.projectNo,
                  projectName: convertedProject.projectName,
                  customerId: convertedProject.customerId ?? null,
                  status: convertedProject.status,
                  currentStage: convertedProject.currentStage
              }
            : null
    };
}
