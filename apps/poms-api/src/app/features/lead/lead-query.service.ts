import { NotFoundException, Injectable } from '@nestjs/common';
import type { LeadDetailView, LeadListQuery, LeadListView, LeadSourceListQuery, LeadSourceSummary } from '@poms/shared-contracts';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { mapLeadSourceToSummary, mapLeadToDetailView, mapLeadToListView } from './lead.mapper';
import { LeadRepository } from './lead.repository';
import { LeadSource } from './lead.entity';

@Injectable()
export class LeadQueryService {
    constructor(private readonly leadRepository: LeadRepository) {}

    async listLeadSources(query: LeadSourceListQuery = {}): Promise<LeadSourceSummary[]> {
        const sources = await this.leadRepository.findLeadSources(query);
        const usageCounts = await this.leadRepository.countLeadsBySourceIds(sources.map((source) => source.id));

        return sources.map((source) => mapLeadSourceToSummary(source, usageCounts.get(source.id) ?? 0));
    }

    async countLeadSourceUsage(sourceId: string): Promise<number> {
        const usageCounts = await this.leadRepository.countLeadsBySourceIds([sourceId]);
        return usageCounts.get(sourceId) ?? 0;
    }

    async listLeads(query: LeadListQuery): Promise<LeadListView[]> {
        const leads = await this.leadRepository.findMany(query);
        const context = await this.loadListContext(leads);

        return leads.map((lead) =>
            mapLeadToListView(
                lead,
                context.sourceMap.get(lead.sourceId) ?? null,
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

        const [source, owner, ownerOrg, convertedProjects] = await Promise.all([
            this.leadRepository.findLeadSourceById(lead.sourceId),
            lead.ownerUserId ? this.leadRepository.findPlatformUserById(lead.ownerUserId) : Promise.resolve(null),
            lead.ownerOrgId ? this.leadRepository.findOrgUnitById(lead.ownerOrgId) : Promise.resolve(null),
            lead.convertedProjectId ? this.leadRepository.findProjectsByIds([lead.convertedProjectId]) : Promise.resolve([])
        ]);

        return mapLeadToDetailView(lead, source, owner, ownerOrg, convertedProjects[0] ?? null);
    }

    private async loadListContext(leads: { sourceId: string; ownerUserId?: string | null; ownerOrgId?: string | null }[]): Promise<{
        sourceMap: Map<string, LeadSource>;
        userMap: Map<string, PlatformUser>;
        orgUnitMap: Map<string, OrgUnit>;
    }> {
        const sourceIds = [...new Set(leads.map((lead) => lead.sourceId).filter((id): id is string => Boolean(id)))];
        const ownerUserIds = [...new Set(leads.map((lead) => lead.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(leads.map((lead) => lead.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const [sources, users, orgUnits] = await Promise.all([
            Promise.all(sourceIds.map((id) => this.leadRepository.findLeadSourceById(id))).then((items) => items.filter((source): source is LeadSource => Boolean(source))),
            this.leadRepository.findPlatformUsersByIds(ownerUserIds),
            this.leadRepository.findOrgUnitsByIds(ownerOrgIds)
        ]);

        return {
            sourceMap: new Map(sources.map((source) => [source.id, source])),
            userMap: new Map(users.map((user) => [user.id, user])),
            orgUnitMap: new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit]))
        };
    }
}
