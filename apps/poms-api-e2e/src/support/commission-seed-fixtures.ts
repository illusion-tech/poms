export const COMMISSION_E2E_FIXTURES = {
    main: {
        projectId: '21000000-0000-4000-8000-000000000101',
        handoverId: '71000000-0000-4000-8000-000000000101',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000101',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000101'
    },
    noActiveContract: {
        projectId: '21000000-0000-4000-8000-000000000102',
        handoverId: '71000000-0000-4000-8000-000000000102',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000102',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000102'
    }
} as const;
