import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
    ConfirmProjectHandoverParticipantConfirmationInput,
    ConfirmProjectHandoverRequest,
    ConfirmProjectHandoverResult,
    ProjectHandoverDetailView,
    ProjectHandoverParticipantConfirmationItem,
    RebaselineContractHandoverRequest,
    RebaselineContractHandoverResult
} from '@poms/shared-contracts';
import { randomUUID } from 'node:crypto';
import { ContractAmendmentRepository, ContractTermSnapshotRepository } from '../contract/contract.repository';
import { ContractService } from '../contract/contract.service';
import { ProjectHandoverQueryService } from './project-handover-query.service';
import {
    ContractHandoverRebaselineRecordRepository,
    HandoverBaselineImpactItemRepository,
    ProjectHandoverRepository,
    ProjectReceiptJudgmentFreezeRepository
} from './project-handover.repository';

const CONFIRM_PROJECT_HANDOVER_ACTION = 'confirm-project-handover';
const EXECUTION_OWNER_ROLE_KEY = 'execution-owner';
const REBASELINE_IMPACT_TYPE = 'handover-item';

@Injectable()
export class ProjectHandoverCommandService {
    constructor(
        private readonly projectHandoverRepository: ProjectHandoverRepository,
        private readonly projectHandoverQueryService: ProjectHandoverQueryService,
        private readonly contractAmendmentRepository: ContractAmendmentRepository,
        private readonly contractService: ContractService,
        private readonly contractTermSnapshotRepository: ContractTermSnapshotRepository,
        private readonly contractHandoverRebaselineRecordRepository: ContractHandoverRebaselineRecordRepository,
        private readonly handoverBaselineImpactItemRepository: HandoverBaselineImpactItemRepository,
        private readonly projectReceiptJudgmentFreezeRepository: ProjectReceiptJudgmentFreezeRepository
    ) {}

    async confirmProjectHandover(
        handoverId: string,
        actorUserId: string,
        input: ConfirmProjectHandoverRequest
    ): Promise<ConfirmProjectHandoverResult> {
        const handover = await this.projectHandoverRepository.findById(handoverId);
        if (!handover) {
            throw new NotFoundException(`ProjectHandover ${handoverId} not found`);
        }

        this.assertExpectedVersion(handover.rowVersion, input.expectedVersion, 'ProjectHandover');

        if (handover.status !== 'draft') {
            throw new BadRequestException(`ProjectHandover ${handoverId} is not in draft status`);
        }

        if (handover.contractSummarySnapshotId !== input.contractSummarySnapshotId) {
            throw new BadRequestException('Contract summary snapshot does not match the project handover record');
        }

        const detail = await this.projectHandoverQueryService.getProjectHandoverDetailByHandoverId(
            handoverId,
            {
                sub: actorUserId,
                username: 'project-handover-command',
                permissions: ['project:read', 'contract:finance:sensitive:read']
            },
            { path: `project-handover-command:${handoverId}`, method: 'COMMAND' }
        );
        this.assertConfirmableDetail(handoverId, handover, detail);
        this.assertParticipantConfirmations(
            detail.participantConfirmationSummary.participants,
            input.participantConfirmations
        );

        const now = new Date();
        handover.status = 'confirmed';
        handover.confirmedAt = now;
        handover.confirmedBy = actorUserId;
        handover.comment = input.comment?.trim() || null;
        handover.updatedBy = actorUserId;

        const receiptJudgmentFreeze = input.receiptJudgmentMode
            ? await this.prepareReceiptJudgmentFreeze(handover, actorUserId, input.receiptJudgmentMode)
            : null;

        if (receiptJudgmentFreeze) {
            await this.projectReceiptJudgmentFreezeRepository.saveWithHandover({
                handover,
                receiptJudgmentFreeze
            });
        } else {
            await this.projectHandoverRepository.save(handover);
        }

        return {
            targetId: handover.id,
            businessStatusAfter: 'confirmed',
            confirmationRecordId: detail.participantConfirmationSummary.confirmationRecordId,
            receiptJudgmentFreezeId: receiptJudgmentFreeze?.id ?? null,
            contractSummarySnapshotId: handover.contractSummarySnapshotId,
            effectiveHandoverBaselineSnapshotId: handover.effectiveHandoverBaselineSnapshotId,
            summarySnapshotId: handover.summarySnapshotId,
            projectionLevel: detail.projectionLevel,
            exportPolicy: detail.exportPolicy
        };
    }

    async rebaselineContractHandover(
        actorUserId: string,
        input: RebaselineContractHandoverRequest
    ): Promise<RebaselineContractHandoverResult> {
        this.assertUniqueAffectedHandoverItems(input.affectedHandoverItemIds);

        const amendment = await this.contractAmendmentRepository.findEffectiveById(input.contractAmendmentId);
        if (!amendment) {
            throw new BadRequestException(`ContractAmendment ${input.contractAmendmentId} is not effective`);
        }

        const contract = await this.contractService.findById(amendment.contractId);
        if (!contract) {
            throw new NotFoundException(`Contract ${amendment.contractId} not found`);
        }

        if (contract.status !== 'active') {
            throw new BadRequestException(`Contract ${contract.id} is not active`);
        }

        const handover = await this.projectHandoverRepository.findLatestConfirmedByProjectId(contract.projectId);
        if (!handover) {
            throw new BadRequestException(`Project ${contract.projectId} has no confirmed project handover`);
        }

        this.assertExpectedVersion(handover.rowVersion, input.expectedVersion, 'ProjectHandover');

        const existingEffectiveRecord = await this.contractHandoverRebaselineRecordRepository.findEffectiveByContractAmendmentId(
            input.contractAmendmentId
        );
        if (existingEffectiveRecord) {
            throw new ConflictException(`ContractAmendment ${input.contractAmendmentId} already has an effective handover rebaseline`);
        }

        const latestProjectRebaseline = await this.contractHandoverRebaselineRecordRepository.findLatestByProjectId(contract.projectId);
        if (latestProjectRebaseline && ['processing', 'pending_effective'].includes(latestProjectRebaseline.status)) {
            throw new BadRequestException(
                `Handover rebaseline record ${latestProjectRebaseline.id} is still ${latestProjectRebaseline.status}`
            );
        }

        const currentBaselineId =
            latestProjectRebaseline?.status === 'effective'
                ? latestProjectRebaseline.effectiveBaselineAfterId
                : handover.effectiveHandoverBaselineSnapshotId;

        if (currentBaselineId === input.effectiveBaselineAfterId) {
            throw new BadRequestException('Effective baseline after rebaseline must differ from the current handover baseline');
        }

        const baselineAfter = await this.contractTermSnapshotRepository.findById(input.effectiveBaselineAfterId);
        if (!baselineAfter || baselineAfter.snapshotStatus !== 'active' || baselineAfter.contractId !== contract.id) {
            throw new BadRequestException('Effective baseline after rebaseline must be an active contract term snapshot for the amendment contract');
        }

        const now = new Date();
        const rebaselineRecordId = randomUUID();
        const rebaselineRecord = this.contractHandoverRebaselineRecordRepository.create({
            id: rebaselineRecordId,
            contractAmendmentId: input.contractAmendmentId,
            projectId: contract.projectId,
            rebaselineReason: input.rebaselineReason.trim(),
            effectiveBaselineAfterId: input.effectiveBaselineAfterId,
            status: 'effective',
            handledAt: now,
            handledBy: actorUserId,
            supersedesId: latestProjectRebaseline?.status === 'effective' ? latestProjectRebaseline.id : null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });

        const impactItems = input.affectedHandoverItemIds.map((affectedHandoverItemId) =>
            this.handoverBaselineImpactItemRepository.create({
                rebaselineRecordId: rebaselineRecord.id,
                affectedHandoverItemId,
                impactType: REBASELINE_IMPACT_TYPE,
                impactSummary: input.rebaselineReason.trim(),
                supersedesBaselineId: currentBaselineId,
                createdBy: actorUserId
            })
        );

        if (latestProjectRebaseline?.status === 'effective') {
            latestProjectRebaseline.status = 'superseded';
            latestProjectRebaseline.updatedBy = actorUserId;
        }

        handover.handoverRebaselineRecordId = rebaselineRecord.id;
        handover.updatedBy = actorUserId;

        await this.contractHandoverRebaselineRecordRepository.saveWithImpactsAndHandover({
            rebaselineRecord,
            impactItems,
            handover,
            supersededRecord: latestProjectRebaseline?.status === 'superseded' ? latestProjectRebaseline : null
        });

        return {
            targetId: rebaselineRecord.id,
            rebaselineRecordId: rebaselineRecord.id,
            effectiveBaselineAfterId: rebaselineRecord.effectiveBaselineAfterId,
            resultStatus: 'effective'
        };
    }

    private async prepareReceiptJudgmentFreeze(
        handover: {
            id: string;
            projectId: string;
            summarySnapshotId: string;
            handoverRebaselineRecordId?: string | null;
        },
        actorUserId: string,
        receiptJudgmentMode: string
    ) {
        const existingFreeze = await this.projectReceiptJudgmentFreezeRepository.findCurrentByProjectId(handover.projectId);
        if (existingFreeze) {
            throw new ConflictException(`Project ${handover.projectId} already has a current receipt judgment freeze`);
        }

        return this.projectReceiptJudgmentFreezeRepository.create({
            projectId: handover.projectId,
            receiptJudgmentMode: receiptJudgmentMode.trim(),
            sourceType: 'project-handover',
            sourceId: handover.id,
            sourceHandoverId: handover.id,
            sourceHandoverSummarySnapshotId: handover.summarySnapshotId,
            sourceHandoverRebaselineRecordId: handover.handoverRebaselineRecordId ?? null,
            isCurrent: true,
            frozenAt: new Date(),
            frozenBy: actorUserId,
            supersedesId: null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        });
    }

    private assertConfirmableDetail(
        handoverId: string,
        handover: {
            contractSummarySnapshotId: string;
            effectiveHandoverBaselineSnapshotId: string;
            summarySnapshotId: string;
        },
        detail: ProjectHandoverDetailView
    ): asserts detail is ProjectHandoverDetailView & {
        handoverId: string;
        contractSummarySnapshotId: string;
        summarySnapshotId: string;
        projectionLevel: string;
        exportPolicy: string;
        participantConfirmationSummary: ProjectHandoverDetailView['participantConfirmationSummary'] & {
            confirmationRecordId: string;
        };
    } {
        if (detail.handoverId !== handoverId) {
            throw new BadRequestException('Project handover detail does not match the requested handover');
        }

        if (detail.handoverStatus !== 'draft') {
            throw new BadRequestException(`ProjectHandover ${handoverId} is not confirmable`);
        }

        if (detail.blockingReasons.length > 0 || !detail.allowedActions.includes(CONFIRM_PROJECT_HANDOVER_ACTION)) {
            throw new BadRequestException(`ProjectHandover ${handoverId} is blocked: ${detail.blockingReasons.join('; ')}`);
        }

        if (detail.contractSummarySnapshotId !== handover.contractSummarySnapshotId) {
            throw new BadRequestException('Contract summary snapshot detail is stale');
        }

        if (detail.summarySnapshotId !== handover.summarySnapshotId || !detail.projectionLevel || !detail.exportPolicy) {
            throw new BadRequestException('Project handover summary snapshot is not available');
        }

        if (
            detail.currentHandoverBaselineSummary.status !== 'available' ||
            detail.currentHandoverBaselineSummary.baselineSnapshotId !== handover.effectiveHandoverBaselineSnapshotId
        ) {
            throw new BadRequestException('Effective handover baseline snapshot is not available or does not match');
        }

        if (detail.participantConfirmationSummary.status !== 'confirmed' || !detail.participantConfirmationSummary.confirmationRecordId) {
            throw new BadRequestException('Project handover participant confirmation is not complete');
        }
    }

    private assertParticipantConfirmations(
        persistedParticipants: ProjectHandoverParticipantConfirmationItem[],
        inputParticipants: ConfirmProjectHandoverParticipantConfirmationInput[]
    ): void {
        if (persistedParticipants.length === 0) {
            throw new BadRequestException('Project handover participant confirmation is not prepared');
        }

        const persistedKeys = new Set(persistedParticipants.map((participant) => this.participantKey(participant)));
        const inputKeys = new Set<string>();

        for (const inputParticipant of inputParticipants) {
            const key = this.participantKey(inputParticipant);
            if (inputKeys.has(key)) {
                throw new BadRequestException(`Duplicate participant confirmation ${key}`);
            }
            inputKeys.add(key);
        }

        for (const participant of persistedParticipants) {
            if (participant.participantStatus !== 'confirmed') {
                throw new BadRequestException(`Project handover participant ${participant.participantId} is not confirmed`);
            }

            if (!inputKeys.has(this.participantKey(participant))) {
                throw new BadRequestException(`Project handover participant ${participant.participantId} is missing from request`);
            }
        }

        for (const key of inputKeys) {
            if (!persistedKeys.has(key)) {
                throw new BadRequestException(`Project handover participant ${key} is not part of the confirmation record`);
            }
        }

        const executionOwnerConfirmed = persistedParticipants.some(
            (participant) => participant.participantRoleKey === EXECUTION_OWNER_ROLE_KEY && participant.participantStatus === 'confirmed'
        );
        if (!executionOwnerConfirmed) {
            throw new BadRequestException('Project handover execution owner is not confirmed');
        }
    }

    private participantKey(participant: {
        participantId: string;
        participantRoleKey: string;
    }): string {
        return `${participant.participantId}:${participant.participantRoleKey}`;
    }

    private assertUniqueAffectedHandoverItems(affectedHandoverItemIds: string[]): void {
        const uniqueIds = new Set(affectedHandoverItemIds);
        if (uniqueIds.size !== affectedHandoverItemIds.length) {
            throw new BadRequestException('Affected handover item IDs must be unique');
        }
    }

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}
