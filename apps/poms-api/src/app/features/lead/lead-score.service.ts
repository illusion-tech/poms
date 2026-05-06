import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
    LeadEffectiveScoreSourceValue,
    LeadScoreOverrideStatusValue,
    LeadScoreSnapshotKindValue,
    type ApproveLeadScoreOverrideRequest,
    type LeadEffectiveScoreSource,
    type LeadGateSummary,
    type LeadRating,
    type LeadScoreHistoryItem,
    type LeadScoreHistoryView,
    type LeadScoreOverrideSummary,
    type LeadScoreSnapshotKind,
    type RejectLeadScoreOverrideRequest,
    type RevokeLeadScoreOverrideRequest,
    type SubmitLeadScoreOverrideRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { LeadScoreOverride, LeadScoreSnapshot } from './lead-score-history.entity';
import { Lead } from './lead.entity';
import { LeadScoreFactsService } from './lead-score-facts.service';
import { buildLeadGateSummary, buildLeadScoreComponentBreakdown, LEAD_SCORE_FORMULA_VERSION, resolveLeadRating } from './lead-scoring';

export type ActiveLeadScoreOverride = Pick<LeadScoreOverride, 'id' | 'leadId' | 'requestedScore' | 'requestedRating' | 'reason'>;

export interface LeadEffectiveScore {
    effectiveScore: number;
    effectiveRating: LeadRating;
    effectiveScoreReason: string;
    effectiveScoreSource: LeadEffectiveScoreSource;
    activeScoreOverrideId: string | null;
}

interface LeadScoreSnapshotInput {
    leadId: string;
    snapshotKind: LeadScoreSnapshotKind;
    overrideId: string | null;
    formulaVersion: string;
    systemScore: number;
    systemRating: LeadRating;
    effectiveScore: number;
    effectiveRating: LeadRating;
    effectiveScoreSource: LeadEffectiveScoreSource;
    scoreReason: string;
    componentBreakdown: Record<string, unknown>;
    gateSummarySnapshot: LeadGateSummary;
    sourceCommand: string;
    sourceRecordId: string | null;
    createdBy: string | null;
}

@Injectable()
export class LeadScoreService {
    constructor(
        @InjectRepository(Lead)
        private readonly leadRepository: EntityRepository<Lead>,
        @InjectRepository(LeadScoreSnapshot)
        private readonly snapshotRepository: EntityRepository<LeadScoreSnapshot>,
        @InjectRepository(LeadScoreOverride)
        private readonly overrideRepository: EntityRepository<LeadScoreOverride>,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly leadScoreFactsService: LeadScoreFactsService
    ) {}

    async getLeadScoreHistory(leadId: string): Promise<LeadScoreHistoryView> {
        const lead = await this.leadRepository.findOne({ id: leadId });
        if (!lead) {
            throw new NotFoundException(`Lead ${leadId} not found`);
        }

        const [snapshots, overrides] = await Promise.all([
            this.snapshotRepository.find({ leadId }, { orderBy: { createdAt: QueryOrder.DESC } }),
            this.overrideRepository.find({ leadId }, { orderBy: { requestedAt: QueryOrder.DESC } })
        ]);
        const activeOverride = overrides.find((override) => override.status === LeadScoreOverrideStatusValue.Approved) ?? null;
        const pendingOverride = overrides.find((override) => override.status === LeadScoreOverrideStatusValue.Pending) ?? null;
        const effectiveScore = this.resolveEffectiveScore(lead, activeOverride);

        return {
            leadId: lead.id,
            systemScore: lead.score,
            systemRating: lead.rating,
            scoreReason: lead.scoreReason,
            scoreUpdatedAt: lead.scoreUpdatedAt.toISOString(),
            ...effectiveScore,
            activeOverride: activeOverride ? this.mapScoreOverride(activeOverride) : null,
            pendingOverride: pendingOverride ? this.mapScoreOverride(pendingOverride) : null,
            snapshots: snapshots.map((snapshot) => this.mapScoreSnapshot(snapshot)),
            overrides: overrides.map((override) => this.mapScoreOverride(override))
        };
    }

    async submitLeadScoreOverride(leadId: string, input: SubmitLeadScoreOverrideRequest, operatorUserId: string, requestId?: string | null): Promise<LeadScoreOverrideSummary> {
        const override = await this.overrideRepository.getEntityManager().transactional(async (em) => {
            const lead = await em.findOne(Lead, { id: leadId });
            if (!lead) {
                throw new NotFoundException(`Lead ${leadId} not found`);
            }
            this.assertExpectedVersion(lead.rowVersion, input.expectedLeadRowVersion, 'lead');

            const existingPending = await em.findOne(LeadScoreOverride, {
                leadId,
                status: LeadScoreOverrideStatusValue.Pending
            });
            if (existingPending) {
                throw new ConflictException(`Lead ${leadId} already has pending score override ${existingPending.id}`);
            }

            const now = new Date();
            const entity = em.create(LeadScoreOverride, {
                id: randomUUID(),
                leadId,
                requestedScore: input.score,
                requestedRating: resolveLeadRating(input.score),
                reason: input.reason.trim(),
                status: LeadScoreOverrideStatusValue.Pending,
                systemScoreAtRequest: lead.score,
                systemRatingAtRequest: lead.rating,
                requestedBy: operatorUserId,
                requestedAt: now,
                updatedAt: now,
                updatedBy: operatorUserId
            });

            em.persist(entity);
            await em.flush();
            return entity;
        });

        await this.recordAudit('lead-score-override.submitted', override.id, operatorUserId, requestId, {
            leadId: override.leadId,
            requestedScore: override.requestedScore,
            requestedRating: override.requestedRating,
            systemScoreAtRequest: override.systemScoreAtRequest,
            systemRatingAtRequest: override.systemRatingAtRequest
        });

        return this.mapScoreOverride(override);
    }

    async approveLeadScoreOverride(id: string, input: ApproveLeadScoreOverrideRequest, operatorUserId: string, requestId?: string | null): Promise<LeadScoreOverrideSummary> {
        const override = await this.overrideRepository.getEntityManager().transactional(async (em) => {
            const entity = await this.requireOverride(id, em);
            this.assertExpectedVersion(entity.rowVersion, input.expectedOverrideRowVersion, 'lead score override');
            this.assertOverrideStatus(entity, LeadScoreOverrideStatusValue.Pending, 'approve');

            const lead = await em.findOne(Lead, { id: entity.leadId });
            if (!lead) {
                throw new NotFoundException(`Lead ${entity.leadId} not found`);
            }

            const existingActiveOverride = await em.findOne(LeadScoreOverride, {
                leadId: entity.leadId,
                status: LeadScoreOverrideStatusValue.Approved
            });
            if (existingActiveOverride) {
                existingActiveOverride.status = LeadScoreOverrideStatusValue.Superseded;
                existingActiveOverride.supersededById = entity.id;
                existingActiveOverride.updatedBy = operatorUserId;
            }

            const now = new Date();
            entity.status = LeadScoreOverrideStatusValue.Approved;
            entity.approvedAt = now;
            entity.approvedBy = operatorUserId;
            entity.approvalNote = this.normalizeOptionalText(input.note);
            entity.updatedBy = operatorUserId;

            await this.recordManualOverrideSnapshot(lead, entity, LeadScoreSnapshotKindValue.ManualOverride, 'approve-score-override', operatorUserId, em);
            em.persist(entity);
            await em.flush();
            return entity;
        });

        await this.recordAudit('lead-score-override.approved', override.id, operatorUserId, requestId, {
            leadId: override.leadId,
            requestedScore: override.requestedScore,
            requestedRating: override.requestedRating,
            approvalNote: override.approvalNote ?? null
        });

        return this.mapScoreOverride(override);
    }

    async rejectLeadScoreOverride(id: string, input: RejectLeadScoreOverrideRequest, operatorUserId: string, requestId?: string | null): Promise<LeadScoreOverrideSummary> {
        const override = await this.overrideRepository.getEntityManager().transactional(async (em) => {
            const entity = await this.requireOverride(id, em);
            this.assertExpectedVersion(entity.rowVersion, input.expectedOverrideRowVersion, 'lead score override');
            this.assertOverrideStatus(entity, LeadScoreOverrideStatusValue.Pending, 'reject');

            const now = new Date();
            entity.status = LeadScoreOverrideStatusValue.Rejected;
            entity.rejectedAt = now;
            entity.rejectedBy = operatorUserId;
            entity.rejectReason = input.reason.trim();
            entity.updatedBy = operatorUserId;
            em.persist(entity);
            await em.flush();
            return entity;
        });

        await this.recordAudit('lead-score-override.rejected', override.id, operatorUserId, requestId, {
            leadId: override.leadId,
            rejectReason: override.rejectReason
        });

        return this.mapScoreOverride(override);
    }

    async revokeLeadScoreOverride(id: string, input: RevokeLeadScoreOverrideRequest, operatorUserId: string, requestId?: string | null): Promise<LeadScoreOverrideSummary> {
        const override = await this.overrideRepository.getEntityManager().transactional(async (em) => {
            const entity = await this.requireOverride(id, em);
            this.assertExpectedVersion(entity.rowVersion, input.expectedOverrideRowVersion, 'lead score override');
            this.assertOverrideStatus(entity, LeadScoreOverrideStatusValue.Approved, 'revoke');

            const lead = await em.findOne(Lead, { id: entity.leadId });
            if (!lead) {
                throw new NotFoundException(`Lead ${entity.leadId} not found`);
            }

            const now = new Date();
            entity.status = LeadScoreOverrideStatusValue.Revoked;
            entity.revokedAt = now;
            entity.revokedBy = operatorUserId;
            entity.revokeReason = input.reason.trim();
            entity.updatedBy = operatorUserId;

            await this.recordManualOverrideSnapshot(lead, null, LeadScoreSnapshotKindValue.OverrideRevoked, 'revoke-score-override', operatorUserId, em, entity.id);
            em.persist(entity);
            await em.flush();
            return entity;
        });

        await this.recordAudit('lead-score-override.revoked', override.id, operatorUserId, requestId, {
            leadId: override.leadId,
            revokeReason: override.revokeReason
        });

        return this.mapScoreOverride(override);
    }

    async findActiveOverridesByLeadIds(leadIds: string[]): Promise<Map<string, LeadScoreOverride>> {
        if (leadIds.length === 0) {
            return new Map();
        }

        const overrides = await this.overrideRepository.find({
            leadId: { $in: [...new Set(leadIds)] },
            status: LeadScoreOverrideStatusValue.Approved
        });

        return new Map(overrides.map((override) => [override.leadId, override]));
    }

    async findActiveOverrideByLeadId(leadId: string): Promise<LeadScoreOverride | null> {
        return this.overrideRepository.findOne({
            leadId,
            status: LeadScoreOverrideStatusValue.Approved
        });
    }

    resolveEffectiveScore(lead: Pick<Lead, 'score' | 'rating' | 'scoreReason'>, activeOverride: ActiveLeadScoreOverride | null | undefined): LeadEffectiveScore {
        if (activeOverride) {
            return {
                effectiveScore: activeOverride.requestedScore,
                effectiveRating: activeOverride.requestedRating,
                effectiveScoreReason: `人工覆盖评分：${activeOverride.reason}`,
                effectiveScoreSource: LeadEffectiveScoreSourceValue.ManualOverride,
                activeScoreOverrideId: activeOverride.id
            };
        }

        return {
            effectiveScore: lead.score,
            effectiveRating: lead.rating,
            effectiveScoreReason: lead.scoreReason,
            effectiveScoreSource: LeadEffectiveScoreSourceValue.System,
            activeScoreOverrideId: null
        };
    }

    async recordSystemSnapshot(lead: Lead, sourceCommand: string, operatorUserId: string | null, sourceRecordId: string | null = null, entityManager?: EntityManager): Promise<LeadScoreSnapshot | null> {
        const em = entityManager ?? this.snapshotRepository.getEntityManager();
        const activeOverride = await em.findOne(LeadScoreOverride, {
            leadId: lead.id,
            status: LeadScoreOverrideStatusValue.Approved
        });
        const snapshot = await this.buildSnapshotInput(lead, activeOverride, LeadScoreSnapshotKindValue.System, sourceCommand, operatorUserId, sourceRecordId, em);
        const latestSnapshot = await em.findOne(LeadScoreSnapshot, { leadId: lead.id }, { orderBy: { createdAt: QueryOrder.DESC } });

        if (latestSnapshot && this.isDuplicateSnapshot(latestSnapshot, snapshot)) {
            return null;
        }

        const entity = em.create(LeadScoreSnapshot, {
            id: randomUUID(),
            ...snapshot
        });
        em.persist(entity);
        if (!entityManager) {
            await em.flush();
        }

        return entity;
    }

    private async recordManualOverrideSnapshot(
        lead: Lead,
        activeOverride: LeadScoreOverride | null,
        snapshotKind: LeadScoreSnapshotKind,
        sourceCommand: string,
        operatorUserId: string,
        entityManager: EntityManager,
        sourceRecordId: string | null = activeOverride?.id ?? null
    ): Promise<LeadScoreSnapshot> {
        const entity = entityManager.create(LeadScoreSnapshot, {
            id: randomUUID(),
            ...(await this.buildSnapshotInput(lead, activeOverride, snapshotKind, sourceCommand, operatorUserId, sourceRecordId, entityManager))
        });
        entityManager.persist(entity);
        return entity;
    }

    private async buildSnapshotInput(
        lead: Lead,
        activeOverride: ActiveLeadScoreOverride | null,
        snapshotKind: LeadScoreSnapshotKind,
        sourceCommand: string,
        operatorUserId: string | null,
        sourceRecordId: string | null,
        entityManager?: EntityManager
    ): Promise<LeadScoreSnapshotInput> {
        const effectiveScore = this.resolveEffectiveScore(lead, activeOverride);
        const facts = await this.leadScoreFactsService.collectLeadScoreFacts(lead.id, entityManager);

        return {
            leadId: lead.id,
            snapshotKind,
            overrideId: activeOverride?.id ?? null,
            formulaVersion: LEAD_SCORE_FORMULA_VERSION,
            systemScore: lead.score,
            systemRating: lead.rating,
            effectiveScore: effectiveScore.effectiveScore,
            effectiveRating: effectiveScore.effectiveRating,
            effectiveScoreSource: effectiveScore.effectiveScoreSource,
            scoreReason: effectiveScore.effectiveScoreReason,
            componentBreakdown: { ...buildLeadScoreComponentBreakdown(lead, facts) },
            gateSummarySnapshot: buildLeadGateSummary(lead),
            sourceCommand,
            sourceRecordId,
            createdBy: operatorUserId
        };
    }

    private isDuplicateSnapshot(latestSnapshot: LeadScoreSnapshot, nextSnapshot: LeadScoreSnapshotInput): boolean {
        return (
            latestSnapshot.snapshotKind === nextSnapshot.snapshotKind &&
            latestSnapshot.formulaVersion === nextSnapshot.formulaVersion &&
            latestSnapshot.systemScore === nextSnapshot.systemScore &&
            latestSnapshot.systemRating === nextSnapshot.systemRating &&
            latestSnapshot.effectiveScore === nextSnapshot.effectiveScore &&
            latestSnapshot.effectiveRating === nextSnapshot.effectiveRating &&
            latestSnapshot.effectiveScoreSource === nextSnapshot.effectiveScoreSource &&
            latestSnapshot.scoreReason === nextSnapshot.scoreReason &&
            latestSnapshot.sourceRecordId === nextSnapshot.sourceRecordId &&
            JSON.stringify(latestSnapshot.componentBreakdown) === JSON.stringify(nextSnapshot.componentBreakdown) &&
            JSON.stringify(latestSnapshot.gateSummarySnapshot) === JSON.stringify(nextSnapshot.gateSummarySnapshot)
        );
    }

    private async requireOverride(id: string, entityManager: EntityManager): Promise<LeadScoreOverride> {
        const override = await entityManager.findOne(LeadScoreOverride, { id });
        if (!override) {
            throw new NotFoundException(`Lead score override ${id} not found`);
        }
        return override;
    }

    private assertExpectedVersion(currentVersion: number, expectedVersion: number, targetType: string): void {
        if (currentVersion !== expectedVersion) {
            throw new ConflictException(`${targetType} version ${expectedVersion} does not match current version ${currentVersion}`);
        }
    }

    private assertOverrideStatus(override: LeadScoreOverride, expectedStatus: string, action: string): void {
        if (override.status !== expectedStatus) {
            throw new BadRequestException(`Cannot ${action} lead score override ${override.id} in status ${override.status}`);
        }
    }

    private normalizeOptionalText(value: string | null | undefined): string | null {
        const normalized = value?.trim();
        return normalized ? normalized : null;
    }

    private mapScoreOverride(override: LeadScoreOverride): LeadScoreOverrideSummary {
        return {
            id: override.id,
            leadId: override.leadId,
            requestedScore: override.requestedScore,
            requestedRating: override.requestedRating,
            reason: override.reason,
            status: override.status,
            systemScoreAtRequest: override.systemScoreAtRequest,
            systemRatingAtRequest: override.systemRatingAtRequest,
            requestedBy: override.requestedBy ?? null,
            requestedAt: override.requestedAt.toISOString(),
            approvedBy: override.approvedBy ?? null,
            approvedAt: override.approvedAt?.toISOString() ?? null,
            approvalNote: override.approvalNote ?? null,
            rejectedBy: override.rejectedBy ?? null,
            rejectedAt: override.rejectedAt?.toISOString() ?? null,
            rejectReason: override.rejectReason ?? null,
            revokedBy: override.revokedBy ?? null,
            revokedAt: override.revokedAt?.toISOString() ?? null,
            revokeReason: override.revokeReason ?? null,
            supersededById: override.supersededById ?? null,
            rowVersion: override.rowVersion
        };
    }

    private mapScoreSnapshot(snapshot: LeadScoreSnapshot): LeadScoreHistoryItem {
        return {
            id: snapshot.id,
            leadId: snapshot.leadId,
            snapshotKind: snapshot.snapshotKind,
            overrideId: snapshot.overrideId ?? null,
            formulaVersion: snapshot.formulaVersion,
            systemScore: snapshot.systemScore,
            systemRating: snapshot.systemRating,
            effectiveScore: snapshot.effectiveScore,
            effectiveRating: snapshot.effectiveRating,
            effectiveScoreSource: snapshot.effectiveScoreSource,
            scoreReason: snapshot.scoreReason,
            componentBreakdown: snapshot.componentBreakdown,
            gateSummarySnapshot: snapshot.gateSummarySnapshot,
            sourceCommand: snapshot.sourceCommand,
            sourceRecordId: snapshot.sourceRecordId ?? null,
            createdAt: snapshot.createdAt.toISOString(),
            createdBy: snapshot.createdBy ?? null
        };
    }

    private async recordAudit(eventType: string, targetId: string, operatorUserId: string, requestId: string | null | undefined, metadata: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType: 'lead-score-override',
            targetId,
            operatorId: operatorUserId,
            requestId: requestId ?? null,
            result: 'success',
            metadata
        });
    }
}
