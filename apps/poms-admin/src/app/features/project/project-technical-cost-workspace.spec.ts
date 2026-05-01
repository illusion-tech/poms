import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProjectStage, ProjectStatus, ProjectWorkspaceStore, type ProjectTechnicalCostWorkspaceView } from '@poms/admin-data-access';
import { ProjectTechnicalCostWorkspace } from './project-technical-cost-workspace';

function createWorkspace(overrides: Partial<ProjectTechnicalCostWorkspaceView> = {}): ProjectTechnicalCostWorkspaceView {
    return {
        projectId: 'project-1',
        currentStage: ProjectStage.ScopeConfirmation,
        status: ProjectStatus.Active,
        currentPackage: {
            id: 'package-1',
            projectId: 'project-1',
            version: 2,
            isCurrent: true,
            supersedesId: 'package-0',
            status: 'effective',
            technicalFeasibilityDecision: 'conditional',
            technicalConclusionSummary: '范围可实施，但客户接口文档需要冻结。',
            allowNextStage: false,
            currencyCode: 'CNY',
            totalEstimatedAmountExcludingTax: '15000.00',
            totalTaxCostAmount: '900.00',
            totalEstimatedAmountIncludingTax: '15900.00',
            taxAssumptionSummary: '按 6% 增值税估算。',
            taxReviewStatus: 'pending',
            highestRiskLevel: 'R3',
            blockerCount: 2,
            effectiveAt: '2026-04-24T08:00:00.000Z',
            createdAt: '2026-04-24T08:00:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:00:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        scopeItems: [
            {
                id: 'scope-1',
                packageId: 'package-1',
                scopeType: 'in-scope',
                label: '核心接口联调',
                description: '覆盖签约前必须确认的接口范围。',
                sortOrder: 1
            }
        ],
        riskItems: [
            {
                id: 'risk-1',
                packageId: 'package-1',
                riskCategory: '集成风险',
                riskLevel: 'R3',
                riskDescription: '客户接口文档尚未冻结。',
                impactScope: '影响报价边界。',
                mitigationPlan: '推动接口清单冻结。',
                ownerRole: '售前技术负责人',
                riskStatus: 'open',
                blocksNextStage: true,
                sortOrder: 1
            }
        ],
        costItems: [
            {
                id: 'cost-1',
                packageId: 'package-1',
                costCategory: '人力',
                costSubcategory: '售前支持',
                costDescription: '售前技术方案与接口联调评估。',
                estimationBasis: '2 人 5 天。',
                quantity: '10.0000',
                unit: 'person-day',
                unitPrice: '1500.0000',
                amountExcludingTax: '15000.00',
                taxCostAmount: '900.00',
                amountIncludingTax: '15900.00',
                currencyCode: 'CNY',
                confidenceLevel: 'medium',
                highUncertainty: true,
                responsibleRole: '售前技术负责人',
                sortOrder: 1
            }
        ],
        blockingReasons: ['技术与成本版本包尚未允许进入下一阶段。', '集成风险：客户接口文档尚未冻结。', '税务成本假设仍待复核。'],
        nextStep: '先完成税务成本复核，再判断是否进入商务收口。',
        ownerLabel: '技术支持 / 售前',
        allowedActions: ['view-technical-cost-workspace'],
        generatedAt: '2026-04-24T08:05:00.000Z',
        ...overrides
    };
}

describe('ProjectTechnicalCostWorkspace', () => {
    let fixture: ComponentFixture<ProjectTechnicalCostWorkspace>;
    let workspaceSignal: ReturnType<typeof signal<ProjectTechnicalCostWorkspaceView | null>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let loadTechnicalCostWorkspace: jest.Mock;

    async function setup(workspace: ProjectTechnicalCostWorkspaceView | null = createWorkspace()) {
        workspaceSignal = signal<ProjectTechnicalCostWorkspaceView | null>(workspace);
        loadingSignal = signal(false);
        errorSignal = signal<string | null>(null);
        loadTechnicalCostWorkspace = jest.fn().mockResolvedValue(workspace);

        await TestBed.configureTestingModule({
            imports: [ProjectTechnicalCostWorkspace],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        parent: {
                            snapshot: {
                                paramMap: convertToParamMap({ id: 'project-1' })
                            }
                        },
                        snapshot: {
                            paramMap: convertToParamMap({})
                        }
                    }
                },
                {
                    provide: ProjectWorkspaceStore,
                    useValue: {
                        technicalCostWorkspace: workspaceSignal,
                        loadingTechnicalCost: loadingSignal,
                        technicalCostError: errorSignal,
                        loadTechnicalCostWorkspace
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectTechnicalCostWorkspace);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders the technical cost workspace from backend projection', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(loadTechnicalCostWorkspace).toHaveBeenCalledWith('project-1');
        expect(text).toContain('技术与成本');
        expect(text).toContain('有条件可行');
        expect(text).toContain('范围可实施，但客户接口文档需要冻结。');
        expect(text).toContain('核心接口联调');
        expect(text).toContain('客户接口文档尚未冻结。');
        expect(text).toContain('售前技术负责人');
        expect(text).toContain('15,900.00 CNY');
        expect(text).toContain('先完成税务成本复核，再判断是否进入商务收口。');
    });

    it('renders an empty business gap when current package is missing', async () => {
        await setup(
            createWorkspace({
                currentPackage: null,
                scopeItems: [],
                riskItems: [],
                costItems: [],
                blockingReasons: ['尚未形成技术与成本测算版本包。'],
                nextStep: '补齐技术可行性、范围边界、风险项和成本税务估算。'
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('技术与成本版本包尚未形成');
        expect(text).toContain('尚未形成技术与成本测算版本包。');
        expect(text).toContain('补齐技术可行性、范围边界、风险项和成本税务估算。');
    });

    it('renders the store error without fallback facts', async () => {
        await setup(null);
        errorSignal.set('你没有权限查看当前工作区。');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('技术与成本暂不可用');
        expect(text).toContain('你没有权限查看当前工作区。');
        expect(text).not.toContain('技术与成本版本包尚未形成');
    });
});
