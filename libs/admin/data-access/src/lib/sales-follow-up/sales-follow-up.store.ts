import { inject, Injectable, signal } from '@angular/core';
import type { CreateSalesFollowUpRecordRequest, ReplaceSalesFollowUpRecordRequest, SalesFollowUpRecordLifecycleScope, SalesFollowUpRecordSummary, VoidSalesFollowUpRecordRequest } from '@poms/shared-api-client';
import { SalesFollowUpApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface SalesFollowUpRecordListFilters {
    customerId?: string;
    leadId?: string;
    projectId?: string;
    lifecycleScope?: SalesFollowUpRecordLifecycleScope;
}

@Injectable()
export class SalesFollowUpStore {
    readonly #salesFollowUpApi = inject(SalesFollowUpApi);

    readonly #followUps = signal<SalesFollowUpRecordSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly followUps = this.#followUps.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadFollowUps(filters: SalesFollowUpRecordListFilters) {
        this.#loading.set(true);
        try {
            const followUps = await firstValueFrom(
                this.#salesFollowUpApi.salesFollowUpControllerList({
                    customerId: filters.customerId,
                    leadId: filters.leadId,
                    projectId: filters.projectId,
                    lifecycleScope: filters.lifecycleScope
                })
            );
            this.#followUps.set(followUps ?? []);
            this.#loaded.set(true);
            return followUps ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async createFollowUp(request: CreateSalesFollowUpRecordRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#salesFollowUpApi.salesFollowUpControllerCreate({ createSalesFollowUpRecordRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async replaceFollowUp(id: string, request: ReplaceSalesFollowUpRecordRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(
                this.#salesFollowUpApi.salesFollowUpControllerReplace({
                    id,
                    replaceSalesFollowUpRecordRequest: request
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    async voidFollowUp(id: string, request: VoidSalesFollowUpRecordRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(
                this.#salesFollowUpApi.salesFollowUpControllerVoid({
                    id,
                    voidSalesFollowUpRecordRequest: request
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    clearFollowUps() {
        this.#followUps.set([]);
        this.#loaded.set(false);
    }
}
