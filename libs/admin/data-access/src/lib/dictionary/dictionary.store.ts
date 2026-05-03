import { computed, inject, Injectable, signal } from '@angular/core';
import { ActiveInactiveStatus, DictionaryApi, type CreateDictionaryItemRequest, type DictionaryDomain, type DictionaryItemSummary, type UpdateDictionaryItemRequest } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface DictionaryListFilters {
    domain?: DictionaryDomain;
    status?: ActiveInactiveStatus;
    keyword?: string;
}

@Injectable()
export class DictionaryStore {
    readonly #dictionaryApi = inject(DictionaryApi);

    readonly #items = signal<DictionaryItemSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly items = this.#items.asReadonly();
    readonly activeItems = computed(() => this.#items().filter((item) => item.status === ActiveInactiveStatus.Active));
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadItems(filters: DictionaryListFilters = {}) {
        this.#loading.set(true);
        try {
            const items = await firstValueFrom(
                this.#dictionaryApi.dictionaryControllerList({
                    domain: filters.domain,
                    status: filters.status,
                    keyword: filters.keyword
                })
            );
            this.#items.set(items ?? []);
            this.#loaded.set(true);
            return items ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async createItem(request: CreateDictionaryItemRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#dictionaryApi.dictionaryControllerCreate({ createDictionaryItemRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async updateItem(id: string, request: UpdateDictionaryItemRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#dictionaryApi.dictionaryControllerUpdate({ id, updateDictionaryItemRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    clearItems() {
        this.#items.set([]);
        this.#loaded.set(false);
    }
}
