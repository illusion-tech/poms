import { HttpClient, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
    AttachmentApi,
    BASE_PATH,
    type AttachmentCategory,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStatus,
    type AttachmentSummary,
    type AttachmentTargetType,
    type UpdateAttachmentRequest,
    type VoidAttachmentRequest
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface AttachmentTargetRef {
    targetType: AttachmentTargetType;
    targetId: string;
}

export interface AttachmentListFilters extends AttachmentTargetRef {
    category?: AttachmentCategory;
    status?: AttachmentStatus;
}

export interface UploadAttachmentInput extends AttachmentTargetRef {
    file: File;
    category: AttachmentCategory;
    securityLevel?: AttachmentSecurityLevel;
    relationType?: AttachmentRelationType;
    displayName?: string;
    description?: string | null;
}

export interface AttachmentDownload {
    blob: Blob;
    fileName: string;
}

@Injectable()
export class AttachmentStore {
    readonly #attachmentApi = inject(AttachmentApi);
    readonly #httpClient = inject(HttpClient);
    readonly #basePath = inject(BASE_PATH, { optional: true }) ?? '';

    readonly #attachments = signal<AttachmentSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #loaded = signal(false);

    readonly attachments = this.#attachments.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadAttachments(filters: AttachmentListFilters) {
        this.#loading.set(true);
        try {
            const attachments = await firstValueFrom(
                this.#attachmentApi.attachmentControllerList({
                    targetType: filters.targetType,
                    targetId: filters.targetId,
                    category: filters.category,
                    status: filters.status
                })
            );
            this.#attachments.set(attachments ?? []);
            this.#loaded.set(true);
            return attachments ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async uploadAttachment(input: UploadAttachmentInput) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(
                this.#attachmentApi.attachmentControllerUpload({
                    file: input.file,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    category: input.category,
                    securityLevel: input.securityLevel,
                    relationType: input.relationType,
                    displayName: input.displayName,
                    description: input.description
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    async updateAttachment(id: string, request: UpdateAttachmentRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#attachmentApi.attachmentControllerUpdate({ id, updateAttachmentRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async voidAttachment(id: string, request: VoidAttachmentRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#attachmentApi.attachmentControllerVoid({ id, voidAttachmentRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async unlinkAttachment(id: string, linkId: string) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#attachmentApi.attachmentControllerUnlink({ id, linkId }));
        } finally {
            this.#saving.set(false);
        }
    }

    async downloadAttachment(id: string): Promise<AttachmentDownload> {
        const response = await firstValueFrom(
            this.#httpClient.get(this.buildApiUrl(`/api/attachments/${id}/download`), {
                observe: 'response',
                responseType: 'blob'
            })
        );

        return {
            blob: response.body ?? new Blob(),
            fileName: this.extractFilename(response, 'attachment')
        };
    }

    clearAttachments() {
        this.#attachments.set([]);
        this.#loaded.set(false);
    }

    private buildApiUrl(path: string): string {
        const basePath = Array.isArray(this.#basePath) ? this.#basePath[0] ?? '' : this.#basePath;
        return `${basePath}${path}`;
    }

    private extractFilename(response: HttpResponse<Blob>, fallback: string): string {
        const disposition = response.headers.get('content-disposition') ?? '';
        const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
        if (encodedMatch?.[1]) {
            return decodeURIComponent(encodedMatch[1]);
        }

        const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
        return plainMatch?.[1] ?? fallback;
    }
}
