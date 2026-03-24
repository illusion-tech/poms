import { computed, inject, Injectable, signal } from '@angular/core';
import type { ContractSummary, CreateContractRequest, UpdateContractBasicInfoRequest } from '@poms/shared-api-client';
import { ContractApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ContractStore {
    readonly #contractApi = inject(ContractApi);

    readonly #contracts = signal<ContractSummary[]>([]);
    readonly #selectedContract = signal<ContractSummary | null>(null);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly contracts = this.#contracts.asReadonly();
    readonly selectedContract = this.#selectedContract.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly recentContracts = computed(() => this.#contracts().slice(0, 5));

    async loadContracts() {
        this.#loading.set(true);

        try {
            const contracts = await firstValueFrom(this.#contractApi.contractControllerList());
            this.#contracts.set(contracts);
            this.#loaded.set(true);
            return contracts;
        } finally {
            this.#loading.set(false);
        }
    }

    async loadContract(id: string) {
        this.#loading.set(true);

        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerGetById({ id }));
            this.#selectedContract.set(contract);
            this.#upsertContract(contract);
            return contract;
        } finally {
            this.#loading.set(false);
        }
    }

    async createContract(request: CreateContractRequest) {
        this.#saving.set(true);

        try {
            const contract = await firstValueFrom(this.#contractApi.contractControllerCreate({ createContractRequest: request }));
            this.#upsertContract(contract, true);
            return contract;
        } finally {
            this.#saving.set(false);
        }
    }

    async updateContract(id: string, request: UpdateContractBasicInfoRequest) {
        this.#saving.set(true);

        try {
            const contract = await firstValueFrom(
                this.#contractApi.contractControllerUpdateBasicInfo({
                    id,
                    updateContractBasicInfoRequest: request
                })
            );
            this.#selectedContract.set(contract);
            this.#upsertContract(contract);
            return contract;
        } finally {
            this.#saving.set(false);
        }
    }

    clearSelectedContract() {
        this.#selectedContract.set(null);
    }

    #upsertContract(contract: ContractSummary, prepend = false) {
        const contracts = this.#contracts();
        const existingIndex = contracts.findIndex((item) => item.id === contract.id);

        if (existingIndex === -1) {
            this.#contracts.set(prepend ? [contract, ...contracts] : [...contracts, contract]);
            return;
        }

        const nextContracts = [...contracts];
        nextContracts[existingIndex] = contract;
        this.#contracts.set(nextContracts);
    }
}
