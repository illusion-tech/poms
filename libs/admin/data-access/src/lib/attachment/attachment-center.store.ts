import { computed, inject, Injectable, signal } from '@angular/core';
import { AttachmentApi, AttachmentTargetType, type AttachmentCenterRecord as AttachmentCenterApiRecord, type AttachmentSummary } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

type AttachmentCenterTargetType = AttachmentTargetType.Customer | AttachmentTargetType.Lead | AttachmentTargetType.Project | AttachmentTargetType.Contract;

export interface AttachmentCenterTargetRef {
    targetType: AttachmentCenterTargetType;
    targetId: string;
    targetNo: string;
    targetName: string;
    targetOwnerName: string | null;
    routeCommands: unknown[];
    routeQueryParams?: Record<string, string>;
}

export interface AttachmentCenterRecord extends AttachmentCenterTargetRef {
    id: string;
    attachment: AttachmentSummary;
}

@Injectable()
export class AttachmentCenterStore {
    readonly #attachmentApi = inject(AttachmentApi);

    readonly #records = signal<AttachmentCenterRecord[]>([]);
    readonly #loading = signal(false);
    readonly #loaded = signal(false);
    readonly #errors = signal<string[]>([]);

    readonly records = this.#records.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly errors = this.#errors.asReadonly();
    readonly targetCount = computed(() => new Set(this.#records().map((record) => `${record.targetType}:${record.targetId}`)).size);

    async loadRecords(): Promise<AttachmentCenterRecord[]> {
        this.#loading.set(true);

        try {
            const records = (await firstValueFrom(this.#attachmentApi.attachmentCenterRecordControllerList())).map((record) => this.toCenterRecord(record));
            this.#records.set(records);
            this.#errors.set([]);
            this.#loaded.set(true);
            return records;
        } finally {
            this.#loading.set(false);
        }
    }

    clearRecords(): void {
        this.#records.set([]);
        this.#errors.set([]);
        this.#loaded.set(false);
    }

    private toCenterRecord(record: AttachmentCenterApiRecord): AttachmentCenterRecord {
        const targetType = this.toCenterTargetType(record.targetType);

        return {
            ...record,
            targetType,
            id: `${targetType}:${record.targetId}:${record.attachment.id}`,
            ...this.routeForTarget(targetType, record.targetId)
        };
    }

    private toCenterTargetType(targetType: AttachmentCenterApiRecord['targetType']): AttachmentCenterTargetType {
        switch (targetType) {
            case AttachmentTargetType.Customer:
            case AttachmentTargetType.Lead:
            case AttachmentTargetType.Project:
            case AttachmentTargetType.Contract:
                return targetType;
            default:
                throw new Error(`Unsupported attachment center target type: ${targetType}`);
        }
    }

    private routeForTarget(targetType: AttachmentCenterTargetType, targetId: string): Pick<AttachmentCenterTargetRef, 'routeCommands' | 'routeQueryParams'> {
        switch (targetType) {
            case AttachmentTargetType.Customer:
                return {
                    routeCommands: ['/customers'],
                    routeQueryParams: { customerId: targetId }
                };
            case AttachmentTargetType.Lead:
                return {
                    routeCommands: ['/leads'],
                    routeQueryParams: { leadId: targetId }
                };
            case AttachmentTargetType.Project:
                return {
                    routeCommands: ['/projects', targetId]
                };
            case AttachmentTargetType.Contract:
                return {
                    routeCommands: ['/contracts', targetId]
                };
        }
    }
}
