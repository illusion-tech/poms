import { computed, inject, Injectable, signal } from '@angular/core';
import {
  type ApplyOrgSyncRunRequest,
  type CreateExternalOrgSourceRequest,
  type CreateOrgSyncRunRequest,
  type ExternalDepartmentMappingStatus,
  type ExternalDepartmentMappingSummary,
  type ExternalOrgProvider,
  type ExternalOrgSourceStatus,
  type ExternalOrgSourceSummary,
  ExternalOrgSyncApi,
  type OrgSyncDiffAction,
  type OrgSyncDiffItemStatus,
  type OrgSyncDiffItemSummary,
  type OrgSyncRunSummary,
  type UpdateExternalOrgSourceRequest,
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface ExternalOrgSourceFilters {
  provider?: ExternalOrgProvider;
  status?: ExternalOrgSourceStatus;
}

export interface ExternalDepartmentMappingFilters {
  status?: ExternalDepartmentMappingStatus;
  externalDepartmentId?: string;
  orgUnitId?: string;
}

export interface OrgSyncDiffItemFilters {
  action?: OrgSyncDiffAction;
  status?: OrgSyncDiffItemStatus;
}

@Injectable()
export class ExternalOrgSyncStore {
  readonly #api = inject(ExternalOrgSyncApi);

  readonly #sources = signal<ExternalOrgSourceSummary[]>([]);
  readonly #selectedSourceId = signal<string | null>(null);
  readonly #mappings = signal<ExternalDepartmentMappingSummary[]>([]);
  readonly #activeRun = signal<OrgSyncRunSummary | null>(null);
  readonly #diffItems = signal<OrgSyncDiffItemSummary[]>([]);
  readonly #loadingSources = signal(false);
  readonly #savingSource = signal(false);
  readonly #loadingMappings = signal(false);
  readonly #creatingRun = signal(false);
  readonly #loadingDiffItems = signal(false);
  readonly #applyingRun = signal(false);

  readonly sources = this.#sources.asReadonly();
  readonly selectedSourceId = this.#selectedSourceId.asReadonly();
  readonly mappings = this.#mappings.asReadonly();
  readonly activeRun = this.#activeRun.asReadonly();
  readonly diffItems = this.#diffItems.asReadonly();
  readonly loadingSources = this.#loadingSources.asReadonly();
  readonly savingSource = this.#savingSource.asReadonly();
  readonly loadingMappings = this.#loadingMappings.asReadonly();
  readonly creatingRun = this.#creatingRun.asReadonly();
  readonly loadingDiffItems = this.#loadingDiffItems.asReadonly();
  readonly applyingRun = this.#applyingRun.asReadonly();
  readonly selectedSource = computed(() => this.#sources().find((source) => source.id === this.#selectedSourceId()) ?? null);
  readonly hasPendingDiffItems = computed(() => this.#diffItems().some((item) => item.status === 'pending'));

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
        this.#selectedSourceId.set(nextSources[0].id);
        await this.loadMappings(nextSources[0].id);
      }
      if (this.#selectedSourceId() && !nextSources.some((source) => source.id === this.#selectedSourceId())) {
        this.clearSelection();
      }
      return nextSources;
    } finally {
      this.#loadingSources.set(false);
    }
  }

  async selectSource(sourceId: string | null): Promise<void> {
    this.#selectedSourceId.set(sourceId);
    this.#activeRun.set(null);
    this.#diffItems.set([]);
    if (sourceId) {
      await this.loadMappings(sourceId);
    } else {
      this.#mappings.set([]);
    }
  }

  async createSource(request: CreateExternalOrgSourceRequest): Promise<ExternalOrgSourceSummary> {
    this.#savingSource.set(true);
    try {
      const created = await firstValueFrom(this.#api.externalOrgSyncControllerCreateExternalOrgSource({ createExternalOrgSourceRequest: request }));
      await this.loadSources();
      this.#selectedSourceId.set(created.id);
      await this.loadMappings(created.id);
      return created;
    } finally {
      this.#savingSource.set(false);
    }
  }

  async updateSource(id: string, request: UpdateExternalOrgSourceRequest): Promise<ExternalOrgSourceSummary> {
    this.#savingSource.set(true);
    try {
      const updated = await firstValueFrom(this.#api.externalOrgSyncControllerUpdateExternalOrgSource({ id, updateExternalOrgSourceRequest: request }));
      this.#sources.update((sources) => sources.map((source) => (source.id === updated.id ? updated : source)));
      return updated;
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

  async createPreviewRun(sourceId: string, request: CreateOrgSyncRunRequest = {}): Promise<OrgSyncRunSummary> {
    this.#creatingRun.set(true);
    try {
      const run = await firstValueFrom(this.#api.externalOrgSyncControllerCreateOrgSyncRun({ sourceId, createOrgSyncRunRequest: request }));
      this.#activeRun.set(run);
      await this.loadDiffItems(run.id);
      return run;
    } finally {
      this.#creatingRun.set(false);
    }
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

  async applyRun(runId: string, request: ApplyOrgSyncRunRequest): Promise<OrgSyncRunSummary> {
    this.#applyingRun.set(true);
    try {
      const applied = await firstValueFrom(this.#api.externalOrgSyncControllerApplyOrgSyncRun({ id: runId, applyOrgSyncRunRequest: request }));
      this.#activeRun.set(applied);
      await this.loadDiffItems(runId);
      if (applied.sourceId) {
        await this.loadMappings(applied.sourceId);
      }
      return applied;
    } finally {
      this.#applyingRun.set(false);
    }
  }

  clearSelection(): void {
    this.#selectedSourceId.set(null);
    this.#mappings.set([]);
    this.#activeRun.set(null);
    this.#diffItems.set([]);
  }
}
