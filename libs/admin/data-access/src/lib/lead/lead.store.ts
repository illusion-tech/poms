import { computed, inject, Injectable, signal } from '@angular/core';
import type {
    ApproveLeadScoreOverrideRequest,
    AssignLeadOwnerRequest,
    ClaimLeadOwnerRequest,
    CloseLeadRequest,
    ConvertLeadToProjectRequest,
    CreateLeadRequest,
    LeadDetailView,
    LeadListResponse,
    LeadListView,
    LeadScoreHistoryView,
    LeadScoreOverrideSummary,
    LeadWorkbenchFacet,
    LeadWorkbenchScope,
    LeadWorkbenchSummary,
    QualifyLeadRequest,
    RejectLeadScoreOverrideRequest,
    RevokeLeadScoreOverrideRequest,
    SubmitLeadScoreOverrideRequest,
    UpdateLeadRequest
} from '@poms/shared-api-client';
import { LeadApi, LeadBudgetStatus, LeadOwnershipScope, LeadRating, LeadWorkbenchScope as LeadWorkbenchScopeValue, LeadUrgency } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

const EMPTY_LEAD_WORKBENCH_SUMMARY: LeadWorkbenchSummary = {
    active: 0,
    registered: 0,
    qualified: 0,
    'ready-to-convert': 0,
    'blocked-conversion': 0,
    converted: 0,
    closed: 0,
    all: 0
};

export interface LeadListFilters {
    scope?: LeadWorkbenchScope;
    sourceCode?: string;
    budgetStatus?: LeadBudgetStatus;
    urgency?: LeadUrgency;
    rating?: LeadRating;
    ownerOrgId?: string;
    ownerUserId?: string;
    ownershipScope?: LeadOwnershipScope;
    keyword?: string;
    page?: number;
    pageSize?: number;
}

@Injectable()
export class LeadStore {
    readonly #leadApi = inject(LeadApi);

    readonly #leads = signal<LeadListView[]>([]);
    readonly #leadListResponse = signal<LeadListResponse | null>(null);
    readonly #selectedLead = signal<LeadDetailView | null>(null);
    readonly #loading = signal(false);
    readonly #loadingDetail = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);
    #lastLeadFilters: LeadListFilters = {};

    readonly leads = this.#leads.asReadonly();
    readonly leadListResponse = this.#leadListResponse.asReadonly();
    readonly selectedLead = this.#selectedLead.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingDetail = this.#loadingDetail.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    readonly workbenchSummary = computed<LeadWorkbenchSummary>(() => this.#leadListResponse()?.summary ?? EMPTY_LEAD_WORKBENCH_SUMMARY);
    readonly workbenchFacets = computed<LeadWorkbenchFacet[]>(() => this.#leadListResponse()?.facets ?? []);
    readonly currentScope = computed<LeadWorkbenchScope>(() => this.#leadListResponse()?.scope ?? LeadWorkbenchScopeValue.Active);
    readonly totalLeadItems = computed(() => this.#leadListResponse()?.totalItems ?? this.#leads().length);

    readonly registeredLeadCount = computed(() => this.workbenchSummary().registered);
    readonly qualifiedLeadCount = computed(() => this.workbenchSummary().qualified);
    readonly convertedLeadCount = computed(() => this.workbenchSummary().converted);
    readonly closedLeadCount = computed(() => this.workbenchSummary().closed);

    async loadLeads(filters: LeadListFilters = this.#lastLeadFilters) {
        this.#lastLeadFilters = { ...filters };
        this.#loading.set(true);
        try {
            const leads = await firstValueFrom(
                this.#leadApi.leadControllerList({
                    scope: filters.scope,
                    sourceCode: filters.sourceCode,
                    budgetStatus: filters.budgetStatus,
                    urgency: filters.urgency,
                    rating: filters.rating,
                    ownerOrgId: filters.ownerOrgId,
                    ownerUserId: filters.ownerUserId,
                    ownershipScope: filters.ownershipScope,
                    keyword: filters.keyword,
                    page: filters.page,
                    pageSize: filters.pageSize
                })
            );
            this.#leadListResponse.set(leads ?? null);
            this.#leads.set(leads?.items ?? []);
            this.#loaded.set(true);
            return leads;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadLead(id: string) {
        this.#loadingDetail.set(true);
        try {
            const lead = await firstValueFrom(this.#leadApi.leadControllerGetById({ id }));
            this.#selectedLead.set(lead);
            return lead;
        } finally {
            this.#loadingDetail.set(false);
        }
    }

    async createLead(request: CreateLeadRequest) {
        this.#saving.set(true);
        try {
            const lead = await firstValueFrom(this.#leadApi.leadControllerCreate({ createLeadRequest: request }));
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return lead;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateLead(id: string, request: UpdateLeadRequest) {
        this.#saving.set(true);
        try {
            const lead = await firstValueFrom(this.#leadApi.leadControllerUpdate({ id, updateLeadRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return lead;
        } finally {
            this.#saving.set(false);
        }
    }

    async claimLeadOwner(id: string, request: ClaimLeadOwnerRequest = {}) {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadControllerClaimOwner({ id, claimLeadOwnerRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async assignLeadOwner(id: string, request: AssignLeadOwnerRequest) {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadControllerAssignOwner({ id, assignLeadOwnerRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async qualifyLead(id: string, request: QualifyLeadRequest) {
        this.#saving.set(true);
        try {
            const lead = await firstValueFrom(this.#leadApi.leadControllerQualify({ id, qualifyLeadRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return lead;
        } finally {
            this.#saving.set(false);
        }
    }

    async closeLead(id: string, request: CloseLeadRequest) {
        this.#saving.set(true);
        try {
            const lead = await firstValueFrom(this.#leadApi.leadControllerClose({ id, closeLeadRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return lead;
        } finally {
            this.#saving.set(false);
        }
    }

    async convertLeadToProject(id: string, request: ConvertLeadToProjectRequest) {
        this.#saving.set(true);
        try {
            const project = await firstValueFrom(this.#leadApi.leadControllerConvertToProject({ id, convertLeadToProjectRequest: request }));
            if (this.#selectedLead()?.id === id) {
                await this.loadLead(id);
            }
            if (this.#loaded()) {
                await this.loadLeads();
            }
            return project;
        } finally {
            this.#saving.set(false);
        }
    }

    async loadLeadScoreHistory(id: string): Promise<LeadScoreHistoryView> {
        return firstValueFrom(this.#leadApi.leadControllerGetScoreHistory({ id }));
    }

    async submitLeadScoreOverride(id: string, request: SubmitLeadScoreOverrideRequest): Promise<LeadScoreOverrideSummary> {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadControllerSubmitScoreOverride({ id, submitLeadScoreOverrideRequest: request }));
            await this.refreshLeadAfterScoreAction(id);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async approveLeadScoreOverride(id: string, request: ApproveLeadScoreOverrideRequest): Promise<LeadScoreOverrideSummary> {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadScoreOverrideControllerApprove({ id, approveLeadScoreOverrideRequest: request }));
            await this.refreshLeadAfterScoreAction(result.leadId);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async rejectLeadScoreOverride(id: string, request: RejectLeadScoreOverrideRequest): Promise<LeadScoreOverrideSummary> {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadScoreOverrideControllerReject({ id, rejectLeadScoreOverrideRequest: request }));
            await this.refreshLeadAfterScoreAction(result.leadId);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    async revokeLeadScoreOverride(id: string, request: RevokeLeadScoreOverrideRequest): Promise<LeadScoreOverrideSummary> {
        this.#saving.set(true);
        try {
            const result = await firstValueFrom(this.#leadApi.leadScoreOverrideControllerRevoke({ id, revokeLeadScoreOverrideRequest: request }));
            await this.refreshLeadAfterScoreAction(result.leadId);
            return result;
        } finally {
            this.#saving.set(false);
        }
    }

    clearSelectedLead() {
        this.#selectedLead.set(null);
    }

    private async refreshLeadAfterScoreAction(leadId: string): Promise<void> {
        if (this.#selectedLead()?.id === leadId) {
            await this.loadLead(leadId);
        }
        if (this.#loaded()) {
            await this.loadLeads();
        }
    }
}
