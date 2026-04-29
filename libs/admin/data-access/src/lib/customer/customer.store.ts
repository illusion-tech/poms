import { computed, inject, Injectable, signal } from '@angular/core';
import type { CreateCustomerAliasRequest, CreateCustomerRequest, CustomerAliasSummary, CustomerDetailView, CustomerListView, CustomerStatus, UpdateCustomerRequest } from '@poms/shared-api-client';
import { CustomerApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface CustomerListFilters {
    status?: CustomerStatus;
    ownerOrgId?: string;
    keyword?: string;
}

@Injectable()
export class CustomerStore {
    readonly #customerApi = inject(CustomerApi);

    readonly #customers = signal<CustomerListView[]>([]);
    readonly #selectedCustomer = signal<CustomerDetailView | null>(null);
    readonly #aliases = signal<CustomerAliasSummary[]>([]);
    readonly #loading = signal(false);
    readonly #loadingDetail = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly customers = this.#customers.asReadonly();
    readonly selectedCustomer = this.#selectedCustomer.asReadonly();
    readonly aliases = this.#aliases.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loadingDetail = this.#loadingDetail.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    readonly activeCustomers = computed(() => this.#customers().filter((customer) => customer.status === 'active'));
    readonly activeCustomerCount = computed(() => this.activeCustomers().length);
    readonly inactiveCustomerCount = computed(() => this.#customers().filter((customer) => customer.status === 'inactive').length);

    async loadCustomers(filters: CustomerListFilters = {}) {
        this.#loading.set(true);
        try {
            const customers = await firstValueFrom(
                this.#customerApi.customerControllerList({
                    status: filters.status,
                    ownerOrgId: filters.ownerOrgId,
                    keyword: filters.keyword
                })
            );
            this.#customers.set(customers ?? []);
            this.#loaded.set(true);
            return customers ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async loadCustomer(id: string) {
        this.#loadingDetail.set(true);
        try {
            const customer = await firstValueFrom(this.#customerApi.customerControllerGetById({ id }));
            this.#selectedCustomer.set(customer);
            this.#aliases.set(customer.aliases ?? []);
            return customer;
        } finally {
            this.#loadingDetail.set(false);
        }
    }

    async createCustomer(request: CreateCustomerRequest) {
        this.#saving.set(true);
        try {
            const customer = await firstValueFrom(this.#customerApi.customerControllerCreate({ createCustomerRequest: request }));
            if (this.#loaded()) {
                await this.loadCustomers();
            }
            return customer;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateCustomer(id: string, request: UpdateCustomerRequest) {
        this.#saving.set(true);
        try {
            const customer = await firstValueFrom(this.#customerApi.customerControllerUpdate({ id, updateCustomerRequest: request }));
            this.#selectedCustomer.set(customer);
            this.#aliases.set(customer.aliases ?? []);
            if (this.#loaded()) {
                await this.loadCustomers();
            }
            return customer;
        } finally {
            this.#saving.set(false);
        }
    }

    async createAlias(customerId: string, request: CreateCustomerAliasRequest) {
        this.#saving.set(true);
        try {
            const alias = await firstValueFrom(this.#customerApi.customerControllerCreateAlias({ id: customerId, createCustomerAliasRequest: request }));
            if (this.#selectedCustomer()?.id === customerId) {
                await this.loadCustomer(customerId);
            }
            return alias;
        } finally {
            this.#saving.set(false);
        }
    }

    clearSelectedCustomer() {
        this.#selectedCustomer.set(null);
        this.#aliases.set([]);
    }
}
