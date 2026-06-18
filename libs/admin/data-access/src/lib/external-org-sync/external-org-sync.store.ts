import { computed, Injectable, inject, signal } from "@angular/core";
import {
    type ActivateExternalOrgSourceRequest,
    type ApplyOrgSyncRunRequest,
    type ArchiveExternalOrgSourceRequest,
    type CreateExternalOrgSourceRequest,
    type CreateOrgSyncRunRequest,
    type ExternalDepartmentMappingReviewState,
    type ExternalDepartmentMappingStatus,
    type ExternalDepartmentMappingSummary,
    type ExternalOrgProvider,
    type ExternalOrgSourceStatus,
    type ExternalOrgSourceSummary,
    ExternalOrgSyncApi,
    type IgnoreExternalDepartmentMappingRequest,
    type MapExternalDepartmentMappingRequest,
    type OrgSyncDiffAction,
    OrgSyncDiffItemStatus,
    type OrgSyncDiffItemSummary,
    type OrgSyncRunStatus,
    type OrgSyncRunSummary,
    type PauseExternalOrgSourceRequest,
    type RestoreExternalDepartmentMappingRequest,
    type UnmapExternalDepartmentMappingRequest,
    type UpdateExternalOrgSourceRequest,
} from "@poms/shared-api-client";
import { firstValueFrom, type Observable } from "rxjs";

export interface ExternalOrgSourceFilters {
    provider?: ExternalOrgProvider;
    status?: ExternalOrgSourceStatus;
}

export interface ExternalDepartmentMappingFilters {
    status?: ExternalDepartmentMappingStatus;
    reviewState?: ExternalDepartmentMappingReviewState;
    search?: string;
    externalDepartmentId?: string;
    orgUnitId?: string;
}

export interface OrgSyncDiffItemFilters {
    action?: OrgSyncDiffAction;
    status?: OrgSyncDiffItemStatus;
}

export interface OrgSyncRunFilters {
    status?: OrgSyncRunStatus;
    limit?: number;
}

const DEFAULT_RUN_HISTORY_LIMIT = 20;
const MIN_RUN_HISTORY_LIMIT = 1;
const MAX_RUN_HISTORY_LIMIT = 100;

function normalizeRunHistoryLimit(limit: number | undefined): number {
    if (typeof limit !== "number" || !Number.isFinite(limit)) return DEFAULT_RUN_HISTORY_LIMIT;
    return Math.min(MAX_RUN_HISTORY_LIMIT, Math.max(MIN_RUN_HISTORY_LIMIT, Math.trunc(limit)));
}

@Injectable()
export class ExternalOrgSyncStore {
    readonly #api = inject(ExternalOrgSyncApi);

    readonly #sources = signal<ExternalOrgSourceSummary[]>([]);
    readonly #selectedSourceId = signal<string | null>(null);
    readonly #mappings = signal<ExternalDepartmentMappingSummary[]>([]);
    readonly #mappedExternalDepartmentIds = signal<ReadonlySet<string>>(new Set<string>());
    readonly #activeRun = signal<OrgSyncRunSummary | null>(null);
    readonly #diffItems = signal<OrgSyncDiffItemSummary[]>([]);
    readonly #runHistory = signal<OrgSyncRunSummary[]>([]);
    readonly #selectedRunDetail = signal<OrgSyncRunSummary | null>(null);
    readonly #selectedRunDiffItems = signal<OrgSyncDiffItemSummary[]>([]);
    readonly #loadingSources = signal(false);
    readonly #savingSource = signal(false);
    readonly #loadingMappings = signal(false);
    readonly #creatingRun = signal(false);
    readonly #loadingDiffItems = signal(false);
    readonly #loadingRunHistory = signal(false);
    readonly #loadingRunDetail = signal(false);
    readonly #loadingRunDetailId = signal<string | null>(null);
    readonly #applyingRun = signal(false);
    readonly #savingMappingIds = signal<ReadonlySet<string>>(new Set<string>());
    readonly #previewStale = signal(false);

    readonly sources = this.#sources.asReadonly();
    readonly selectedSourceId = this.#selectedSourceId.asReadonly();
    readonly mappings = this.#mappings.asReadonly();
    readonly mappedExternalDepartmentIds = this.#mappedExternalDepartmentIds.asReadonly();
    readonly activeRun = this.#activeRun.asReadonly();
    readonly diffItems = this.#diffItems.asReadonly();
    readonly runHistory = this.#runHistory.asReadonly();
    readonly selectedRunDetail = this.#selectedRunDetail.asReadonly();
    readonly selectedRunDiffItems = this.#selectedRunDiffItems.asReadonly();
    readonly loadingSources = this.#loadingSources.asReadonly();
    readonly savingSource = this.#savingSource.asReadonly();
    readonly loadingMappings = this.#loadingMappings.asReadonly();
    readonly creatingRun = this.#creatingRun.asReadonly();
    readonly loadingDiffItems = this.#loadingDiffItems.asReadonly();
    readonly loadingRunHistory = this.#loadingRunHistory.asReadonly();
    readonly loadingRunDetail = this.#loadingRunDetail.asReadonly();
    readonly loadingRunDetailId = this.#loadingRunDetailId.asReadonly();
    readonly applyingRun = this.#applyingRun.asReadonly();
    readonly savingMappingIds = this.#savingMappingIds.asReadonly();
    readonly previewStale = this.#previewStale.asReadonly();
    readonly selectedSource = computed(() => this.#sources().find(source => source.id === this.#selectedSourceId()) ?? null);
    readonly hasPendingDiffItems = computed(() => this.#diffItems().some(item => item.status === OrgSyncDiffItemStatus.Pending));

    async loadSources(filters: ExternalOrgSourceFilters = {}): Promise<ExternalOrgSourceSummary[]> {
        this.#loadingSources.set(true);
        try {
            const sources = await firstValueFrom(
                this.#api.externalOrgSyncControllerListExternalOrgSources({
                    provider: filters.provider,
                    status: filters.status,
                }),
            );
            const nextSources = sources ?? [];
            this.#sources.set(nextSources);
            if (!this.#selectedSourceId() && nextSources.length > 0) {
                await this.selectSource(nextSources[0].id);
            }
            if (this.#selectedSourceId() && !nextSources.some(source => source.id === this.#selectedSourceId())) {
                this.clearSelection();
            }
            return nextSources;
        } finally {
            this.#loadingSources.set(false);
        }
    }

    async selectSource(sourceId: string | null, mappingFilters: ExternalDepartmentMappingFilters = {}): Promise<void> {
        this.#selectedSourceId.set(sourceId);
        this.#activeRun.set(null);
        this.#diffItems.set([]);
        this.#runHistory.set([]);
        this.#previewStale.set(false);
        this.clearRunDetail();
        if (sourceId) {
            this.#mappings.set([]);
            this.#mappedExternalDepartmentIds.set(new Set<string>());
            await Promise.allSettled([this.loadMappings(sourceId, mappingFilters), this.loadMappedExternalDepartmentIds(sourceId), this.loadRunHistory(sourceId)]);
        } else {
            this.#mappings.set([]);
            this.#mappedExternalDepartmentIds.set(new Set<string>());
        }
    }

    async createSource(request: CreateExternalOrgSourceRequest): Promise<ExternalOrgSourceSummary> {
        this.#savingSource.set(true);
        try {
            const created = await firstValueFrom(this.#api.externalOrgSyncControllerCreateExternalOrgSource({ createExternalOrgSourceRequest: request }));
            await this.loadSources();
            await this.selectSource(created.id);
            return created;
        } finally {
            this.#savingSource.set(false);
        }
    }

    async updateSource(id: string, request: UpdateExternalOrgSourceRequest): Promise<ExternalOrgSourceSummary> {
        this.#savingSource.set(true);
        try {
            const updated = await firstValueFrom(this.#api.externalOrgSyncControllerUpdateExternalOrgSource({ id, updateExternalOrgSourceRequest: request }));
            this.#sources.update(sources => sources.map(source => (source.id === updated.id ? updated : source)));
            return updated;
        } finally {
            this.#savingSource.set(false);
        }
    }

    async activateSource(id: string, request: ActivateExternalOrgSourceRequest = {}): Promise<ExternalOrgSourceSummary> {
        this.#savingSource.set(true);
        try {
            const activated = await firstValueFrom(this.#api.externalOrgSyncControllerActivateExternalOrgSource({ id, activateExternalOrgSourceRequest: request }));
            this.#sources.update(sources => sources.map(source => (source.id === activated.id ? activated : source)));
            return activated;
        } finally {
            this.#savingSource.set(false);
        }
    }

    async pauseSource(id: string, request: PauseExternalOrgSourceRequest = {}): Promise<ExternalOrgSourceSummary> {
        this.#savingSource.set(true);
        try {
            const paused = await firstValueFrom(this.#api.externalOrgSyncControllerPauseExternalOrgSource({ id, pauseExternalOrgSourceRequest: request }));
            this.#sources.update(sources => sources.map(source => (source.id === paused.id ? paused : source)));
            return paused;
        } finally {
            this.#savingSource.set(false);
        }
    }

    async archiveSource(id: string, request: ArchiveExternalOrgSourceRequest = {}): Promise<ExternalOrgSourceSummary> {
        this.#savingSource.set(true);
        try {
            const archived = await firstValueFrom(this.#api.externalOrgSyncControllerArchiveExternalOrgSource({ id, archiveExternalOrgSourceRequest: request }));
            this.#sources.update(sources => sources.map(source => (source.id === archived.id ? archived : source)));
            return archived;
        } finally {
            this.#savingSource.set(false);
        }
    }

    async loadMappings(sourceId: string, filters: ExternalDepartmentMappingFilters = {}): Promise<ExternalDepartmentMappingSummary[]> {
        this.#loadingMappings.set(true);
        try {
            const mappings = await firstValueFrom(
                this.#api.externalOrgSyncControllerListExternalDepartmentMappings({
                    sourceId,
                    status: filters.status,
                    reviewState: filters.reviewState,
                    search: filters.search?.trim() || undefined,
                    externalDepartmentId: filters.externalDepartmentId,
                    orgUnitId: filters.orgUnitId,
                }),
            );
            this.#mappings.set(mappings ?? []);
            return mappings ?? [];
        } finally {
            this.#loadingMappings.set(false);
        }
    }

    async loadMappedExternalDepartmentIds(sourceId: string): Promise<ReadonlySet<string>> {
        const mappings = await firstValueFrom(
            this.#api.externalOrgSyncControllerListExternalDepartmentMappings({
                sourceId,
            }),
        );
        const ids = this.toMappedExternalDepartmentIds(mappings ?? []);
        this.#mappedExternalDepartmentIds.set(ids);
        return ids;
    }

    async createPreviewRun(sourceId: string, request: CreateOrgSyncRunRequest = {}): Promise<OrgSyncRunSummary> {
        this.#creatingRun.set(true);
        try {
            const run = await firstValueFrom(this.#api.externalOrgSyncControllerCreateOrgSyncRun({ sourceId, createOrgSyncRunRequest: request }));
            this.#activeRun.set(run);
            this.#previewStale.set(false);
            await this.loadDiffItems(run.id);
            await Promise.allSettled([this.refreshMappedExternalDepartmentIdsBestEffort(sourceId), this.refreshRunHistoryBestEffort(sourceId)]);
            return run;
        } finally {
            this.#creatingRun.set(false);
        }
    }

    async loadRunHistory(sourceId: string, filters: OrgSyncRunFilters = {}): Promise<OrgSyncRunSummary[]> {
        this.#loadingRunHistory.set(true);
        try {
            const runs = await firstValueFrom(
                this.#api.externalOrgSyncControllerListOrgSyncRuns({
                    sourceId,
                    status: filters.status,
                    limit: normalizeRunHistoryLimit(filters.limit),
                }),
            );
            const nextRuns = runs ?? [];
            this.#runHistory.set(nextRuns);
            return nextRuns;
        } finally {
            this.#loadingRunHistory.set(false);
        }
    }

    async loadRunDetail(runId: string): Promise<OrgSyncRunSummary> {
        this.#loadingRunDetail.set(true);
        this.#loadingRunDetailId.set(runId);
        this.clearRunDetailData();
        try {
            const [run, items] = await Promise.all([
                firstValueFrom(this.#api.externalOrgSyncControllerGetOrgSyncRun({ id: runId })),
                firstValueFrom(this.#api.externalOrgSyncControllerListOrgSyncDiffItems({ id: runId })),
            ]);
            if (this.#loadingRunDetailId() === runId) {
                this.#selectedRunDetail.set(run);
                this.#selectedRunDiffItems.set(items ?? []);
            }
            return run;
        } finally {
            if (this.#loadingRunDetailId() === runId) {
                this.#loadingRunDetail.set(false);
                this.#loadingRunDetailId.set(null);
            }
        }
    }

    clearRunDetail(): void {
        this.clearRunDetailData();
        this.#loadingRunDetail.set(false);
        this.#loadingRunDetailId.set(null);
    }

    private clearRunDetailData(): void {
        this.#selectedRunDetail.set(null);
        this.#selectedRunDiffItems.set([]);
    }

    async loadDiffItems(runId: string, filters: OrgSyncDiffItemFilters = {}): Promise<OrgSyncDiffItemSummary[]> {
        this.#loadingDiffItems.set(true);
        try {
            const items = await firstValueFrom(
                this.#api.externalOrgSyncControllerListOrgSyncDiffItems({
                    id: runId,
                    action: filters.action,
                    status: filters.status,
                }),
            );
            this.#diffItems.set(items ?? []);
            return items ?? [];
        } finally {
            this.#loadingDiffItems.set(false);
        }
    }

    async applyRun(runId: string, request: ApplyOrgSyncRunRequest, mappingFilters: ExternalDepartmentMappingFilters = {}): Promise<OrgSyncRunSummary> {
        this.#applyingRun.set(true);
        try {
            const applied = await firstValueFrom(this.#api.externalOrgSyncControllerApplyOrgSyncRun({ id: runId, applyOrgSyncRunRequest: request }));
            this.#activeRun.set(applied);
            await this.refreshDiffItemsBestEffort(runId);
            if (applied.sourceId) {
                await Promise.allSettled([this.loadMappings(applied.sourceId, mappingFilters), this.loadMappedExternalDepartmentIds(applied.sourceId), this.refreshRunHistoryBestEffort(applied.sourceId)]);
            }
            return applied;
        } finally {
            this.#applyingRun.set(false);
        }
    }

    async mapMapping(id: string, request: MapExternalDepartmentMappingRequest): Promise<ExternalDepartmentMappingSummary> {
        return this.writeMapping(id, () =>
            this.#api.externalOrgSyncControllerMapExternalDepartmentMapping({
                id,
                mapExternalDepartmentMappingRequest: request,
            }),
        );
    }

    async unmapMapping(id: string, request: UnmapExternalDepartmentMappingRequest): Promise<ExternalDepartmentMappingSummary> {
        return this.writeMapping(id, () =>
            this.#api.externalOrgSyncControllerUnmapExternalDepartmentMapping({
                id,
                unmapExternalDepartmentMappingRequest: request,
            }),
        );
    }

    async ignoreMapping(id: string, request: IgnoreExternalDepartmentMappingRequest): Promise<ExternalDepartmentMappingSummary> {
        return this.writeMapping(id, () =>
            this.#api.externalOrgSyncControllerIgnoreExternalDepartmentMapping({
                id,
                ignoreExternalDepartmentMappingRequest: request,
            }),
        );
    }

    async restoreMapping(id: string, request: RestoreExternalDepartmentMappingRequest): Promise<ExternalDepartmentMappingSummary> {
        return this.writeMapping(id, () =>
            this.#api.externalOrgSyncControllerRestoreExternalDepartmentMapping({
                id,
                restoreExternalDepartmentMappingRequest: request,
            }),
        );
    }

    clearSelection(): void {
        this.#selectedSourceId.set(null);
        this.#mappings.set([]);
        this.#mappedExternalDepartmentIds.set(new Set<string>());
        this.#activeRun.set(null);
        this.#diffItems.set([]);
        this.#runHistory.set([]);
        this.#previewStale.set(false);
        this.clearRunDetail();
    }

    private async writeMapping(id: string, command: () => Observable<ExternalDepartmentMappingSummary>): Promise<ExternalDepartmentMappingSummary> {
        if (this.#savingMappingIds().has(id)) {
            throw new Error(`External department mapping ${id} is already saving.`);
        }
        this.#savingMappingIds.update((current) => {
            const next = new Set(current);
            next.add(id);
            return next;
        });
        try {
            const updated = await firstValueFrom(command());
            this.#mappings.update((mappings) => mappings.map((mapping) => (mapping.id === updated.id ? updated : mapping)));
            this.#mappedExternalDepartmentIds.update((ids) => {
                const next = new Set(ids);
                if (updated.orgUnitId) {
                    next.add(updated.externalDepartmentId);
                } else {
                    next.delete(updated.externalDepartmentId);
                }
                return next;
            });
            this.#previewStale.set(true);
            return updated;
        } finally {
            this.#savingMappingIds.update((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
        }
    }

    private async refreshRunHistoryBestEffort(sourceId: string): Promise<void> {
        try {
            await this.loadRunHistory(sourceId);
        } catch {
            // A post-command history refresh must not turn a successful command into a failed UI action.
        }
    }

    private async refreshMappedExternalDepartmentIdsBestEffort(sourceId: string): Promise<void> {
        try {
            await this.loadMappedExternalDepartmentIds(sourceId);
        } catch {
            // Best-effort refresh; the apply command still enforces dependencies server-side.
        }
    }

    private async refreshDiffItemsBestEffort(runId: string): Promise<void> {
        try {
            await this.loadDiffItems(runId);
        } catch {
            // A post-command diff refresh must not turn a successful apply into a failed UI action.
        }
    }

    private toMappedExternalDepartmentIds(mappings: ExternalDepartmentMappingSummary[]): ReadonlySet<string> {
        return new Set(mappings.filter((mapping) => mapping.orgUnitId).map((mapping) => mapping.externalDepartmentId));
    }
}
