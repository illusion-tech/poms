// R3D #89: pure request definitions for Root's original Native witness.
// No imports, schema execution, HTTP, database, fixture setup or product changes.
// Sources:
// - libs/shared/contracts/src/lib/shared-contracts.ts:4856-4903
// - apps/poms-api/src/app/features/project/project.controller.ts:288-295
// - apps/poms-api/src/app/features/project/project.service.ts:478-555,768-783
// - apps/poms-api/src/app/features/project/project.service.spec.ts:872-972
// - apps/poms-admin-e2e/src/project-workspace.journey.spec.ts:309-336,423-438
// The journey source mocks HTTP; it is shape/UI context, not a Native witness.
// Root supplies the existing eligible projectId, session and CSRF separately.
// This module contains neither server-owned IDs/version/status nor expectedVersion.

// Exact valid path triples from assertBidCommercialPathConsistent.
// Ordinary caller-provided strings must retain the original schema bounds.
export const validBidCommercialPaths = {
    publicTender: {
        bidMode: 'public-tender',
        decision: 'participate',
        resultStatus: 'pending'
    },
    directCommercial: {
        bidMode: 'direct-commercial',
        decision: 'participate',
        resultStatus: 'pending'
    },
    notRequired: {
        bidMode: 'not-required',
        decision: 'not-required',
        resultStatus: 'not-applicable'
    }
};

// Only the five required fields. Omitted child arrays receive the original
// schema's [] defaults; explicit null would not receive those defaults.
export function minimalBidCommercialRequest(
    processSummary = 'Native bid process',
    path = 'publicTender'
) {
    return {
        ...validBidCommercialPaths[path],
        currentStage: 'preparation',
        processSummary
    };
}

// A fresh full request per call, including every material/timeline input field.
// Dates stay literal uppercase-T/Z ISO strings; no Date parsing or formatting.
// 'preparation' is a process stage, independent of the eligible project stage.
// ready/in-progress and done/pending are valid explicit facts; none is inferred.
export function bidCommercialRequestWithChildren(
    marker = 'Native bid',
    path = 'publicTender',
    navigationHint = '/projects/current/workspace/bid-commercial'
) {
    return {
        ...validBidCommercialPaths[path],
        currentStage: 'preparation',
        processSummary: `${marker} process`,
        decisionSummary: `${marker} decision`,
        resultSummary: null,
        tenderNo: `${marker} tender`,
        bidPackageNo: `${marker} package`,
        ownerRole: `${marker} owner`,
        materialItems: [
            {
                materialKey: `${marker} material`,
                label: `${marker} material label`,
                materialStatus: 'in-progress',
                responsibleRole: `${marker} material owner`,
                dueAt: '2026-11-03T08:00:00.123Z',
                blocksNextStep: true,
                navigationHint,
                sortOrder: 1
            },
            {
                materialKey: `${marker} ready material`,
                label: `${marker} ready material label`,
                materialStatus: 'ready',
                responsibleRole: null,
                dueAt: null,
                blocksNextStep: false,
                navigationHint: null,
                sortOrder: 2
            }
        ],
        timelineItems: [
            {
                eventKey: `${marker} completed event`,
                label: `${marker} completed event label`,
                summary: `${marker} completed event summary`,
                timelineStatus: 'done',
                occurredAt: '2026-11-02T02:00:00.456Z',
                dueAt: '2026-11-02T03:00:00.000Z',
                responsibleRole: `${marker} event owner`,
                sortOrder: 1
            },
            {
                eventKey: `${marker} pending event`,
                label: `${marker} pending event label`,
                summary: null,
                timelineStatus: 'pending',
                occurredAt: null,
                dueAt: '2026-11-04T08:00:00.000Z',
                responsibleRole: null,
                sortOrder: 2
            }
        ]
    };
}
