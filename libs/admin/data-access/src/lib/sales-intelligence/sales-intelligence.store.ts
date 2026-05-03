import { inject, Injectable, signal } from '@angular/core';
import type {
    CompetitorIntelligenceRecordSummary,
    CreateCompetitorIntelligenceRecordRequest,
    CreateCustomerContactRequest,
    CreateOpportunityStakeholderRequest,
    CreateSalesDiscoveryRecordRequest,
    CustomerContactSummary,
    OpportunityStakeholderSummary,
    SalesDiscoveryRecordSummary,
    SalesIntelligenceGapSummary,
    UpdateCompetitorIntelligenceRecordRequest,
    UpdateCustomerContactRequest,
    UpdateOpportunityStakeholderRequest,
    UpdateSalesDiscoveryRecordRequest
} from '@poms/shared-api-client';
import { SalesIntelligenceApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface OpportunityContextFilters {
    leadId?: string;
    projectId?: string;
}

@Injectable()
export class SalesIntelligenceStore {
    readonly #salesIntelligenceApi = inject(SalesIntelligenceApi);

    readonly #contacts = signal<CustomerContactSummary[]>([]);
    readonly #stakeholders = signal<OpportunityStakeholderSummary[]>([]);
    readonly #competitors = signal<CompetitorIntelligenceRecordSummary[]>([]);
    readonly #discoveryRecords = signal<SalesDiscoveryRecordSummary[]>([]);
    readonly #gaps = signal<SalesIntelligenceGapSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly contacts = this.#contacts.asReadonly();
    readonly stakeholders = this.#stakeholders.asReadonly();
    readonly competitors = this.#competitors.asReadonly();
    readonly discoveryRecords = this.#discoveryRecords.asReadonly();
    readonly gaps = this.#gaps.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadCustomerContacts(customerId: string) {
        const contacts = await firstValueFrom(
            this.#salesIntelligenceApi.customerContactControllerList({
                customerId
            })
        );
        this.#contacts.set(contacts ?? []);
        return contacts ?? [];
    }

    async loadOpportunityContext(filters: OpportunityContextFilters) {
        const request = {
            leadId: filters.leadId,
            projectId: filters.projectId
        };
        const [stakeholders, competitors, discoveryRecords, gaps] = await Promise.all([
            firstValueFrom(this.#salesIntelligenceApi.opportunityStakeholderControllerList(request)),
            firstValueFrom(this.#salesIntelligenceApi.competitorIntelligenceRecordControllerList(request)),
            firstValueFrom(this.#salesIntelligenceApi.salesDiscoveryRecordControllerList(request)),
            firstValueFrom(this.#salesIntelligenceApi.salesIntelligenceGapControllerList(request))
        ]);

        this.#stakeholders.set(stakeholders ?? []);
        this.#competitors.set(competitors ?? []);
        this.#discoveryRecords.set(discoveryRecords ?? []);
        this.#gaps.set(gaps ?? []);

        return {
            stakeholders: stakeholders ?? [],
            competitors: competitors ?? [],
            discoveryRecords: discoveryRecords ?? [],
            gaps: gaps ?? []
        };
    }

    async loadContext(customerId: string | null | undefined, filters: OpportunityContextFilters = {}) {
        this.#loading.set(true);
        try {
            const tasks: Array<Promise<unknown>> = [];

            if (customerId) {
                tasks.push(this.loadCustomerContacts(customerId));
            } else {
                this.#contacts.set([]);
            }

            if (filters.leadId || filters.projectId) {
                tasks.push(this.loadOpportunityContext(filters));
            } else {
                this.clearOpportunityContext();
            }

            await Promise.all(tasks);
            this.#loaded.set(true);
        } finally {
            this.#loading.set(false);
        }
    }

    async createCustomerContact(request: CreateCustomerContactRequest) {
        this.#saving.set(true);
        try {
            const contact = await firstValueFrom(this.#salesIntelligenceApi.customerContactControllerCreate({ createCustomerContactRequest: request }));
            await this.loadCustomerContacts(request.customerId);
            return contact;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateCustomerContact(id: string, customerId: string, request: UpdateCustomerContactRequest) {
        this.#saving.set(true);
        try {
            const contact = await firstValueFrom(
                this.#salesIntelligenceApi.customerContactControllerUpdate({
                    id,
                    updateCustomerContactRequest: request
                })
            );
            await this.loadCustomerContacts(customerId);
            return contact;
        } finally {
            this.#saving.set(false);
        }
    }

    async createOpportunityStakeholder(request: CreateOpportunityStakeholderRequest) {
        this.#saving.set(true);
        try {
            const stakeholder = await firstValueFrom(this.#salesIntelligenceApi.opportunityStakeholderControllerCreate({ createOpportunityStakeholderRequest: request }));
            await this.reloadOpportunityAfterWrite(request.leadId, request.projectId);
            return stakeholder;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateOpportunityStakeholder(id: string, filters: OpportunityContextFilters, request: UpdateOpportunityStakeholderRequest) {
        this.#saving.set(true);
        try {
            const stakeholder = await firstValueFrom(
                this.#salesIntelligenceApi.opportunityStakeholderControllerUpdate({
                    id,
                    updateOpportunityStakeholderRequest: request
                })
            );
            await this.reloadOpportunityAfterWrite(filters.leadId, filters.projectId);
            return stakeholder;
        } finally {
            this.#saving.set(false);
        }
    }

    async createCompetitorIntelligenceRecord(request: CreateCompetitorIntelligenceRecordRequest) {
        this.#saving.set(true);
        try {
            const record = await firstValueFrom(this.#salesIntelligenceApi.competitorIntelligenceRecordControllerCreate({ createCompetitorIntelligenceRecordRequest: request }));
            await this.reloadOpportunityAfterWrite(request.leadId, request.projectId);
            return record;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateCompetitorIntelligenceRecord(id: string, filters: OpportunityContextFilters, request: UpdateCompetitorIntelligenceRecordRequest) {
        this.#saving.set(true);
        try {
            const record = await firstValueFrom(
                this.#salesIntelligenceApi.competitorIntelligenceRecordControllerUpdate({
                    id,
                    updateCompetitorIntelligenceRecordRequest: request
                })
            );
            await this.reloadOpportunityAfterWrite(filters.leadId, filters.projectId);
            return record;
        } finally {
            this.#saving.set(false);
        }
    }

    async createSalesDiscoveryRecord(request: CreateSalesDiscoveryRecordRequest) {
        this.#saving.set(true);
        try {
            const record = await firstValueFrom(this.#salesIntelligenceApi.salesDiscoveryRecordControllerCreate({ createSalesDiscoveryRecordRequest: request }));
            await this.reloadOpportunityAfterWrite(request.leadId, request.projectId);
            return record;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateSalesDiscoveryRecord(id: string, filters: OpportunityContextFilters, request: UpdateSalesDiscoveryRecordRequest) {
        this.#saving.set(true);
        try {
            const record = await firstValueFrom(
                this.#salesIntelligenceApi.salesDiscoveryRecordControllerUpdate({
                    id,
                    updateSalesDiscoveryRecordRequest: request
                })
            );
            await this.reloadOpportunityAfterWrite(filters.leadId, filters.projectId);
            return record;
        } finally {
            this.#saving.set(false);
        }
    }

    clearContext() {
        this.#contacts.set([]);
        this.clearOpportunityContext();
        this.#loaded.set(false);
    }

    clearOpportunityContext() {
        this.#stakeholders.set([]);
        this.#competitors.set([]);
        this.#discoveryRecords.set([]);
        this.#gaps.set([]);
    }

    private async reloadOpportunityAfterWrite(leadId: string | undefined, projectId: string | undefined) {
        if (!leadId && !projectId) {
            this.clearOpportunityContext();
            return;
        }

        await this.loadOpportunityContext({ leadId, projectId });
    }
}
