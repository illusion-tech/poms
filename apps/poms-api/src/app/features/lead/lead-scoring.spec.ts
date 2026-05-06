import { LeadBudgetStatusValue, LeadRatingValue, LeadStatusValue, LeadUrgencyValue } from '@poms/shared-contracts';
import { buildLeadScoreComponentBreakdown, calculateLeadScore, EMPTY_LEAD_SCORE_V2_FACT_SUMMARY, LEAD_SCORE_FORMULA_VERSION, type LeadGateInput, type LeadScoreV2FactSummary } from './lead-scoring';

describe('lead scoring v2', () => {
    const completeLead: LeadGateInput = {
        sourceId: '51000000-0000-4000-8000-000000000001',
        demandDescription: '客户需要建设跨站点设备运维平台，覆盖故障预警、巡检调度、预算审批和年度改造计划。',
        budgetStatus: LeadBudgetStatusValue.BudgetApproved,
        estimatedAmount: '1200000.00',
        urgency: LeadUrgencyValue.High,
        expectedDecisionDate: '2026-06-01',
        ownerUserId: '00000000-0000-4000-8000-000000000003',
        ownerOrgId: '10000000-0000-4000-8000-000000000002',
        status: LeadStatusValue.Registered,
        convertedProjectId: null
    };

    const completeFacts: LeadScoreV2FactSummary = {
        salesIntelligence: {
            decisionMakerKnown: true,
            technicalEvaluatorKnown: true,
            procurementProcessKnown: true,
            budgetSourceKnown: true,
            competitorKnown: true,
            painPointKnown: true,
            nextContactKnown: true
        },
        followUp: {
            lastFollowUpAt: '2026-05-05T00:00:00.000Z',
            daysSinceLastFollowUp: 2,
            followUpCount30d: 3,
            hasPlannedNextFollowUp: true,
            nextFollowUpAt: '2026-05-08T00:00:00.000Z',
            nextFollowUpOverdue: false
        },
        attachmentEvidence: {
            evidenceAttachmentCount: 3,
            hasProposalAttachment: true,
            hasQuotationAttachment: true,
            hasBudgetEvidenceAttachment: true,
            latestAttachmentCount: 3,
            finalAttachmentCount: 1
        }
    };

    it('calculates weighted v2 score components from structured facts', () => {
        const snapshot = calculateLeadScore(completeLead, completeFacts);

        expect(snapshot).toEqual(
            expect.objectContaining({
                score: 100,
                rating: LeadRatingValue.A,
                scoreReason: '基础商务+65；销售情报+20；跟进活跃+10；附件证据+5'
            })
        );
        expect(snapshot.componentBreakdown).toEqual(
            expect.objectContaining({
                formulaVersion: LEAD_SCORE_FORMULA_VERSION,
                baseBusiness: 65,
                salesIntelligence: 20,
                followUpActivity: 10,
                attachmentEvidence: 5,
                total: 100
            })
        );
    });

    it('keeps snapshot facts as booleans and counters rather than raw notes', () => {
        const breakdown = buildLeadScoreComponentBreakdown(completeLead, completeFacts);

        expect(breakdown.salesIntelligenceFacts).toEqual(completeFacts.salesIntelligence);
        expect(breakdown.followUpFacts).toEqual(completeFacts.followUp);
        expect(breakdown.attachmentFacts).toEqual(completeFacts.attachmentEvidence);
        expect(JSON.stringify(breakdown)).not.toContain('客户需要建设跨站点设备运维平台');
    });

    it('falls back to base business score when no cross-module facts exist', () => {
        const snapshot = calculateLeadScore(completeLead, EMPTY_LEAD_SCORE_V2_FACT_SUMMARY);

        expect(snapshot.score).toBe(65);
        expect(snapshot.rating).toBe(LeadRatingValue.B);
        expect(snapshot.componentBreakdown.salesIntelligence).toBe(0);
        expect(snapshot.componentBreakdown.followUpActivity).toBe(0);
        expect(snapshot.componentBreakdown.attachmentEvidence).toBe(0);
    });
});
