import { inject, Injectable, signal } from '@angular/core';
import { SystemSettingApi, type SystemSettingSummary, type UpdateSystemSettingRequest } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SystemSettingStore {
    readonly #systemSettingApi = inject(SystemSettingApi);

    readonly #settings = signal<SystemSettingSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #updatingKey = signal<string | null>(null);
    readonly #loaded = signal(false);

    readonly settings = this.#settings.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly updatingKey = this.#updatingKey.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadSettings(): Promise<SystemSettingSummary[]> {
        this.#loading.set(true);
        try {
            const settings = await firstValueFrom(this.#systemSettingApi.systemSettingControllerListSystemSettings());
            this.#settings.set(settings ?? []);
            this.#loaded.set(true);
            return settings ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async updateSetting(key: SystemSettingSummary['key'], request: UpdateSystemSettingRequest): Promise<SystemSettingSummary> {
        this.#saving.set(true);
        this.#updatingKey.set(key);
        try {
            const setting = await firstValueFrom(
                this.#systemSettingApi.systemSettingControllerUpdateSystemSetting({
                    key,
                    updateSystemSettingRequest: request
                })
            );
            this.#settings.update((settings) => settings.map((item) => (item.key === key ? setting : item)));
            return setting;
        } finally {
            this.#updatingKey.set(null);
            this.#saving.set(false);
        }
    }

    clearSettings(): void {
        this.#settings.set([]);
        this.#loaded.set(false);
    }
}
