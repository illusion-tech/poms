import { Inject, NotFoundException, Injectable } from '@nestjs/common';
import {
    DictionaryDomainValue,
    LeadAllowedActionValue,
    LeadOwnershipScopeValue,
    LeadStatusValue,
    LeadWorkbenchScopeValue,
    type DictionaryItemSummary,
    type LeadAllowedAction,
    type LeadDetailView,
    type LeadListQuery,
    type LeadListResponse,
    type UserPayload
} from '@poms/shared-contracts';
import { DictionaryService } from '../dictionary/dictionary.service';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { mapLeadToDetailView, mapLeadToListView } from './lead.mapper';
import { LeadRepository } from './lead.repository';
import { LeadScoreService } from './lead-score.service';
import { buildLeadWorkbenchFacets, buildLeadWorkbenchSummary, leadMatchesWorkbenchScope } from './lead-workbench';

const LEAD_ASSIGNABLE_STATUSES: readonly string[] = [LeadStatusValue.Registered, LeadStatusValue.Qualified];
const DEFAULT_LEAD_LIST_PAGE = 1;
const DEFAULT_LEAD_LIST_PAGE_SIZE = 500;

@Injectable()
export class LeadQueryService {
    constructor(
        @Inject(LeadRepository) private readonly leadRepository: LeadRepository,
        @Inject(DictionaryService) private readonly dictionaryService: DictionaryService,
        @Inject(LeadScoreService) private readonly leadScoreService: LeadScoreService
    ) {}

    async listLeads(query: LeadListQuery, user: UserPayload): Promise<LeadListResponse> {
        const scope = query.scope ?? LeadWorkbenchScopeValue.Active;
        const page = query.page ?? DEFAULT_LEAD_LIST_PAGE;
        const pageSize = query.pageSize ?? DEFAULT_LEAD_LIST_PAGE_SIZE;
        const leads = await this.leadRepository.findMany(this.resolveLeadListRepositoryQuery(query, user));
        const summary = buildLeadWorkbenchSummary(leads);
        const scopedLeads = leads.filter((lead) => leadMatchesWorkbenchScope(lead, scope));
        const totalItems = scopedLeads.length;
        const pageLeads = scopedLeads.slice((page - 1) * pageSize, page * pageSize);
        const context = await this.loadListContext(pageLeads);
        const activeOverrideMap = await this.leadScoreService.findActiveOverridesByLeadIds(pageLeads.map((lead) => lead.id));

        return {
            scope,
            summary,
            facets: buildLeadWorkbenchFacets(summary),
            totalItems,
            page,
            pageSize,
            items: pageLeads.map((lead) =>
                mapLeadToListView(
                    lead,
                    context.sourceMap.get(lead.sourceCode) ?? null,
                    lead.ownerUserId ? (context.userMap.get(lead.ownerUserId) ?? null) : null,
                    lead.ownerOrgId ? (context.orgUnitMap.get(lead.ownerOrgId) ?? null) : null,
                    lead.convertedProjectId ? (context.projectMap.get(lead.convertedProjectId) ?? null) : null,
                    activeOverrideMap.get(lead.id) ?? null,
                    this.resolveAllowedActions(lead, user)
                )
            )
        };
    }

    async getLead(id: string, user: UserPayload): Promise<LeadDetailView> {
        const lead = await this.leadRepository.findById(id);
        if (!lead) {
            throw new NotFoundException(`Lead ${id} not found`);
        }

        const [source, owner, ownerOrg, convertedProjects, activeOverride] = await Promise.all([
            this.loadSourceDictionaryMap([lead.sourceCode]).then((sourceMap) => sourceMap.get(lead.sourceCode) ?? null),
            lead.ownerUserId ? this.leadRepository.findPlatformUserById(lead.ownerUserId) : Promise.resolve(null),
            lead.ownerOrgId ? this.leadRepository.findOrgUnitById(lead.ownerOrgId) : Promise.resolve(null),
            lead.convertedProjectId ? this.leadRepository.findProjectsByIds([lead.convertedProjectId]) : Promise.resolve([]),
            this.leadScoreService.findActiveOverrideByLeadId(lead.id)
        ]);

        return mapLeadToDetailView(lead, source, owner, ownerOrg, convertedProjects[0] ?? null, activeOverride, this.resolveAllowedActions(lead, user));
    }

    private resolveLeadListRepositoryQuery(query: LeadListQuery, user: UserPayload): Omit<LeadListQuery, 'scope' | 'page' | 'pageSize' | 'ownershipScope'> & { unassignedOnly?: boolean } {
        const repositoryQuery = {
            sourceCode: query.sourceCode,
            budgetStatus: query.budgetStatus,
            urgency: query.urgency,
            rating: query.rating,
            ownerOrgId: query.ownerOrgId,
            ownerUserId: query.ownerUserId,
            keyword: query.keyword
        };

        if (query.ownershipScope === LeadOwnershipScopeValue.Mine) {
            return {
                ...repositoryQuery,
                ownerUserId: user.sub,
                unassignedOnly: false
            };
        }

        if (query.ownershipScope === LeadOwnershipScopeValue.PublicPool) {
            return {
                ...repositoryQuery,
                ownerUserId: undefined,
                unassignedOnly: true
            };
        }

        return repositoryQuery;
    }

    private resolveAllowedActions(lead: { status: string; ownerUserId?: string | null }, user: UserPayload): LeadAllowedAction[] {
        const permissions = new Set(user.permissions);
        const isAssignableStatus = LEAD_ASSIGNABLE_STATUSES.includes(lead.status);
        const actions: LeadAllowedAction[] = [];

        if (isAssignableStatus && !lead.ownerUserId && permissions.has('lead:write')) {
            actions.push(LeadAllowedActionValue.ClaimLeadOwner);
        }

        if (isAssignableStatus && permissions.has('lead:assign')) {
            actions.push(LeadAllowedActionValue.AssignLeadOwner);
        }

        return actions;
    }

    private async loadListContext(leads: { sourceCode: string; ownerUserId?: string | null; ownerOrgId?: string | null; convertedProjectId?: string | null }[]): Promise<{
        sourceMap: Map<string, DictionaryItemSummary>;
        userMap: Map<string, PlatformUser>;
        orgUnitMap: Map<string, OrgUnit>;
        projectMap: Map<string, Project>;
    }> {
        const sourceCodes = [...new Set(leads.map((lead) => lead.sourceCode).filter((code): code is string => Boolean(code)))];
        const ownerUserIds = [...new Set(leads.map((lead) => lead.ownerUserId).filter((id): id is string => Boolean(id)))];
        const ownerOrgIds = [...new Set(leads.map((lead) => lead.ownerOrgId).filter((id): id is string => Boolean(id)))];
        const convertedProjectIds = [...new Set(leads.map((lead) => lead.convertedProjectId).filter((id): id is string => Boolean(id)))];
        const [sourceMap, users, orgUnits, projects] = await Promise.all([
            this.loadSourceDictionaryMap(sourceCodes),
            this.leadRepository.findPlatformUsersByIds(ownerUserIds),
            this.leadRepository.findOrgUnitsByIds(ownerOrgIds),
            this.leadRepository.findProjectsByIds(convertedProjectIds)
        ]);

        return {
            sourceMap,
            userMap: new Map(users.map((user) => [user.id, user])),
            orgUnitMap: new Map(orgUnits.map((orgUnit) => [orgUnit.id, orgUnit])),
            projectMap: new Map(projects.map((project) => [project.id, project]))
        };
    }

    private async loadSourceDictionaryMap(sourceCodes: string[]): Promise<Map<string, DictionaryItemSummary>> {
        if (sourceCodes.length === 0) {
            return new Map();
        }

        const sourceCodeSet = new Set(sourceCodes);
        const items = await this.dictionaryService.listItems({ domain: DictionaryDomainValue.LeadSource });
        return new Map(items.filter((item) => sourceCodeSet.has(item.code)).map((item) => [item.code, item]));
    }
}
