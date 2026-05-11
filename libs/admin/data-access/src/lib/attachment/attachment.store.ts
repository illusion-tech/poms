import { HttpBackend, HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
    AttachmentApi,
    AttachmentUploadMode,
    AttachmentUploadSessionApi,
    AttachmentUploadSessionOperationType,
    BASE_PATH,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStatus,
    type AttachmentSummary,
    type AttachmentTargetType,
    type ClearAttachmentFinalRequest,
    type MarkAttachmentFinalRequest,
    type UpdateAttachmentRequest,
    type VoidAttachmentRequest
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface AttachmentTargetRef {
    targetType: AttachmentTargetType;
    targetId: string;
}

export interface AttachmentListFilters extends AttachmentTargetRef {
    category?: string;
    status?: AttachmentStatus;
}

export interface UploadAttachmentInput extends AttachmentTargetRef {
    file: File;
    category: string;
    securityLevel?: AttachmentSecurityLevel;
    relationType?: AttachmentRelationType;
    displayName?: string;
    description?: string | null;
}

export interface AttachmentDownload {
    blob: Blob;
    fileName: string;
}

export interface AttachmentBlobResponse {
    blob: Blob;
    mimeType: string;
    fileName: string;
}

export interface UploadAttachmentVersionInput {
    id: string;
    file: File;
    changeNote: string;
    displayName?: string;
    category?: string;
    securityLevel?: AttachmentSecurityLevel;
    description?: string | null;
}

@Injectable()
export class AttachmentStore {
    readonly #attachmentApi = inject(AttachmentApi);
    readonly #attachmentUploadSessionApi = inject(AttachmentUploadSessionApi);
    readonly #httpClient = inject(HttpClient);
    readonly #directUploadHttpClient = new HttpClient(inject(HttpBackend));
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
            const session = await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerCreate({
                    createAttachmentUploadSessionRequest: {
                        operationType: AttachmentUploadSessionOperationType.CreateAttachment,
                        targetType: input.targetType,
                        targetId: input.targetId,
                        category: input.category,
                        securityLevel: input.securityLevel,
                        relationType: input.relationType,
                        displayName: input.displayName,
                        description: input.description,
                        originalName: input.file.name,
                        mimeType: input.file.type || 'application/octet-stream',
                        sizeBytes: input.file.size
                    }
                })
            );
            await this.uploadObjectForSession(session.id, input.file);
            return await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerComplete({
                    id: session.id,
                    completeAttachmentUploadSessionRequest: {}
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

    async loadAttachmentVersions(id: string): Promise<AttachmentSummary[]> {
        this.#loading.set(true);
        try {
            const versions = await firstValueFrom(this.#attachmentApi.attachmentControllerVersions({ id }));
            return versions ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async uploadAttachmentVersion(input: UploadAttachmentVersionInput) {
        this.#saving.set(true);
        try {
            const session = await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerCreate({
                    createAttachmentUploadSessionRequest: {
                        operationType: AttachmentUploadSessionOperationType.CreateVersion,
                        baseAttachmentId: input.id,
                        changeNote: input.changeNote,
                        displayName: input.displayName,
                        category: input.category,
                        securityLevel: input.securityLevel,
                        description: input.description,
                        originalName: input.file.name,
                        mimeType: input.file.type || 'application/octet-stream',
                        sizeBytes: input.file.size
                    }
                })
            );
            await this.uploadObjectForSession(session.id, input.file);
            return await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerComplete({
                    id: session.id,
                    completeAttachmentUploadSessionRequest: {}
                })
            );
        } finally {
            this.#saving.set(false);
        }
    }

    async markAttachmentFinal(id: string, request: MarkAttachmentFinalRequest = {}) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#attachmentApi.attachmentControllerMarkFinal({ id, markAttachmentFinalRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async clearAttachmentFinal(id: string, request: ClearAttachmentFinalRequest) {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#attachmentApi.attachmentControllerClearFinal({ id, clearAttachmentFinalRequest: request }));
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

    async previewAttachment(id: string): Promise<AttachmentBlobResponse> {
        const response = await firstValueFrom(
            this.#httpClient.get(this.buildApiUrl(`/api/attachments/${id}/preview`), {
                observe: 'response',
                responseType: 'blob'
            })
        );

        return {
            blob: response.body ?? new Blob(),
            mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
            fileName: this.extractFilename(response, 'preview')
        };
    }

    async thumbnailAttachment(id: string): Promise<AttachmentBlobResponse | null> {
        const response = await firstValueFrom(
            this.#httpClient.get(this.buildApiUrl(`/api/attachments/${id}/thumbnail`), {
                observe: 'response',
                responseType: 'blob'
            })
        );

        if (response.status === 204 || !response.body || response.body.size === 0) {
            return null;
        }

        return {
            blob: response.body,
            mimeType: response.headers.get('content-type') ?? 'application/octet-stream',
            fileName: this.extractFilename(response, 'thumbnail')
        };
    }

    clearAttachments() {
        this.#attachments.set([]);
        this.#loaded.set(false);
    }

    private async uploadObjectForSession(sessionId: string, file: File): Promise<void> {
        const target = await firstValueFrom(
            this.#attachmentUploadSessionApi.attachmentUploadSessionControllerCreateUploadTarget({
                id: sessionId,
                createAttachmentUploadTargetRequest: {}
            })
        );

        if (target.uploadMode === AttachmentUploadMode.Proxy) {
            await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerProxyUploadObject({
                    id: sessionId,
                    body: file
                })
            );
            return;
        }

        if (target.uploadMode === AttachmentUploadMode.PresignedPut) {
            await firstValueFrom(
                this.#directUploadHttpClient.put(target.url, file, {
                    headers: new HttpHeaders(target.headers),
                    responseType: 'text'
                })
            );
            return;
        }

        throw new Error(`Unsupported attachment upload mode: ${target.uploadMode}`);
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
