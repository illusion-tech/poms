import { NotFoundException, Injectable } from '@nestjs/common';
import type { LeadDetailView, LeadListQuery, LeadListView } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { mapLeadToDetailView, mapLeadToListView } from './lead.mapper';
import { LeadRepository } from './lead.repository';

@Injectable()
export class LeadQueryService {
    constructor(private readonly leadRepository: LeadRepository) {}

    async listLeads(query: LeadListQuery): Promise<LeadListView[]> {
        const leads = await this.leadRepository.findMany(query);
        const context = await this.loadOwnerContext(leads);

        return leads.map((lead) =>
            mapLeadToListView(
                lead,
                lead.ownerUserId ? context.userMap.get(lead.ownerUserId) ?? null : null,
                lead.ownerOrgId ? context.orgUnitMap.get(lead.ownerOrgId) ?? null : null
            )
        );
    }

    async getLead(id: string): Promise<LeadDetailView> {
        const lead = await this.leadRepository.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        const [owner, ownerOrg] = await Promise.all([
            lead.ownerUserId ? this.leadRepository.findPlatformUserById(lead.ownerUserId) : Promise.resolve(null),
            lead.ownerOrgId ? this.leadRepository.findOrgUnitById(lead.ownerOrgId) : Promise.resolve(null)
        ]);

        return mapLeadToDetailView(lead, owner, ownerOrg);
    }

    private async loadOwnerContext(leads: { ownerUserId?: string | null; ownerOrgId?: string | null }[]): Promise<{
        userMap: Map<string, PlatformUser>;
        orgUnitMap: Map<string, OrgUnit>;
    }> {
        const ownerUserIds = [...new Set(leads.map((lead) => lead.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(leads.map((lead) => lead.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const [users, orgUnits] = await Promise.all([
            this.leadRepository.findPlatformUsersByIds(ownerUserIds),
            this.leadRepository.findOrgUnitsByIds(ownerOrgIds)
        ]);

        return {
            userMap: new Map(users.map((user) => [user.id, user])),
            orgUnitMap: new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]))
        };
    }
}
