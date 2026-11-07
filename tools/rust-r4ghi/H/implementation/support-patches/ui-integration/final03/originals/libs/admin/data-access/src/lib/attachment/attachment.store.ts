import { HttpBackend, HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
    AttachmentApi,
    AttachmentUploadMode,
    AttachmentUploadSessionApi,
    AttachmentUploadSessionOperationType,
    BASE_PATH,
    type AttachmentStorageProviderType,
    type AttachmentRelationType,
    type AttachmentSecurityLevel,
    type AttachmentStatus,
    type AttachmentSummary,
    type AttachmentTargetType,
    type AttachmentUploadSessionSummary,
    type AttachmentUploadTarget,
    type AttachmentUploadTargetResult,
    type ClearAttachmentFinalRequest,
    type CreateAttachmentUploadSessionRequest,
    type MarkAttachmentFinalRequest,
    type UpdateAttachmentRequest,
    type VoidAttachmentRequest
} from '@poms/shared-api-client';
import { firstValueFrom, Observable, Subscription } from 'rxjs';

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

export type AttachmentUploadPhase = 'idle' | 'creating-session' | 'creating-target' | 'uploading' | 'completing' | 'completed' | 'aborting' | 'aborted' | 'failed';

export interface AttachmentUploadProgressState {
    phase: AttachmentUploadPhase;
    operationType: AttachmentUploadSessionOperationType | null;
    sessionId: string | null;
    uploadMode: AttachmentUploadMode | null;
    providerType: AttachmentStorageProviderType | null;
    fileName: string | null;
    progressPercent: number;
    loadedBytes: number;
    totalBytes: number;
    message: string;
    canAbort: boolean;
    error: string | null;
}

const IDLE_UPLOAD_PROGRESS: AttachmentUploadProgressState = {
    phase: 'idle',
    operationType: null,
    sessionId: null,
    uploadMode: null,
    providerType: null,
    fileName: null,
    progressPercent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    message: '',
    canAbort: false,
    error: null
};

class AttachmentUploadAbortedError extends Error {
    constructor() {
        super('Attachment upload was aborted.');
    }
}

function describeAttachmentUploadError(error: unknown): string {
    if (error instanceof AttachmentUploadAbortedError) {
        return error.message;
    }

    if (error instanceof HttpErrorResponse) {
        const responseMessage = extractHttpErrorMessage(error.error);
        if (responseMessage) {
            return responseMessage;
        }
        if (error.status === 0) {
            return '无法连接到上传目标，请检查对象存储 CORS、网络或证书配置。';
        }
        if (error.status) {
            return `上传请求失败（HTTP ${error.status}）：${error.statusText || error.message}`;
        }
        return error.message || 'Attachment upload failed.';
    }

    return error instanceof Error ? error.message : 'Attachment upload failed.';
}

function extractHttpErrorMessage(errorBody: unknown): string | null {
    if (!errorBody) return null;
    if (typeof errorBody === 'string') return normalizeErrorMessage(errorBody);
    if (typeof errorBody !== 'object') return null;

    const body = errorBody as Record<string, unknown>;
    const message = body['message'];
    if (Array.isArray(message)) {
        return normalizeErrorMessage(message.filter((item): item is string => typeof item === 'string').join('；'));
    }
    if (typeof message === 'string') {
        return normalizeErrorMessage(message);
    }
    if (typeof body['error'] === 'string') {
        return normalizeErrorMessage(body['error']);
    }
    return null;
}

function normalizeErrorMessage(message: string): string | null {
    const normalized = message.replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 300) : null;
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
    readonly #uploadProgress = signal<AttachmentUploadProgressState>(IDLE_UPLOAD_PROGRESS);

    #activeUploadSession: AttachmentUploadSessionSummary | null = null;
    #activeUploadSubscription: Subscription | null = null;
    #activeUploadReject: ((error: unknown) => void) | null = null;
    #abortRequested = false;
    #abortReason = '用户中止附件上传。';

    readonly attachments = this.#attachments.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly uploadProgress = this.#uploadProgress.asReadonly();

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
            return await this.runUploadSession(
                {
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
                },
                input.file
            );
        } finally {
            this.clearActiveUploadHandles();
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
            return await this.runUploadSession(
                {
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
                },
                input.file
            );
        } finally {
            this.clearActiveUploadHandles();
            this.#saving.set(false);
        }
    }

    async abortCurrentUpload(reason = '用户中止附件上传。'): Promise<void> {
        const session = this.#activeUploadSession;
        if (!session && !this.#saving()) {
            return;
        }

        this.#abortRequested = true;
        this.#abortReason = reason;
        this.#uploadProgress.update((current) => ({
            ...current,
            phase: 'aborting',
            message: '正在中止上传会话',
            canAbort: false
        }));
        this.#activeUploadSubscription?.unsubscribe();
        this.#activeUploadReject?.(new AttachmentUploadAbortedError());

        try {
            if (session) {
                await this.abortUploadSession(session, reason);
            }
        } finally {
            this.#uploadProgress.update((current) => ({
                ...current,
                phase: 'aborted',
                progressPercent: 0,
                message: '上传已中止',
                canAbort: false
            }));
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

    clearUploadProgress(): void {
        if (!this.#saving()) {
            this.#uploadProgress.set(IDLE_UPLOAD_PROGRESS);
        }
    }

    private async runUploadSession(request: CreateAttachmentUploadSessionRequest, file: File): Promise<AttachmentSummary> {
        this.#abortRequested = false;
        this.#uploadProgress.set({
            ...IDLE_UPLOAD_PROGRESS,
            phase: 'creating-session',
            operationType: request.operationType,
            fileName: file.name,
            totalBytes: file.size,
            message: '正在计算文件校验和',
            canAbort: true
        });

        let session: AttachmentUploadSessionSummary | null = null;
        try {
            const checksumSha256 = await this.calculateSha256(file);
            const uploadRequest: CreateAttachmentUploadSessionRequest = {
                ...request,
                ...(checksumSha256 ? { checksumSha256 } : {})
            };

            this.#uploadProgress.update((current) => ({
                ...current,
                message: '正在创建上传会话'
            }));

            session = await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerCreate({
                    createAttachmentUploadSessionRequest: uploadRequest
                })
            );
            this.#activeUploadSession = session;
            this.assertNotAborted();

            this.#uploadProgress.update((current) => ({
                ...current,
                phase: 'creating-target',
                sessionId: session?.id ?? null,
                uploadMode: session?.uploadMode ?? null,
                providerType: session?.providerType ?? null,
                message: '正在获取上传目标',
                canAbort: true
            }));

            const target = await this.createUploadTarget(session.id);
            this.assertNotAborted();
            await this.uploadObjectToTarget(target, file);
            this.assertNotAborted();

            this.#uploadProgress.update((current) => ({
                ...current,
                phase: 'completing',
                progressPercent: 100,
                loadedBytes: file.size,
                totalBytes: file.size,
                message: '正在完成上传会话',
                canAbort: false
            }));

            const attachment = await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerComplete({
                    id: session.id,
                    completeAttachmentUploadSessionRequest: checksumSha256 ? { checksumSha256 } : {}
                })
            );

            this.#uploadProgress.update((current) => ({
                ...current,
                phase: 'completed',
                progressPercent: 100,
                loadedBytes: file.size,
                totalBytes: file.size,
                message: '上传已完成',
                canAbort: false
            }));
            return attachment;
        } catch (error) {
            if (error instanceof AttachmentUploadAbortedError) {
                if (session) {
                    await this.abortUploadSession(session, this.#abortReason);
                }
                throw error;
            }
            if (session) {
                await this.abortUploadSession(session, '前端上传失败，自动中止未完成会话。');
            }
            this.#uploadProgress.update((current) => ({
                ...current,
                phase: 'failed',
                message: '上传失败，可保留当前文件后重试',
                canAbort: false,
                error: describeAttachmentUploadError(error)
            }));
            throw error;
        }
    }

    private async createUploadTarget(sessionId: string): Promise<AttachmentUploadTarget> {
        const target = await firstValueFrom(
            this.#attachmentUploadSessionApi.attachmentUploadSessionControllerCreateUploadTarget({
                id: sessionId,
                createAttachmentUploadTargetRequest: {}
            })
        );
        this.#uploadProgress.update((current) => ({
            ...current,
            sessionId: target.sessionId,
            uploadMode: target.uploadMode,
            providerType: target.providerType,
            totalBytes: current.totalBytes || target.maxSizeBytes,
            message: this.uploadingMessage(target.uploadMode),
            canAbort: true
        }));
        return target;
    }

    private async calculateSha256(file: File): Promise<string | null> {
        if (!globalThis.crypto?.subtle) {
            return null;
        }

        const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        return Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    }

    private async uploadObjectToTarget(target: AttachmentUploadTarget, file: File): Promise<AttachmentUploadTargetResult | null> {
        if (target.uploadMode === AttachmentUploadMode.Proxy) {
            return await this.trackUploadEvents(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerProxyUploadObject(
                    {
                        id: target.sessionId,
                        body: file
                    },
                    'events',
                    true
                ),
                target,
                file
            );
        }

        if (target.uploadMode === AttachmentUploadMode.PresignedPut) {
            await this.trackUploadEvents(
                this.#directUploadHttpClient.put(target.url, file, {
                    headers: new HttpHeaders(target.headers),
                    observe: 'events',
                    reportProgress: true,
                    responseType: 'text'
                }),
                target,
                file
            );
            return null;
        }

        throw new Error(`Unsupported attachment upload mode: ${target.uploadMode}`);
    }

    private trackUploadEvents<T>(events$: Observable<HttpEvent<T>>, target: AttachmentUploadTarget, file: File): Promise<T | null> {
        return new Promise<T | null>((resolve, reject) => {
            let settled = false;
            const subscription = events$.subscribe({
                next: (event: HttpEvent<T>) => {
                    if (event.type === HttpEventType.UploadProgress) {
                        const totalBytes = event.total ?? file.size ?? target.maxSizeBytes;
                        this.#uploadProgress.update((current) => ({
                            ...current,
                            phase: 'uploading',
                            progressPercent: totalBytes > 0 ? Math.min(99, Math.round((event.loaded / totalBytes) * 100)) : current.progressPercent,
                            loadedBytes: event.loaded,
                            totalBytes,
                            message: this.uploadingMessage(target.uploadMode),
                            canAbort: true
                        }));
                    } else if (event.type === HttpEventType.Response) {
                        settled = true;
                        this.#uploadProgress.update((current) => ({
                            ...current,
                            phase: 'uploading',
                            progressPercent: 100,
                            loadedBytes: file.size,
                            totalBytes: file.size,
                            message: '对象上传完成，等待后端确认',
                            canAbort: false
                        }));
                        this.#activeUploadSubscription = null;
                        this.#activeUploadReject = null;
                        resolve(event.body ?? null);
                    }
                },
                error: (error: unknown) => {
                    settled = true;
                    this.#activeUploadSubscription = null;
                    this.#activeUploadReject = null;
                    reject(error);
                },
                complete: () => {
                    if (!settled) {
                        this.#activeUploadSubscription = null;
                        this.#activeUploadReject = null;
                        resolve(null);
                    }
                }
            });
            this.#activeUploadSubscription = subscription;
            this.#activeUploadReject = reject;
        });
    }

    private async abortUploadSession(session: AttachmentUploadSessionSummary, reason: string): Promise<void> {
        try {
            await firstValueFrom(
                this.#attachmentUploadSessionApi.attachmentUploadSessionControllerAbort({
                    id: session.id,
                    abortAttachmentUploadSessionRequest: {
                        reason
                    }
                })
            );
        } catch {
            // Best-effort cleanup: the session may already be completed, expired, or aborted server-side.
        }
    }

    private assertNotAborted(): void {
        if (this.#abortRequested) {
            throw new AttachmentUploadAbortedError();
        }
    }

    private clearActiveUploadHandles(): void {
        this.#activeUploadSubscription?.unsubscribe();
        this.#activeUploadSubscription = null;
        this.#activeUploadReject = null;
        this.#activeUploadSession = null;
        this.#abortRequested = false;
        this.#abortReason = '用户中止附件上传。';
    }

    private uploadingMessage(uploadMode: AttachmentUploadMode): string {
        return uploadMode === AttachmentUploadMode.Proxy ? '正在通过 POMS 代理上传' : '正在直传到对象存储';
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
