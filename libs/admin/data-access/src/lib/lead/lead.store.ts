import { computed, inject, Injectable, signal } from '@angular/core';
import type { CloseLeadRequest, ConvertLeadToProjectRequest, CreateLeadRequest, CreateLeadSourceRequest, LeadBudgetStatus, LeadDetailView, LeadListView, LeadSourceStatus, LeadSourceSummary, LeadStatus, LeadUrgency, QualifyLeadRequest, UpdateLeadRequest, UpdateLeadSourceRequest } from '@poms/shared-api-client';
import { LeadApi, LeadSourceApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface LeadListFilters {
    status?: LeadStatus;
    sourceId?: string;
    budgetStatus?: LeadBudgetStatus;
    urgency?: LeadUrgency;
    ownerOrgId?: string;
    keyword?: string;
}

export interface LeadSourceListFilters {
    status?: LeadSourceStatus;
    keyword?: string;
}

const LEAD_STATUS = {
    registered: 'registered' as LeadStatus,
    qualified: 'qualified' as LeadStatus,
    converted: 'converted' as LeadStatus,
    closed: 'closed' as LeadStatus
};

@Injectable()
export class LeadStore {
    readonly #leadApi = inject(LeadApi);
    readonly #leadSourceApi = inject(LeadSourceApi);

    readonly #leads = signal<LeadListView[]>([]);
    readonly #leadSources = signal<LeadSourceSummary[]>([]);
    readonly #selectedLead = signal<LeadDetailView | null>(null);
    readonly #loading = signal(false);
    readonly #loadingSources = signal(false);
    readonly #loadingDetail = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);
    readonly #loadedSources = signal(false);

    readonly leads = this.#leads.asReadonly();
    readonly leadSources = this.#leadSources.asReadonly();
    readonly selectedLead = this.#selectedLead.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingSources = this.#loadingSources.asReadonly();
    readonly loadingDetail = this.#loadingDetail.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly loadedSources = this.#loadedSources.asReadonly();

    readonly registeredLeadCount = computed(() => this.#leads().filter((lead) => lead.status === LEAD_STATUS.registered).length);
    readonly qualifiedLeadCount = computed(() => this.#leads().filter((lead) => lead.status === LEAD_STATUS.qualified).length);
    readonly convertedLeadCount = computed(() => this.#leads().filter((lead) => lead.status === LEAD_STATUS.converted).length);
    readonly closedLeadCount = computed(() => this.#leads().filter((lead) => lead.status === LEAD_STATUS.closed).length);

    async loadLeads(filters: LeadListFilters = {}) {
        this.#loading.set(true);
        try {
            const leads = await firstValueFrom(
                this.#leadApi.leadControllerList({
                    status: filters.status,
                    sourceId: filters.sourceId,
                    budgetStatus: filters.budgetStatus,
                    urgency: filters.urgency,
                    ownerOrgId: filters.ownerOrgId,
                    keyword: filters.keyword
                })
            );
            this.#leads.set(leads ?? []);
            this.#loaded.set(true);
            return leads ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async loadLeadSources(filters: LeadSourceListFilters = {}) {
        this.#loadingSources.set(true);
        try {
            const sources = await firstValueFrom(
                this.#leadSourceApi.leadSourceControllerList({
                    status: filters.status,
                    keyword: filters.keyword
                })
            );
            this.#leadSources.set(sources ?? []);
            this.#loadedSources.set(true);
            return sources ?? [];
        } finally {
            this.#loadingSources.set(false);
        }
    }

    async createLeadSource(request: CreateLeadSourceRequest) {
        this.#saving.set(true);
        try {
            const source = await firstValueFrom(this.#leadSourceApi.leadSourceControllerCreate({ createLeadSourceRequest: request }));
            if (this.#loadedSources()) {
                await this.loadLeadSources();
            }
            return source;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateLeadSource(id: string, request: UpdateLeadSourceRequest) {
        this.#saving.set(true);
        try {
            const source = await firstValueFrom(this.#leadSourceApi.leadSourceControllerUpdate({ id, updateLeadSourceRequest: request }));
            if (this.#loadedSources()) {
                await this.loadLeadSources();
            }
            return source;
        } finally {
            this.#saving.set(false);
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

    clearSelectedLead() {
        this.#selectedLead.set(null);
    }
}
