import { inject, Injectable, signal } from '@angular/core';
import {
    AttachmentStorageProviderApi,
    type AttachmentStorageProviderConfigStatus,
    type AttachmentStorageProviderConfigSummary,
    type AttachmentStorageProviderConnectionTestResult,
    type AttachmentStorageProviderType,
    type CreateAttachmentStorageProviderConfigRequest,
    type SetDefaultAttachmentStorageProviderRequest,
    type TestAttachmentStorageProviderConnectionRequest,
    type UpdateAttachmentStorageProviderConfigRequest
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface AttachmentStorageProviderConfigFilters {
    providerType?: AttachmentStorageProviderType;
    status?: AttachmentStorageProviderConfigStatus;
    enabled?: boolean;
}

@Injectable()
export class AttachmentStorageProviderStore {
    readonly #attachmentStorageProviderApi = inject(AttachmentStorageProviderApi);

    readonly #configs = signal<AttachmentStorageProviderConfigSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #testingConfigId = signal<string | null>(null);
    readonly #settingDefaultConfigId = signal<string | null>(null);
    readonly #loaded = signal(false);

    readonly configs = this.#configs.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly testingConfigId = this.#testingConfigId.asReadonly();
    readonly settingDefaultConfigId = this.#settingDefaultConfigId.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadConfigs(filters: AttachmentStorageProviderConfigFilters = {}): Promise<AttachmentStorageProviderConfigSummary[]> {
        this.#loading.set(true);
        try {
            const configs = await firstValueFrom(
                this.#attachmentStorageProviderApi.attachmentStorageProviderControllerListAttachmentStorageProviderConfigs({
                    providerType: filters.providerType,
                    status: filters.status,
                    enabled: filters.enabled
                })
            );
            this.#configs.set(configs ?? []);
            this.#loaded.set(true);
            return configs ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async createConfig(request: CreateAttachmentStorageProviderConfigRequest): Promise<AttachmentStorageProviderConfigSummary> {
        this.#saving.set(true);
        try {
            return await firstValueFrom(
                this.#attachmentStorageProviderApi.attachmentStorageProviderControllerCreateAttachmentStorageProviderConfig({
                    createAttachmentStorageProviderConfigRequest: request
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    async updateConfig(id: string, request: UpdateAttachmentStorageProviderConfigRequest): Promise<AttachmentStorageProviderConfigSummary> {
        this.#saving.set(true);
        try {
            return await firstValueFrom(
                this.#attachmentStorageProviderApi.attachmentStorageProviderControllerUpdateAttachmentStorageProviderConfig({
                    id,
                    updateAttachmentStorageProviderConfigRequest: request
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    async testConnection(id: string, request: TestAttachmentStorageProviderConnectionRequest = {}): Promise<AttachmentStorageProviderConnectionTestResult> {
        this.#testingConfigId.set(id);
        try {
            return await firstValueFrom(
                this.#attachmentStorageProviderApi.attachmentStorageProviderControllerTestAttachmentStorageProviderConnection({
                    id,
                    testAttachmentStorageProviderConnectionRequest: request
                })
            );
        } finally {
            this.#testingConfigId.set(null);
        }
    }

    async setDefaultConfig(id: string, request: SetDefaultAttachmentStorageProviderRequest = {}): Promise<AttachmentStorageProviderConfigSummary> {
        this.#settingDefaultConfigId.set(id);
        try {
            return await firstValueFrom(
                this.#attachmentStorageProviderApi.attachmentStorageProviderControllerSetDefaultAttachmentStorageProvider({
                    id,
                    setDefaultAttachmentStorageProviderRequest: request
                })
            );
        } finally {
            this.#settingDefaultConfigId.set(null);
        }
    }

    clearConfigs(): void {
        this.#configs.set([]);
        this.#loaded.set(false);
    }
}
