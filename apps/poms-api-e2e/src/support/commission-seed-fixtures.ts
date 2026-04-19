export const COMMISSION_E2E_FIXTURES = {
    main: {
        projectId: '21000000-0000-4000-8000-000000000101',
        contractId: '31000000-0000-4000-8000-000000000101',
        handoverId: '71000000-0000-4000-8000-000000000101',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000101',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000101',
        baselinePackageId: '84000000-0000-4000-8000-000000000301',
        operatingSnapshotId: '84300000-0000-4000-8000-000000000301',
        signalEvaluationId: '84500000-0000-4000-8000-000000000301',
        gateBindingId: '84600000-0000-4000-8000-000000000301',
        summarySnapshotId: '69100000-0000-4000-8000-000000000301',
        summaryPackageKey: 'operating-signal-commission-gate-e2e'
    },
    noActiveContract: {
        projectId: '21000000-0000-4000-8000-000000000102',
        contractId: '31000000-0000-4000-8000-000000000102',
        handoverId: '71000000-0000-4000-8000-000000000102',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000102',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000102'
    }
} as const;
