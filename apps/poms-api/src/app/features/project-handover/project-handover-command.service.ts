import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
    ConfirmProjectHandoverParticipantConfirmationInput,
    ConfirmProjectHandoverRequest,
    ConfirmProjectHandoverResult,
    ProjectHandoverDetailView,
    ProjectHandoverParticipantConfirmationItem
} from '@poms/shared-contracts';
import { ProjectHandoverQueryService } from './project-handover-query.service';
import { ProjectHandoverRepository } from './project-handover.repository';

const CONFIRM_PROJECT_HANDOVER_ACTION = 'confirm-project-handover';
const EXECUTION_OWNER_ROLE_KEY = 'execution-owner';

@Injectable()
export class ProjectHandoverCommandService {
    constructor(
        private readonly projectHandoverRepository: ProjectHandoverRepository,
        private readonly projectHandoverQueryService: ProjectHandoverQueryService
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

        const detail = await this.projectHandoverQueryService.getProjectHandoverDetailByHandoverId(handoverId);
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

        await this.projectHandoverRepository.save(handover);

        return {
            targetId: handover.id,
            businessStatusAfter: 'confirmed',
            confirmationRecordId: detail.participantConfirmationSummary.confirmationRecordId,
            contractSummarySnapshotId: handover.contractSummarySnapshotId,
            effectiveHandoverBaselineSnapshotId: handover.effectiveHandoverBaselineSnapshotId,
            summarySnapshotId: handover.summarySnapshotId,
            projectionLevel: detail.projectionLevel,
            exportPolicy: detail.exportPolicy
        };
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

    private assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }
}
