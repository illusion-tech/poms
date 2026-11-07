import { EntityManager, EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import {
    AttachmentLinkStatusValue,
    AttachmentStatusValue,
    AttachmentTargetTypeValue,
    OpportunityStakeholderRoleValue,
    SalesFollowUpRecordStatusValue,
    type AttachmentCategory
} from '@poms/shared-contracts';
import { Attachment, AttachmentLink } from '../attachment/attachment.entity';
import { SalesFollowUpRecord } from '../sales-follow-up/sales-follow-up-record.entity';
import { CompetitorIntelligenceRecord, OpportunityStakeholder, SalesDiscoveryRecord } from '../sales-intelligence/sales-intelligence.entity';
import { EMPTY_LEAD_SCORE_V2_FACT_SUMMARY, type LeadScoreV2FactSummary } from './lead-scoring';

@Injectable()
export class LeadScoreFactsService {
    constructor(
        @InjectRepository(OpportunityStakeholder)
        private readonly stakeholderRepository: EntityRepository<OpportunityStakeholder>,
        @InjectRepository(CompetitorIntelligenceRecord)
        private readonly competitorRepository: EntityRepository<CompetitorIntelligenceRecord>,
        @InjectRepository(SalesDiscoveryRecord)
        private readonly discoveryRepository: EntityRepository<SalesDiscoveryRecord>,
        @InjectRepository(SalesFollowUpRecord)
        private readonly followUpRepository: EntityRepository<SalesFollowUpRecord>,
        @InjectRepository(Attachment)
        private readonly attachmentRepository: EntityRepository<Attachment>,
        @InjectRepository(AttachmentLink)
        private readonly attachmentLinkRepository: EntityRepository<AttachmentLink>
    ) {}

    async collectLeadScoreFacts(leadId: string, entityManager?: EntityManager): Promise<LeadScoreV2FactSummary> {
        const [salesIntelligence, followUp, attachmentEvidence] = await Promise.all([
            this.collectSalesIntelligenceFacts(leadId, entityManager),
            this.collectFollowUpFacts(leadId, entityManager),
            this.collectAttachmentEvidenceFacts(leadId, entityManager)
        ]);

        return {
            salesIntelligence,
            followUp,
            attachmentEvidence
        };
    }

    private async collectSalesIntelligenceFacts(leadId: string, entityManager?: EntityManager): Promise<LeadScoreV2FactSummary['salesIntelligence']> {
        const stakeholdersPromise = entityManager
            ? entityManager.find(OpportunityStakeholder, { leadId })
            : this.stakeholderRepository.find({ leadId });
        const competitorsPromise = entityManager
            ? entityManager.find(CompetitorIntelligenceRecord, { leadId })
            : this.competitorRepository.find({ leadId });
        const discoveryPromise = entityManager
            ? entityManager.findOne(SalesDiscoveryRecord, { leadId }, { orderBy: { updatedAt: QueryOrder.DESC } })
            : this.discoveryRepository.findOne({ leadId }, { orderBy: { updatedAt: QueryOrder.DESC } });

        const [stakeholders, competitors, discovery] = await Promise.all([stakeholdersPromise, competitorsPromise, discoveryPromise]);

        return {
            decisionMakerKnown: stakeholders.some((stakeholder) => stakeholder.role === OpportunityStakeholderRoleValue.DecisionMaker),
            technicalEvaluatorKnown: stakeholders.some((stakeholder) => stakeholder.role === OpportunityStakeholderRoleValue.TechnicalEvaluator),
            procurementProcessKnown: hasText(discovery?.procurementProcess),
            budgetSourceKnown: hasText(discovery?.budgetSource),
            competitorKnown: competitors.length > 0,
            painPointKnown: hasText(discovery?.customerPainPoints),
            nextContactKnown: hasText(discovery?.nextContactPlan) || stakeholders.some((stakeholder) => stakeholder.isPrimary)
        };
    }

    private async collectFollowUpFacts(leadId: string, entityManager?: EntityManager): Promise<LeadScoreV2FactSummary['followUp']> {
        const followUps = entityManager
            ? await entityManager.find(
                  SalesFollowUpRecord,
                  { leadId, status: SalesFollowUpRecordStatusValue.Active },
                  { orderBy: { occurredAt: QueryOrder.DESC } }
              )
            : await this.followUpRepository.find(
                  { leadId, status: SalesFollowUpRecordStatusValue.Active },
                  { orderBy: { occurredAt: QueryOrder.DESC } }
              );
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const nextFollowUpAt = followUps
            .map((record) => record.nextFollowUpAt)
            .filter((value): value is Date => value instanceof Date)
            .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
        const lastFollowUpAt = followUps[0]?.occurredAt ?? null;

        return {
            lastFollowUpAt: lastFollowUpAt?.toISOString() ?? null,
            daysSinceLastFollowUp: lastFollowUpAt ? Math.max(Math.floor((now.getTime() - lastFollowUpAt.getTime()) / (24 * 60 * 60 * 1000)), 0) : null,
            followUpCount30d: followUps.filter((record) => record.occurredAt >= thirtyDaysAgo).length,
            hasPlannedNextFollowUp: nextFollowUpAt !== null,
            nextFollowUpAt: nextFollowUpAt?.toISOString() ?? null,
            nextFollowUpOverdue: nextFollowUpAt ? nextFollowUpAt.getTime() < now.getTime() : false
        };
    }

    private async collectAttachmentEvidenceFacts(leadId: string, entityManager?: EntityManager): Promise<LeadScoreV2FactSummary['attachmentEvidence']> {
        const links = entityManager
            ? await entityManager.find(AttachmentLink, {
                  targetType: AttachmentTargetTypeValue.Lead,
                  targetId: leadId,
                  status: AttachmentLinkStatusValue.Active
              })
            : await this.attachmentLinkRepository.find({
                  targetType: AttachmentTargetTypeValue.Lead,
                  targetId: leadId,
                  status: AttachmentLinkStatusValue.Active
              });
        const attachmentIds = [...new Set(links.map((link) => link.attachmentId))];
        if (attachmentIds.length === 0) {
            return { ...EMPTY_LEAD_SCORE_V2_FACT_SUMMARY.attachmentEvidence };
        }

        const attachments = entityManager
            ? await entityManager.find(Attachment, {
                  id: { $in: attachmentIds },
                  status: AttachmentStatusValue.Active
              })
            : await this.attachmentRepository.find({
                  id: { $in: attachmentIds },
                  status: AttachmentStatusValue.Active
              });
        const latestOrFinalAttachments = attachments.filter((attachment) => attachment.isLatest || attachment.isFinal);
        const evidenceAttachments = latestOrFinalAttachments.filter((attachment) => isEvidenceCategory(attachment.category));

        return {
            evidenceAttachmentCount: evidenceAttachments.length,
            hasProposalAttachment: latestOrFinalAttachments.some((attachment) => isProposalCategory(attachment.category)),
            hasQuotationAttachment: latestOrFinalAttachments.some((attachment) => isQuotationCategory(attachment.category)),
            hasBudgetEvidenceAttachment: latestOrFinalAttachments.some((attachment) => isBudgetEvidenceCategory(attachment.category)),
            latestAttachmentCount: attachments.filter((attachment) => attachment.isLatest).length,
            finalAttachmentCount: attachments.filter((attachment) => attachment.isFinal).length
        };
    }
}

function hasText(value: string | null | undefined): boolean {
    return Boolean(value?.trim());
}

function isEvidenceCategory(category: AttachmentCategory): boolean {
    return isProposalCategory(category) || isQuotationCategory(category) || isBudgetEvidenceCategory(category);
}

function isProposalCategory(category: AttachmentCategory): boolean {
    const normalized = category.toLowerCase();
    return normalized.includes('proposal') || normalized.includes('solution') || normalized.includes('plan') || normalized.includes('方案');
}

function isQuotationCategory(category: AttachmentCategory): boolean {
    const normalized = category.toLowerCase();
    return normalized.includes('quotation') || normalized.includes('quote') || normalized.includes('报价');
}

function isBudgetEvidenceCategory(category: AttachmentCategory): boolean {
    const normalized = category.toLowerCase();
    return normalized.includes('budget') || normalized.includes('预算');
}
