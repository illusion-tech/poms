import type { LeadDetailView, LeadListView, LeadSummary } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';

export function mapLeadToSummary(lead: Lead): LeadSummary {
    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceChannel: lead.sourceChannel ?? null,
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
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null
): LeadListView {
    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceChannel: lead.sourceChannel ?? null,
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
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null,
    convertedProject: Project | null
): LeadDetailView {
    return {
        ...mapLeadToSummary(lead),
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
