export const PROJECT_HANDOVER_E2E_USERS = {
    adminId: '00000000-0000-4000-8000-000000000001',
    viewerId: '00000000-0000-4000-8000-000000000002'
} as const;

export const PROJECT_HANDOVER_E2E_FIXTURES = {
    summaryMissing: {
        projectId: '21000000-0000-4000-8000-000000000001'
    },
    main: {
        projectId: '21000000-0000-4000-8000-000000000002',
        handoverId: '71000000-0000-4000-8000-000000000002',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000002',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000002',
        confirmationRecordId: '41000000-0000-4000-8000-000000000002'
    },
    staleVersion: {
        projectId: '21000000-0000-4000-8000-000000000003',
        handoverId: '71000000-0000-4000-8000-000000000003',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000003',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000003'
    },
    missingParticipant: {
        projectId: '21000000-0000-4000-8000-000000000004',
        handoverId: '71000000-0000-4000-8000-000000000004',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000004',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000004'
    },
    processingRebaseline: {
        projectId: '21000000-0000-4000-8000-000000000005',
        handoverId: '71000000-0000-4000-8000-000000000005',
        contractSummarySnapshotId: '61000000-0000-4000-8000-000000000005',
        handoverSummarySnapshotId: '62000000-0000-4000-8000-000000000005',
        processingRebaselineRecordId: '72000000-0000-4000-8000-000000000005'
    }
} as const;
