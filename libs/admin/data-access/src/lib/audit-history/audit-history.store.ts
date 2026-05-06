import { inject, Injectable, signal } from '@angular/core';
import type { AuditLogSummary, RuntimeAuditControllerListEntityAuditLogsRequestParams } from '@poms/shared-api-client';
import { RuntimeAuditApi } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export type EntityAuditHistoryTargetType = RuntimeAuditControllerListEntityAuditLogsRequestParams['targetType'];
export type EntityAuditHistoryRecord = AuditLogSummary;

export interface EntityAuditHistoryLoadParams {
    targetType: EntityAuditHistoryTargetType;
    targetId: string;
    limit?: number;
}

@Injectable()
export class AuditHistoryStore {
    readonly #runtimeAuditApi = inject(RuntimeAuditApi);

    readonly #records = signal<EntityAuditHistoryRecord[]>([]);
    readonly #loading = signal(false);
    readonly #error = signal<string | null>(null);

    readonly records = this.#records.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly error = this.#error.asReadonly();

    async loadEntityAuditLogs(params: EntityAuditHistoryLoadParams): Promise<EntityAuditHistoryRecord[]> {
        this.#loading.set(true);
        this.#error.set(null);

        try {
            const records = await firstValueFrom(
                this.#runtimeAuditApi.runtimeAuditControllerListEntityAuditLogs({
                    targetType: params.targetType,
                    targetId: params.targetId,
                    limit: params.limit ?? 50
                })
            );
            this.#records.set(records ?? []);
            return records ?? [];
        } catch (error) {
            this.#records.set([]);
            this.#error.set('编辑历史暂时读取失败，请稍后重试。');
            throw error;
        } finally {
            this.#loading.set(false);
        }
    }

    clear(): void {
        this.#records.set([]);
        this.#error.set(null);
        this.#loading.set(false);
    }
}
