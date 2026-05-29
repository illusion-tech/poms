import { LeadEffectiveScoreSourceValue, type DictionaryItemSummary, type LeadAllowedAction, type LeadDetailView, type LeadListView, type LeadSummary } from '@poms/shared-contracts';
import { toBusinessDateOnly } from '../../core/date/business-date.utils';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import type { ActiveLeadScoreOverride } from './lead-score.service';
import { buildLeadGateSummary } from './lead-scoring';

export function mapLeadToSummary(lead: Lead, source: DictionaryItemSummary | null = null, activeScoreOverride: ActiveLeadScoreOverride | null = null): LeadSummary {
    const effectiveScore = resolveEffectiveScore(lead, activeScoreOverride);

    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceCode: lead.sourceCode,
        sourceName: source?.name ?? null,
        demandDescription: lead.demandDescription ?? null,
        budgetStatus: lead.budgetStatus,
        estimatedAmount: lead.estimatedAmount ?? null,
        urgency: lead.urgency,
        expectedDecisionDate: toBusinessDateOnly(lead.expectedDecisionDate),
        score: lead.score,
        rating: lead.rating,
        scoreReason: lead.scoreReason,
        scoreUpdatedAt: lead.scoreUpdatedAt.toISOString(),
        effectiveScore: effectiveScore.effectiveScore,
        effectiveRating: effectiveScore.effectiveRating,
        effectiveScoreReason: effectiveScore.effectiveScoreReason,
        effectiveScoreSource: effectiveScore.effectiveScoreSource,
        activeScoreOverrideId: effectiveScore.activeScoreOverrideId,
        gateSummary: buildLeadGateSummary(lead),
        status: lead.status,
        ownerOrgId: lead.ownerOrgId ?? null,
        ownerUserId: lead.ownerUserId ?? null,
        qualificationSummary: lead.qualificationSummary ?? null,
        qualifiedAt: lead.qualifiedAt?.toISOString() ?? null,
        qualifiedBy: lead.qualifiedBy ?? null,
        closedReason: lead.closedReason ?? null,
        closedAt: lead.closedAt?.toISOString() ?? null,
        closedBy: lead.closedBy ?? null,
        convertedProjectId: lead.convertedProjectId ?? null,
        convertedAt: lead.convertedAt?.toISOString() ?? null,
        convertedBy: lead.convertedBy ?? null,
        rowVersion: lead.rowVersion,
        createdAt: lead.createdAt.toISOString(),
        createdBy: lead.createdBy ?? null,
        updatedAt: lead.updatedAt.toISOString(),
        updatedBy: lead.updatedBy ?? null
    };
}

export function mapLeadToListView(
    lead: Lead,
    source: DictionaryItemSummary | null,
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null,
    convertedProject: Project | null,
    activeScoreOverride: ActiveLeadScoreOverride | null,
    allowedActions: LeadAllowedAction[] = []
): LeadListView {
    const effectiveScore = resolveEffectiveScore(lead, activeScoreOverride);

    return {
        id: lead.id,
        leadNo: lead.leadNo,
        leadName: lead.leadName,
        customerId: lead.customerId,
        customerName: lead.customerName,
        sourceCode: lead.sourceCode,
        sourceName: source?.name ?? null,
        demandDescription: lead.demandDescription ?? null,
        budgetStatus: lead.budgetStatus,
        estimatedAmount: lead.estimatedAmount ?? null,
        urgency: lead.urgency,
        expectedDecisionDate: toBusinessDateOnly(lead.expectedDecisionDate),
        score: lead.score,
        rating: lead.rating,
        scoreReason: lead.scoreReason,
        scoreUpdatedAt: lead.scoreUpdatedAt.toISOString(),
        effectiveScore: effectiveScore.effectiveScore,
        effectiveRating: effectiveScore.effectiveRating,
        effectiveScoreReason: effectiveScore.effectiveScoreReason,
        effectiveScoreSource: effectiveScore.effectiveScoreSource,
        activeScoreOverrideId: effectiveScore.activeScoreOverrideId,
        gateSummary: buildLeadGateSummary(lead),
        status: lead.status,
        ownerOrgId: lead.ownerOrgId ?? null,
        ownerUserId: lead.ownerUserId ?? null,
        ownerName: owner?.displayName ?? null,
        ownerOrgName: ownerOrg?.name ?? null,
        qualifiedAt: lead.qualifiedAt?.toISOString() ?? null,
        convertedProjectId: lead.convertedProjectId ?? null,
        convertedAt: lead.convertedAt?.toISOString() ?? null,
        convertedProjectSummary: mapConvertedProjectSummary(convertedProject),
        rowVersion: lead.rowVersion,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        allowedActions
    };
}

export function mapLeadToDetailView(
    lead: Lead,
    source: DictionaryItemSummary | null,
    owner: PlatformUser | null,
    ownerOrg: OrgUnit | null,
    convertedProject: Project | null,
    activeScoreOverride: ActiveLeadScoreOverride | null,
    allowedActions: LeadAllowedAction[] = []
): LeadDetailView {
    return {
        ...mapLeadToSummary(lead, source, activeScoreOverride),
        ownerName: owner?.displayName ?? null,
        ownerOrgName: ownerOrg?.name ?? null,
        sourceSummary: source?.name ? `来源：${source.name}` : null,
        convertedProjectSummary: mapConvertedProjectSummary(convertedProject),
        allowedActions
    };
}

function mapConvertedProjectSummary(convertedProject: Project | null): LeadDetailView['convertedProjectSummary'] {
    return convertedProject
        ? {
              id: convertedProject.id,
              projectNo: convertedProject.projectNo,
              projectName: convertedProject.projectName,
              customerId: convertedProject.customerId ?? null,
              status: convertedProject.status,
              currentStage: convertedProject.currentStage
          }
        : null;
}

function resolveEffectiveScore(lead: Pick<Lead, 'score' | 'rating' | 'scoreReason'>, activeScoreOverride: ActiveLeadScoreOverride | null): Pick<LeadSummary, 'effectiveScore' | 'effectiveRating' | 'effectiveScoreReason' | 'effectiveScoreSource' | 'activeScoreOverrideId'> {
    if (activeScoreOverride) {
        return {
            effectiveScore: activeScoreOverride.requestedScore,
            effectiveRating: activeScoreOverride.requestedRating,
            effectiveScoreReason: `人工覆盖评分：${activeScoreOverride.reason}`,
            effectiveScoreSource: LeadEffectiveScoreSourceValue.ManualOverride,
            activeScoreOverrideId: activeScoreOverride.id
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
