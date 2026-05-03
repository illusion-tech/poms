import { inject, Injectable, signal } from '@angular/core';
import type { BusinessDiscussionCommentSummary, CreateBusinessDiscussionCommentRequest } from '@poms/shared-api-client';
import { BusinessDiscussionApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface BusinessDiscussionListFilters {
    customerId?: string;
    leadId?: string;
    projectId?: string;
}

@Injectable()
export class BusinessDiscussionStore {
    readonly #businessDiscussionApi = inject(BusinessDiscussionApi);

    readonly #comments = signal<BusinessDiscussionCommentSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly comments = this.#comments.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadComments(filters: BusinessDiscussionListFilters) {
        this.#loading.set(true);
        try {
            const comments = await firstValueFrom(
                this.#businessDiscussionApi.businessDiscussionControllerList({
                    customerId: filters.customerId,
                    leadId: filters.leadId,
                    projectId: filters.projectId
                })
            );
            this.#comments.set(comments ?? []);
            this.#loaded.set(true);
            return comments ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async createComment(request: CreateBusinessDiscussionCommentRequest, reloadFilters: BusinessDiscussionListFilters) {
        this.#saving.set(true);
        try {
            const comment = await firstValueFrom(this.#businessDiscussionApi.businessDiscussionControllerCreate({ createBusinessDiscussionCommentRequest: request }));
            await this.loadComments(reloadFilters);
            return comment;
        } finally {
            this.#saving.set(false);
        }
    }

    clearComments() {
        this.#comments.set([]);
        this.#loaded.set(false);
    }
}
