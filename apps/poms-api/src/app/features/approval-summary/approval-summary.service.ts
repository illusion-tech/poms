import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalSummaryFieldProjection, ApprovalSummarySnapshot } from './approval-summary.entity';
import {
    ApprovalSummaryFieldProjectionRepository,
    ApprovalSummaryPackageDefinitionRepository,
    ApprovalSummarySnapshotRepository
} from './approval-summary.repository';

export interface CreateApprovalSummaryFieldProjectionInput {
    fieldKey: string;
    visibilityLevel: string;
    maskingMode: string;
    exportPolicy?: string;
    fieldOrder?: number;
    channelScopeSummary?: string | null;
}

export interface CreateApprovalSummarySnapshotInput {
    targetType: string;
    targetId: string;
    approvalScenarioKey: string;
    summaryPackageKey: string;
    projectionLevel: string;
    exportPolicy: string;
    businessStatusAtSnapshot: string;
    supersedesId?: string | null;
    createdBy?: string | null;
    fieldProjections: CreateApprovalSummaryFieldProjectionInput[];
}

@Injectable()
export class ApprovalSummaryService {
    constructor(
        private readonly packageDefinitionRepository: ApprovalSummaryPackageDefinitionRepository,
        private readonly snapshotRepository: ApprovalSummarySnapshotRepository,
        private readonly fieldProjectionRepository: ApprovalSummaryFieldProjectionRepository
    ) {}

    async createSummarySnapshot(input: CreateApprovalSummarySnapshotInput): Promise<ApprovalSummarySnapshot> {
        if (input.fieldProjections.length === 0) {
            throw new BadRequestException('approval summary snapshot requires at least one field projection');
        }

        const definition = await this.packageDefinitionRepository.findActiveByScenarioAndPackage(
            input.approvalScenarioKey,
            input.summaryPackageKey
        );
        if (!definition) {
            throw new NotFoundException('active approval summary package definition not found');
        }
        if (definition.projectionLevel !== input.projectionLevel || definition.exportPolicy !== input.exportPolicy) {
            throw new BadRequestException('approval summary projection metadata does not match package definition');
        }

        const snapshot = this.snapshotRepository.create({
            targetType: input.targetType,
            targetId: input.targetId,
            approvalScenarioKey: input.approvalScenarioKey,
            summaryPackageId: definition.id,
            summaryPackageKey: definition.summaryPackageKey,
            projectionLevel: definition.projectionLevel,
            exportPolicy: definition.exportPolicy,
            businessStatusAtSnapshot: input.businessStatusAtSnapshot,
            supersedesId: input.supersedesId ?? null,
            createdBy: input.createdBy ?? null,
            updatedBy: input.createdBy ?? null
        });
        await this.snapshotRepository.save(snapshot);

        const projections = input.fieldProjections.map((field, index): ApprovalSummaryFieldProjection =>
            this.fieldProjectionRepository.create({
                summarySnapshotId: snapshot.id,
                fieldKey: field.fieldKey,
                visibilityLevel: field.visibilityLevel,
                maskingMode: field.maskingMode,
                exportPolicy: field.exportPolicy ?? definition.exportPolicy,
                fieldOrder: field.fieldOrder ?? index,
                channelScopeSummary: field.channelScopeSummary ?? null,
                createdBy: input.createdBy ?? null
            })
        );
        await this.fieldProjectionRepository.saveAll(projections);

        return snapshot;
    }
}
