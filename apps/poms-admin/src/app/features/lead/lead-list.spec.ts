import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import {
    AuditHistoryStore,
    AttachmentStore,
    AuthStore,
    BusinessDiscussionStore,
    CustomerStatus,
    CustomerStore,
    DictionaryStore,
    LeadAllowedAction,
    LeadBudgetStatus,
    LeadEffectiveScoreSource,
    LeadGateMissingItem,
    LeadGateStatus,
    LeadOwnershipScope,
    LeadRating,
    LeadScoreOverrideStatus,
    LeadScoreSnapshotKind,
    LeadSourceStatus,
    LeadStatus,
    LeadStore,
    LeadUrgency,
    PlatformStore,
    ProjectStage,
    ProjectStatus,
    SalesIntelligenceStore,
    SalesFollowUpOutcome,
    SalesFollowUpRecordLifecycleScope,
    SalesFollowUpRecordStatus,
    SalesFollowUpStore,
    type AttachmentSummary,
    type BusinessDiscussionCommentSummary,
    type CompetitorIntelligenceRecordSummary,
    type CustomerContactSummary,
    type CustomerListView,
    type LeadDetailView,
    type LeadListView,
    type LeadScoreHistoryView,
    type LeadScoreOverrideSummary,
    type LeadSourceSummary,
    type OwnerReferenceOrgUnit,
    type OwnerReferenceUser,
    type ProjectSummary,
    type OpportunityStakeholderSummary,
    type SalesDiscoveryRecordSummary,
    type SalesFollowUpRecordSummary,
    type SalesIntelligenceGapSummary,
    type SanitizedUserWithOrgUnits
} from '@poms/admin-data-access';
import { BehaviorSubject } from 'rxjs';
import { AuditHistoryPanel } from '../../shared/ui/audit-history-panel';
import { AttachmentPanel } from '../../shared/ui/attachment-panel';
import { BusinessDiscussionPanel } from '../../shared/ui/business-discussion-panel';
import { SalesFollowUpPanel } from '../../shared/ui/sales-follow-up-panel';
import { SalesIntelligencePanel } from '../../shared/ui/sales-intelligence-panel';
import { LeadList } from './lead-list';

function createCustomer(overrides: Partial<CustomerListView> = {}): CustomerListView {
    return {
        id: 'customer-1',
        customerNo: 'CUST-2026-001',
        displayName: '华南地铁集团',
        legalName: null,
        shortName: null,
        status: CustomerStatus.Active,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        sourceChannel: null,
        remark: null,
        mergedIntoCustomerId: null,
        leadCount: 1,
        projectCount: 1,
        contractCount: 0,
        rowVersion: 1,
        createdAt: '2026-04-25T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createLead(overrides: Partial<LeadListView> = {}): LeadListView {
    return {
        id: 'lead-1',
        leadNo: 'L-2026-001',
        leadName: '华南地铁线索',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        sourceId: 'source-1',
        sourceName: '客户拜访',
        sourceChannel: '客户拜访',
        demandDescription: '客户计划建设地铁运维数字化平台。',
        budgetStatus: LeadBudgetStatus.BudgetConfirmed,
        estimatedAmount: '1000000.00',
        urgency: LeadUrgency.High,
        expectedDecisionDate: '2026-05-01',
        score: 95,
        rating: LeadRating.A,
        scoreReason: '来源+10；需求+15；预算+20；金额+15；紧迫+15；决策日期+10；主责+10',
        scoreUpdatedAt: '2026-04-25T10:00:00.000Z',
        effectiveScore: 95,
        effectiveRating: LeadRating.A,
        effectiveScoreReason: '来源+10；需求+15；预算+20；金额+15；紧迫+15；决策日期+10；主责+10',
        effectiveScoreSource: LeadEffectiveScoreSource.System,
        activeScoreOverrideId: null,
        gateSummary: {
            qualification: {
                status: LeadGateStatus.Ready,
                missingItems: [],
                explanation: '已满足确认有效硬闸口'
            },
            conversion: {
                status: LeadGateStatus.Blocked,
                missingItems: [LeadGateMissingItem.QualifiedStatus],
                explanation: '缺少：已确认有效状态'
            }
        },
        status: LeadStatus.Registered,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        qualifiedAt: null,
        convertedProjectId: null,
        rowVersion: 1,
        createdAt: '2026-04-25T09:00:00.000Z',
        updatedAt: '2026-04-25T10:00:00.000Z',
        allowedActions: [LeadAllowedAction.AssignLeadOwner],
        ...overrides
    };
}

function readyConversionGate(): LeadListView['gateSummary'] {
    return {
        qualification: {
            status: LeadGateStatus.Blocked,
            missingItems: [LeadGateMissingItem.RegisteredStatus],
            explanation: '缺少：待确认状态'
        },
        conversion: {
            status: LeadGateStatus.Ready,
            missingItems: [],
            explanation: '已满足转项目硬闸口'
        }
    };
}

function blockedConversionGate(): LeadListView['gateSummary'] {
    return {
        qualification: {
            status: LeadGateStatus.Blocked,
            missingItems: [LeadGateMissingItem.RegisteredStatus],
            explanation: '缺少：待确认状态'
        },
        conversion: {
            status: LeadGateStatus.Blocked,
            missingItems: [LeadGateMissingItem.Budget],
            explanation: '缺少：预算情况'
        }
    };
}

function createLeadSource(overrides: Partial<LeadSourceSummary> = {}): LeadSourceSummary {
    return {
        id: 'source-1',
        code: 'customer-visit',
        name: '客户拜访',
        description: '客户现场拜访',
        status: LeadSourceStatus.Active,
        sortOrder: 10,
        usageCount: 1,
        rowVersion: 1,
        createdAt: '2026-04-25T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createLeadDetail(overrides: Partial<LeadDetailView> = {}): LeadDetailView {
    const base = createLead(overrides);
    return {
        ...base,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        qualificationSummary: null,
        qualifiedBy: null,
        closedReason: null,
        closedAt: null,
        closedBy: null,
        convertedAt: null,
        convertedBy: null,
        rowVersion: 1,
        createdBy: 'user-1',
        updatedBy: 'user-1',
        sourceSummary: '客户拜访',
        convertedProjectSummary: null,
        ...overrides
    };
}

function createScoreOverride(overrides: Partial<LeadScoreOverrideSummary> = {}): LeadScoreOverrideSummary {
    return {
        id: 'override-1',
        leadId: 'lead-1',
        requestedScore: 88,
        requestedRating: LeadRating.B,
        reason: '主管判断关键关系已明确，优先级高于系统评分。',
        status: LeadScoreOverrideStatus.Pending,
        systemScoreAtRequest: 70,
        systemRatingAtRequest: LeadRating.C,
        requestedBy: 'user-1',
        requestedAt: '2026-04-25T11:00:00.000Z',
        approvedBy: null,
        approvedAt: null,
        approvalNote: null,
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
        revokedBy: null,
        revokedAt: null,
        revokeReason: null,
        supersededById: null,
        rowVersion: 3,
        ...overrides
    };
}

function createScoreHistory(overrides: Partial<LeadScoreHistoryView> = {}): LeadScoreHistoryView {
    const pendingOverride = createScoreOverride();
    return {
        leadId: 'lead-1',
        systemScore: 70,
        systemRating: LeadRating.C,
        scoreReason: '来源+10；需求+10；预算+10；金额+10；紧迫+10；主责+10',
        scoreUpdatedAt: '2026-04-25T10:00:00.000Z',
        effectiveScore: 70,
        effectiveRating: LeadRating.C,
        effectiveScoreReason: '来源+10；需求+10；预算+10；金额+10；紧迫+10；主责+10',
        effectiveScoreSource: LeadEffectiveScoreSource.System,
        activeScoreOverrideId: null,
        activeOverride: null,
        pendingOverride,
        snapshots: [
            {
                id: 'snapshot-1',
                leadId: 'lead-1',
                snapshotKind: LeadScoreSnapshotKind.System,
                overrideId: null,
                formulaVersion: 'lead-score-v1',
                systemScore: 70,
                systemRating: LeadRating.C,
                effectiveScore: 70,
                effectiveRating: LeadRating.C,
                effectiveScoreSource: LeadEffectiveScoreSource.System,
                scoreReason: '来源+10；需求+10；预算+10；金额+10；紧迫+10；主责+10',
                componentBreakdown: {},
                gateSummarySnapshot: readyConversionGate(),
                sourceCommand: 'update',
                sourceRecordId: null,
                createdAt: '2026-04-25T10:00:00.000Z',
                createdBy: 'user-1'
            }
        ],
        overrides: [pendingOverride],
        ...overrides
    };
}

function createProjectSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁项目',
        sourceLeadId: 'lead-1',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        customerProjectNo: null,
        status: ProjectStatus.Active,
        currentStage: ProjectStage.Assessment,
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 1,
        createdAt: '2026-04-25T10:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T10:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createFollowUp(overrides: Partial<SalesFollowUpRecordSummary> = {}): SalesFollowUpRecordSummary {
    return {
        id: 'follow-up-1',
        customerId: 'customer-1',
        customerName: '华南地铁集团',
        leadId: 'lead-1',
        leadName: '华南地铁线索',
        projectId: null,
        projectName: null,
        followUpType: 'meeting',
        status: SalesFollowUpRecordStatus.Active,
        occurredAt: '2026-04-25T10:00:00.000Z',
        summary: '完成预算口径确认',
        detail: '客户确认预算口径，等待内部排期。',
        outcome: SalesFollowUpOutcome.Progress,
        nextFollowUpAt: '2026-04-26T02:00:00.000Z',
        ownerOrgId: 'org-1',
        ownerOrgName: '华南销售一部',
        ownerUserId: 'user-1',
        ownerName: '张销售',
        supersedesId: null,
        replacedById: null,
        replacementReason: null,
        voidedAt: null,
        voidedBy: null,
        voidedByName: null,
        voidReason: null,
        rowVersion: 1,
        createdAt: '2026-04-25T10:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-25T10:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createPlatformUser(overrides: Partial<OwnerReferenceUser> = {}): OwnerReferenceUser {
    return {
        id: 'user-1',
        displayName: '张销售',
        isActive: true,
        primaryOrgUnitId: 'org-1',
        primaryOrgUnitName: '华南销售一部',
        ...overrides
    };
}

function createOrgUnit(overrides: Partial<OwnerReferenceOrgUnit> = {}): OwnerReferenceOrgUnit {
    return {
        id: 'org-1',
        name: '华南销售一部',
        code: 'SALES-SOUTH-1',
        isActive: true,
        ...overrides
    };
}

describe('LeadList', () => {
    let fixture: ComponentFixture<LeadList>;
    let component: LeadList;
    let leads: ReturnType<typeof signal<LeadListView[]>>;
    let leadSources: ReturnType<typeof signal<LeadSourceSummary[]>>;
    let selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
    let followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
    let canWriteLead: ReturnType<typeof signal<boolean>>;
    let canAssignLead: ReturnType<typeof signal<boolean>>;
    let canOverrideLeadScore: ReturnType<typeof signal<boolean>>;
    let queryParamMap: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
    let routerMock: { navigate: jest.Mock };
    let ownerUsers: ReturnType<typeof signal<OwnerReferenceUser[]>>;
    let ownerOrgUnits: ReturnType<typeof signal<OwnerReferenceOrgUnit[]>>;
    let customers: ReturnType<typeof signal<CustomerListView[]>>;
    let leadStoreMock: {
        leads: ReturnType<typeof signal<LeadListView[]>>;
        leadSources: ReturnType<typeof signal<LeadSourceSummary[]>>;
        selectedLead: ReturnType<typeof signal<LeadDetailView | null>>;
        loading: ReturnType<typeof signal<boolean>>;
        loadingSources: ReturnType<typeof signal<boolean>>;
        loadingDetail: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loadedSources: ReturnType<typeof signal<boolean>>;
        registeredLeadCount: ReturnType<typeof computed<number>>;
        qualifiedLeadCount: ReturnType<typeof computed<number>>;
        convertedLeadCount: ReturnType<typeof computed<number>>;
        closedLeadCount: ReturnType<typeof computed<number>>;
        loadLeads: jest.Mock;
        loadLeadSources: jest.Mock;
        loadLead: jest.Mock;
        createLead: jest.Mock;
        updateLead: jest.Mock;
        createLeadSource: jest.Mock;
        updateLeadSource: jest.Mock;
        qualifyLead: jest.Mock;
        closeLead: jest.Mock;
        convertLeadToProject: jest.Mock;
        claimLeadOwner: jest.Mock;
        assignLeadOwner: jest.Mock;
        loadLeadScoreHistory: jest.Mock;
        submitLeadScoreOverride: jest.Mock;
        approveLeadScoreOverride: jest.Mock;
        rejectLeadScoreOverride: jest.Mock;
        revokeLeadScoreOverride: jest.Mock;
        clearSelectedLead: jest.Mock;
    };
    let platformStoreMock: {
        ownerUsers: ReturnType<typeof signal<OwnerReferenceUser[]>>;
        ownerOrgUnits: ReturnType<typeof signal<OwnerReferenceOrgUnit[]>>;
        loadingOwnerReferenceData: ReturnType<typeof signal<boolean>>;
        loadedOwnerReferenceData: ReturnType<typeof signal<boolean>>;
        loadOwnerReferenceData: jest.Mock;
    };
    let customerStoreMock: {
        activeCustomers: ReturnType<typeof computed<CustomerListView[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadCustomers: jest.Mock;
    };
    let attachmentStoreMock: {
        attachments: ReturnType<typeof signal<AttachmentSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadAttachments: jest.Mock;
        uploadAttachment: jest.Mock;
        voidAttachment: jest.Mock;
        downloadAttachment: jest.Mock;
        clearAttachments: jest.Mock;
    };
    let salesFollowUpStoreMock: {
        followUps: ReturnType<typeof signal<SalesFollowUpRecordSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadFollowUps: jest.Mock;
        createFollowUp: jest.Mock;
        replaceFollowUp: jest.Mock;
        voidFollowUp: jest.Mock;
        clearFollowUps: jest.Mock;
    };
    let salesIntelligenceStoreMock: {
        contacts: ReturnType<typeof signal<CustomerContactSummary[]>>;
        stakeholders: ReturnType<typeof signal<OpportunityStakeholderSummary[]>>;
        competitors: ReturnType<typeof signal<CompetitorIntelligenceRecordSummary[]>>;
        discoveryRecords: ReturnType<typeof signal<SalesDiscoveryRecordSummary[]>>;
        gaps: ReturnType<typeof signal<SalesIntelligenceGapSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadContext: jest.Mock;
        clearContext: jest.Mock;
    };
    let businessDiscussionStoreMock: {
        comments: ReturnType<typeof signal<BusinessDiscussionCommentSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadComments: jest.Mock;
        createComment: jest.Mock;
        clearComments: jest.Mock;
    };
    let getComputedStyleSpy: jest.SpyInstance;

    beforeEach(async () => {
        getComputedStyleSpy = jest.spyOn(window, 'getComputedStyle').mockImplementation(
            () =>
                new Proxy(
                    {
                        display: 'block',
                        visibility: 'visible',
                        getPropertyValue: () => ''
                    },
                    {
                        get: (target, property) => {
                            if (property in target) {
                                return target[property as keyof typeof target];
                            }
                            return '';
                        }
                    }
                ) as unknown as CSSStyleDeclaration
        );

        leads = signal([createLead()]);
        leadSources = signal([createLeadSource(), createLeadSource({ id: 'source-2', code: 'customer-referral', name: '老客户转介绍', usageCount: 0 })]);
        selectedLead = signal<LeadDetailView | null>(null);
        followUps = signal<SalesFollowUpRecordSummary[]>([createFollowUp()]);
        canWriteLead = signal(true);
        canAssignLead = signal(true);
        canOverrideLeadScore = signal(true);
        queryParamMap = new BehaviorSubject(convertToParamMap({}));
        ownerUsers = signal<OwnerReferenceUser[]>([createPlatformUser(), createPlatformUser({ id: 'user-2', displayName: '李经理', primaryOrgUnitId: 'org-2', primaryOrgUnitName: '华东销售部' })]);
        ownerOrgUnits = signal<OwnerReferenceOrgUnit[]>([createOrgUnit(), createOrgUnit({ id: 'org-2', name: '华东销售部', code: 'SALES-EAST' })]);
        customers = signal<CustomerListView[]>([createCustomer(), createCustomer({ id: 'customer-2', customerNo: 'CUST-2026-002', displayName: '城市交通集团' })]);
        routerMock = { navigate: jest.fn() };
        leadStoreMock = {
            leads,
            leadSources,
            selectedLead,
            loading: signal(false),
            loadingSources: signal(false),
            loadingDetail: signal(false),
            saving: signal(false),
            loadedSources: signal(true),
            registeredLeadCount: computed(() => leads().filter((lead) => lead.status === LeadStatus.Registered).length),
            qualifiedLeadCount: computed(() => leads().filter((lead) => lead.status === LeadStatus.Qualified).length),
            convertedLeadCount: computed(() => leads().filter((lead) => lead.status === LeadStatus.Converted).length),
            closedLeadCount: computed(() => leads().filter((lead) => lead.status === LeadStatus.Closed).length),
            loadLeads: jest.fn().mockResolvedValue(leads()),
            loadLeadSources: jest.fn().mockResolvedValue(leadSources()),
            loadLead: jest.fn().mockImplementation(async () => {
                const detail = createLeadDetail();
                selectedLead.set(detail);
                return detail;
            }),
            createLead: jest.fn().mockResolvedValue(createLead()),
            updateLead: jest.fn().mockResolvedValue(createLead()),
            createLeadSource: jest.fn().mockResolvedValue(createLeadSource()),
            updateLeadSource: jest.fn().mockResolvedValue(createLeadSource({ status: LeadSourceStatus.Inactive })),
            qualifyLead: jest.fn().mockResolvedValue(createLead({ status: LeadStatus.Qualified })),
            closeLead: jest.fn().mockResolvedValue(createLead({ status: LeadStatus.Closed })),
            convertLeadToProject: jest.fn().mockResolvedValue(createProjectSummary()),
            claimLeadOwner: jest.fn().mockResolvedValue({ assignmentType: 'claimed' }),
            assignLeadOwner: jest.fn().mockResolvedValue({ assignmentType: 'assigned' }),
            loadLeadScoreHistory: jest.fn().mockResolvedValue(createScoreHistory()),
            submitLeadScoreOverride: jest.fn().mockResolvedValue(createScoreOverride()),
            approveLeadScoreOverride: jest.fn().mockResolvedValue(createScoreOverride({ status: LeadScoreOverrideStatus.Approved })),
            rejectLeadScoreOverride: jest.fn().mockResolvedValue(createScoreOverride({ status: LeadScoreOverrideStatus.Rejected })),
            revokeLeadScoreOverride: jest.fn().mockResolvedValue(createScoreOverride({ status: LeadScoreOverrideStatus.Revoked })),
            clearSelectedLead: jest.fn()
        };
        platformStoreMock = {
            ownerUsers,
            ownerOrgUnits,
            loadingOwnerReferenceData: signal(false),
            loadedOwnerReferenceData: signal(true),
            loadOwnerReferenceData: jest.fn().mockResolvedValue({ users: ownerUsers(), orgUnits: ownerOrgUnits() })
        };
        customerStoreMock = {
            activeCustomers: computed(() => customers().filter((customer) => customer.status === CustomerStatus.Active)),
            loading: signal(false),
            loaded: signal(false),
            loadCustomers: jest.fn().mockResolvedValue(customers())
        };
        attachmentStoreMock = {
            attachments: signal<AttachmentSummary[]>([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadAttachments: jest.fn().mockResolvedValue([]),
            uploadAttachment: jest.fn(),
            voidAttachment: jest.fn(),
            downloadAttachment: jest.fn(),
            clearAttachments: jest.fn()
        };
        salesFollowUpStoreMock = {
            followUps,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadFollowUps: jest.fn().mockResolvedValue(followUps()),
            createFollowUp: jest.fn().mockResolvedValue(createFollowUp()),
            replaceFollowUp: jest.fn().mockResolvedValue(createFollowUp({ id: 'follow-up-2' })),
            voidFollowUp: jest.fn().mockResolvedValue(createFollowUp({ status: SalesFollowUpRecordStatus.Voided })),
            clearFollowUps: jest.fn(() => followUps.set([]))
        };
        salesIntelligenceStoreMock = {
            contacts: signal<CustomerContactSummary[]>([]),
            stakeholders: signal<OpportunityStakeholderSummary[]>([]),
            competitors: signal<CompetitorIntelligenceRecordSummary[]>([]),
            discoveryRecords: signal<SalesDiscoveryRecordSummary[]>([]),
            gaps: signal<SalesIntelligenceGapSummary[]>([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadContext: jest.fn().mockResolvedValue(undefined),
            clearContext: jest.fn()
        };
        businessDiscussionStoreMock = {
            comments: signal<BusinessDiscussionCommentSummary[]>([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadComments: jest.fn().mockResolvedValue([]),
            createComment: jest.fn(),
            clearComments: jest.fn()
        };
        const dictionaryStoreMock = {
            items: signal([]),
            activeItems: signal([]),
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadItems: jest.fn().mockResolvedValue([]),
            clearItems: jest.fn()
        };

        await TestBed.configureTestingModule({
            imports: [LeadList],
            providers: [
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser: signal<SanitizedUserWithOrgUnits | null>({
                            id: 'user-1',
                            displayName: '张销售',
                            username: 'sales_rep',
                            roles: ['销售人员'],
                            permissions: ['nav:leads:view', 'lead:read', 'lead:write', 'lead:source:manage', 'lead:score:override'],
                            email: 'sales@example.com',
                            avatarUrl: null,
                            isActive: true,
                            lastLoginAt: null,
                            emailVerified: false,
                            phoneVerified: false,
                            phone: null,
                            orgUnits: [
                                {
                                    id: 'org-1',
                                    name: '华南销售一部',
                                    code: 'SALES-SOUTH-1',
                                    description: null,
                                    membershipType: 'primary' as SanitizedUserWithOrgUnits['orgUnits'][number]['membershipType']
                                }
                            ]
                        }),
                        initialize: jest.fn(),
                        isAuthenticated: () => true,
                        hasAnyPermission: jest.fn((permissions: readonly string[]) =>
                            permissions.some((permission) => (permission === 'lead:write' ? canWriteLead() : permission === 'lead:assign' ? canAssignLead() : permission === 'lead:score:override' ? canOverrideLeadScore() : permission === 'lead:source:manage'))
                        )
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        queryParamMap: queryParamMap.asObservable()
                    }
                },
                {
                    provide: PlatformStore,
                    useValue: platformStoreMock
                },
                {
                    provide: DictionaryStore,
                    useValue: dictionaryStoreMock
                }
            ]
        })
            .overrideComponent(LeadList, {
                set: {
                    providers: [
                        {
                            provide: LeadStore,
                            useValue: leadStoreMock
                        },
                        {
                            provide: CustomerStore,
                            useValue: customerStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(AttachmentPanel, {
                set: {
                    providers: [
                        {
                            provide: AttachmentStore,
                            useValue: attachmentStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(AuditHistoryPanel, {
                set: {
                    template: '<button type="button">编辑历史</button>',
                    providers: [
                        {
                            provide: AuditHistoryStore,
                            useValue: {
                                records: signal([]),
                                loading: signal(false),
                                error: signal(null),
                                loadEntityAuditLogs: jest.fn().mockResolvedValue([]),
                                clear: jest.fn()
                            }
                        }
                    ]
                }
            })
            .overrideComponent(SalesFollowUpPanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: SalesFollowUpStore,
                            useValue: salesFollowUpStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(SalesIntelligencePanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: SalesIntelligenceStore,
                            useValue: salesIntelligenceStoreMock
                        }
                    ]
                }
            })
            .overrideComponent(BusinessDiscussionPanel, {
                set: {
                    template: '<section>{{ title }}</section>',
                    providers: [
                        {
                            provide: BusinessDiscussionStore,
                            useValue: businessDiscussionStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(LeadList);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => {
        getComputedStyleSpy.mockRestore();
    });

    it('renders lead list facts from LeadListView', () => {
        const text = fixture.nativeElement.textContent;

        expect(leadStoreMock.loadLeads).toHaveBeenCalled();
        expect(text).toContain('华南地铁线索');
        expect(text).toContain('华南地铁集团');
        expect(text).toContain('客户拜访');
        expect(text).toContain('张销售');
        expect(text).toContain('待确认');
    });

    it('highlights effective score without hiding the system score source', () => {
        leads.set([
            createLead({
                score: 70,
                rating: LeadRating.C,
                effectiveScore: 88,
                effectiveRating: LeadRating.B,
                effectiveScoreSource: LeadEffectiveScoreSource.ManualOverride,
                activeScoreOverrideId: 'override-1'
            })
        ]);

        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('88');
        expect(text).toContain('人工覆盖');
        expect(text).toContain('系统 70');
    });

    it('falls back to system score fields when the running API has not returned effective score fields', () => {
        leads.set([
            createLead({
                score: 80,
                rating: LeadRating.A,
                effectiveScore: undefined as never,
                effectiveRating: undefined as never,
                effectiveScoreSource: undefined as never,
                effectiveScoreReason: undefined as never
            })
        ]);

        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        expect(text).toContain('80');
        expect(text).toContain('A级');
        expect(text).toContain('系统评分');
        expect(text).not.toContain('未评级');
    });

    it('loads score history and submits an override request with the lead row version', async () => {
        leadStoreMock.loadLeadScoreHistory.mockResolvedValueOnce(createScoreHistory({ pendingOverride: null, overrides: [] }));

        await component.openScoreHistory(createLead({ score: 70, rating: LeadRating.C, effectiveScore: 70, effectiveRating: LeadRating.C }));
        component.updateScoreOverrideScore(88);
        component.updateScoreOverrideReason('  主管确认关键决策链已补齐。  ');
        await component.submitScoreOverride();

        expect(leadStoreMock.loadLeadScoreHistory).toHaveBeenCalledWith('lead-1');
        expect(leadStoreMock.submitLeadScoreOverride).toHaveBeenCalledWith('lead-1', {
            score: 88,
            reason: '主管确认关键决策链已补齐。',
            expectedLeadRowVersion: 1
        });
    });

    it('approves, rejects and revokes score overrides with override row versions', async () => {
        const pending = createScoreOverride({ id: 'pending-override', status: LeadScoreOverrideStatus.Pending, rowVersion: 5 });
        const active = createScoreOverride({ id: 'active-override', status: LeadScoreOverrideStatus.Approved, rowVersion: 6 });

        component.scoreOverrideApproveNote.set('  同意主管判断  ');
        await component.approveScoreOverride(pending);
        component.scoreOverrideRejectReason.set('  理由不足  ');
        await component.rejectScoreOverride(pending);
        component.scoreOverrideRevokeReason.set('  客户事实已变化  ');
        await component.revokeScoreOverride(active);

        expect(leadStoreMock.approveLeadScoreOverride).toHaveBeenCalledWith('pending-override', {
            expectedOverrideRowVersion: 5,
            note: '同意主管判断'
        });
        expect(leadStoreMock.rejectLeadScoreOverride).toHaveBeenCalledWith('pending-override', {
            expectedOverrideRowVersion: 5,
            reason: '理由不足'
        });
        expect(leadStoreMock.revokeLeadScoreOverride).toHaveBeenCalledWith('active-override', {
            expectedOverrideRowVersion: 6,
            reason: '客户事实已变化'
        });
    });

    it('guides users into the lead-to-project conversion path from project entry', () => {
        leads.set([
            createLead({ id: 'lead-ready', status: LeadStatus.Qualified, gateSummary: readyConversionGate() }),
            createLead({ id: 'lead-blocked', status: LeadStatus.Qualified, gateSummary: blockedConversionGate() })
        ]);

        queryParamMap.next(convertToParamMap({ conversion: 'ready' }));
        fixture.detectChanges();

        expect(component.conversionGuideActive()).toBe(true);
        expect(component.statusFilter()).toBe(LeadStatus.Qualified);
        expect(component.readyConversionLeadCount()).toBe(1);
        expect(component.blockedConversionLeadCount()).toBe(1);
        expect(fixture.nativeElement.textContent).toContain('选择一条可转项目线索');
        expect(fixture.nativeElement.textContent).toContain('1 条可转项目');
        expect(fixture.nativeElement.textContent).toContain('1 条待补齐');
        expect(fixture.nativeElement.textContent).toContain('转入项目');
        expect(fixture.nativeElement.textContent).toContain('补齐闸口');
        expect(fixture.nativeElement.textContent).toContain('缺少：预算情况');
        expect(fixture.nativeElement.textContent.match(/缺少：预算情况/g)).toHaveLength(1);

        component.clearConversionGuide();

        expect(component.conversionGuideActive()).toBe(false);
        expect(component.statusFilter()).toBe('all');
        expect(routerMock.navigate).toHaveBeenCalledWith(
            [],
            expect.objectContaining({
                queryParams: {
                    conversion: null
                },
                queryParamsHandling: 'merge',
                replaceUrl: true
            })
        );
    });

    it('loads shared sales follow-up records when opening a lead detail', async () => {
        await component.openLeadDetail(createLead());
        fixture.detectChanges();
        await fixture.whenStable();

        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: undefined,
            lifecycleScope: SalesFollowUpRecordLifecycleScope.Active
        });
        expect(salesIntelligenceStoreMock.loadContext).toHaveBeenCalledWith('customer-1', {
            leadId: 'lead-1',
            projectId: undefined
        });
        expect(businessDiscussionStoreMock.loadComments).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: undefined
        });
    });

    it('opens lead detail from a sales follow-up reminder query', async () => {
        queryParamMap.next(convertToParamMap({ leadId: 'lead-1', followUpId: 'follow-up-1', todoId: 'todo-1' }));
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(leadStoreMock.loadLead).toHaveBeenCalledWith('lead-1');
        expect(component.detailDialogVisible).toBe(true);
        expect(component.followUpReminderEntry()).toEqual({ followUpId: 'follow-up-1', todoId: 'todo-1' });
        expect(fixture.nativeElement.textContent).toContain('从销售跟进待办进入');

        component.clearDetail();

        expect(routerMock.navigate).toHaveBeenCalledWith(
            [],
            expect.objectContaining({
                queryParams: {
                    leadId: null,
                    followUpId: null,
                    todoId: null
                },
                queryParamsHandling: 'merge',
                replaceUrl: true
            })
        );
    });

    it('includes the converted project anchor when loading follow-ups for converted leads', async () => {
        const convertedLead = createLeadDetail({
            status: LeadStatus.Converted,
            convertedProjectId: 'project-1',
            convertedProjectSummary: createProjectSummary()
        });
        leadStoreMock.loadLead.mockImplementationOnce(async () => {
            selectedLead.set(convertedLead);
            return convertedLead;
        });

        await component.openLeadDetail(createLead({ status: LeadStatus.Converted, convertedProjectId: 'project-1' }));
        fixture.detectChanges();
        await fixture.whenStable();

        expect(salesFollowUpStoreMock.loadFollowUps).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: 'project-1',
            lifecycleScope: SalesFollowUpRecordLifecycleScope.Active
        });
        expect(salesIntelligenceStoreMock.loadContext).toHaveBeenCalledWith('customer-1', {
            leadId: 'lead-1',
            projectId: 'project-1'
        });
        expect(businessDiscussionStoreMock.loadComments).toHaveBeenCalledWith({
            customerId: 'customer-1',
            leadId: 'lead-1',
            projectId: 'project-1'
        });
    });

    it('creates a lead with the generated request shape', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '  城市交通机会  ');
        component.updateCreateCustomer('customer-2');
        component.updateCreateSource('source-2');
        component.updateCreateField('demandDescription', '  客户需要补强枢纽站安防系统。  ');
        component.updateCreateBudgetStatus(LeadBudgetStatus.BudgetConfirmed);
        component.updateCreateField('estimatedAmount', '  2500000.00  ');
        component.updateCreateUrgency(LeadUrgency.Critical);
        component.updateCreateExpectedDecisionDate(new Date(2026, 5, 1));

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith({
            leadName: '城市交通机会',
            customerId: 'customer-2',
            sourceId: 'source-2',
            demandDescription: '客户需要补强枢纽站安防系统。',
            budgetStatus: LeadBudgetStatus.BudgetConfirmed,
            estimatedAmount: '2500000.00',
            urgency: LeadUrgency.Critical,
            expectedDecisionDate: '2026-06-01',
            ownerUserId: 'user-1',
            ownerOrgId: 'org-1'
        });
        expect(customerStoreMock.loadCustomers).toHaveBeenCalledWith({ status: CustomerStatus.Active });
        expect(leadStoreMock.loadLeadSources).toHaveBeenCalled();
    });

    it('can create a lead into public pool when owner is cleared', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '公共池机会');
        component.updateCreateCustomer('customer-1');
        component.updateCreateSource('source-1');
        component.updateCreateField('demandDescription', '客户先留下需求。');
        component.updateCreateOwnerUser(null);

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUserId: null,
                ownerOrgId: null
            })
        );
    });

    it('updates editable lead basic fields through the generated request shape', async () => {
        const lead = createLead({
            status: LeadStatus.Registered,
            expectedDecisionDate: '2026-05-01'
        });

        component.showEditLeadDialog(lead);
        component.updateEditField('leadName', '  更新后的线索名称  ');
        component.updateEditSource('source-2');
        component.updateEditField('demandDescription', '  客户补充了运维平台范围。  ');
        component.updateEditBudgetStatus(LeadBudgetStatus.RoughBudget);
        component.updateEditField('estimatedAmount', '  1800000.00  ');
        component.updateEditUrgency(LeadUrgency.Normal);
        component.updateEditExpectedDecisionDate(new Date(2026, 6, 15));

        await component.updateLead();

        expect(leadStoreMock.updateLead).toHaveBeenCalledWith('lead-1', {
            leadName: '更新后的线索名称',
            sourceId: 'source-2',
            demandDescription: '客户补充了运维平台范围。',
            budgetStatus: LeadBudgetStatus.RoughBudget,
            estimatedAmount: '1800000.00',
            urgency: LeadUrgency.Normal,
            expectedDecisionDate: '2026-07-15',
            expectedVersion: 1
        });
        expect(component.editDialogVisible).toBe(false);
    });

    it('loads public pool scope and claims an unassigned lead', async () => {
        component.setOwnershipFilter(LeadOwnershipScope.PublicPool);

        expect(leadStoreMock.loadLeads).toHaveBeenLastCalledWith({ ownershipScope: LeadOwnershipScope.PublicPool });

        const publicLead = createLead({
            ownerUserId: null,
            ownerOrgId: null,
            ownerName: null,
            ownerOrgName: null,
            allowedActions: [LeadAllowedAction.ClaimLeadOwner, LeadAllowedAction.AssignLeadOwner]
        });

        await component.claimLeadOwner(publicLead);

        expect(leadStoreMock.claimLeadOwner).toHaveBeenCalledWith('lead-1', { expectedVersion: 1 });
    });

    it('assigns lead owner with reason through controlled command', async () => {
        const publicLead = createLead({
            ownerUserId: null,
            ownerOrgId: null,
            ownerName: null,
            ownerOrgName: null,
            allowedActions: [LeadAllowedAction.AssignLeadOwner]
        });

        component.showAssignOwnerDialog(publicLead);
        component.updateAssignmentOwnerUser('user-2');
        component.updateAssignmentReason('  主管分配给华东销售  ');
        await component.assignLeadOwner();

        expect(leadStoreMock.assignLeadOwner).toHaveBeenCalledWith('lead-1', {
            ownerUserId: 'user-2',
            ownerOrgId: 'org-2',
            reason: '主管分配给华东销售',
            expectedVersion: 1
        });
    });

    it('updates the selected sales owner and defaults the owner org from the chosen user', async () => {
        component.showCreateDialog();
        component.updateCreateField('leadName', '城市交通机会');
        component.updateCreateCustomer('customer-1');
        component.updateCreateSource('source-1');
        component.updateCreateField('demandDescription', '客户需要补强枢纽站安防系统。');
        component.updateCreateOwnerUser('user-2');

        await component.createLead();

        expect(leadStoreMock.createLead).toHaveBeenCalledWith(
            expect.objectContaining({
                ownerUserId: 'user-2',
                ownerOrgId: 'org-2'
            })
        );
    });

    it('creates a managed lead source option', async () => {
        component.showSourceDialog();
        component.updateSourceField('code', '  partner-referral  ');
        component.updateSourceField('name', '  合作伙伴推荐  ');
        component.updateSourceField('description', '  合作伙伴渠道  ');
        component.updateSourceSortOrder(20);

        await component.createLeadSource();

        expect(leadStoreMock.createLeadSource).toHaveBeenCalledWith({
            code: 'partner-referral',
            name: '合作伙伴推荐',
            description: '合作伙伴渠道',
            sortOrder: 20
        });
    });

    it('does not expose write actions when the user only has read access', () => {
        canWriteLead.set(false);
        fixture.detectChanges();
        const buttonText = Array.from(fixture.nativeElement.querySelectorAll('button'))
            .map((button) => (button as HTMLButtonElement).textContent ?? '')
            .join(' ');

        expect(fixture.nativeElement.textContent).toContain('当前账号只能查看线索。');
        expect(buttonText).not.toContain('登记线索');
        expect(buttonText).not.toContain('编辑');
        expect(buttonText).not.toContain('确认有效');
        expect(buttonText).not.toContain('关闭线索');
    });

    it('qualifies a registered lead with a business explanation', async () => {
        const lead = createLead();

        component.showQualifyDialog(lead);
        component.qualificationSummary.set('客户预算明确，已确认采购意向。');
        await component.qualifyLead();

        expect(leadStoreMock.qualifyLead).toHaveBeenCalledWith('lead-1', {
            qualificationSummary: '客户预算明确，已确认采购意向。'
        });
    });

    it('converts a qualified lead into a project and navigates to the created project', async () => {
        const lead = createLead({ status: LeadStatus.Qualified, gateSummary: readyConversionGate() });

        component.showConvertDialog(lead);
        fixture.detectChanges();
        component.updateConvertField('customerProjectNo', '  CUS-PRJ-NEW  ');
        component.updateConvertField('projectName', '  城市交通项目  ');
        component.updateConvertDate(new Date(2026, 4, 1));
        await component.convertLeadToProject();

        expect(leadStoreMock.convertLeadToProject).toHaveBeenCalledWith('lead-1', {
            customerProjectNo: 'CUS-PRJ-NEW',
            projectName: '城市交通项目',
            plannedSignAt: '2026-05-01'
        });
        expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', 'project-1']);
    });

    it('does not expose project conversion for registered or converted leads', () => {
        expect(component.canConvertLead(createLead({ status: LeadStatus.Registered }))).toBe(false);
        expect(component.canConvertLead(createLead({ status: LeadStatus.Converted, convertedProjectId: 'project-1' }))).toBe(false);
        expect(component.canConvertLead(createLead({ status: LeadStatus.Qualified, gateSummary: readyConversionGate() }))).toBe(true);
    });

    it('only allows editing registered or qualified leads', () => {
        expect(component.canEditLead(createLead({ status: LeadStatus.Registered }))).toBe(true);
        expect(component.canEditLead(createLead({ status: LeadStatus.Qualified }))).toBe(true);
        expect(component.canEditLead(createLead({ status: LeadStatus.Converted }))).toBe(false);
        expect(component.canEditLead(createLead({ status: LeadStatus.Closed }))).toBe(false);
    });
});
