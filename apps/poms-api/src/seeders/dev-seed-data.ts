import { requireDevOrgUnitByCode, requireDevUserByUsername } from '../app/core/platform/dev-platform.fixtures';

export interface ProjectSeedRecord {
    id: string;
    projectCode: string;
    projectName: string;
    customerId: string | null;
    customerName: string | null;
    status: string;
    currentStage: string;
    ownerOrgId: string | null;
    ownerUserId: string | null;
    plannedSignAt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
}

export interface ContractSeedRecord {
    id: string;
    projectId: string;
    contractNo: string;
    status: string;
    signedAmount: string;
    currencyCode: string;
    currentSnapshotId: string | null;
    signedAt: string | null;
    retentionDueDate: string | null;
    createdBy: string | null;
    updatedBy: string | null;
}

const salesRepUser = requireDevUserByUsername('sales_rep');
const salesLeadUser = requireDevUserByUsername('sales_lead');
const businessAdminUser = requireDevUserByUsername('biz_admin');
const salesSouthOrgUnit = requireDevOrgUnitByCode('SALES-SOUTH-1');
const salesHqOrgUnit = requireDevOrgUnitByCode('SALES-HQ');

export const DEV_PROJECT_SEEDS: ProjectSeedRecord[] = [
    {
        id: '20000000-0000-4000-8000-000000000001',
        projectCode: 'PRJ-2026-001',
        projectName: 'POMS 首期项目主链路样例',
        customerId: null,
        customerName: '华南地铁集团',
        status: 'active',
        currentStage: 'commercial-closure',
        ownerOrgId: salesSouthOrgUnit.id,
        ownerUserId: salesRepUser.id,
        plannedSignAt: '2026-04-15T00:00:00.000Z',
        createdBy: salesRepUser.id,
        updatedBy: salesRepUser.id
    },
    {
        id: '20000000-0000-4000-8000-000000000002',
        projectCode: 'PRJ-2026-002',
        projectName: 'POMS 审批与导航联调样例',
        customerId: null,
        customerName: '北城建设集团',
        status: 'blocked',
        currentStage: 'handover',
        ownerOrgId: salesHqOrgUnit.id,
        ownerUserId: salesLeadUser.id,
        plannedSignAt: null,
        createdBy: salesLeadUser.id,
        updatedBy: salesLeadUser.id
    }
];

export const DEV_CONTRACT_SEEDS: ContractSeedRecord[] = [
    {
        id: '30000000-0000-4000-8000-000000000001',
        projectId: DEV_PROJECT_SEEDS[0].id,
        contractNo: 'HT-2026-001',
        status: 'draft',
        signedAmount: '880000.00',
        currencyCode: 'CNY',
        currentSnapshotId: null,
        signedAt: null,
        retentionDueDate: null,
        createdBy: businessAdminUser.id,
        updatedBy: businessAdminUser.id
    },
    {
        id: '30000000-0000-4000-8000-000000000002',
        projectId: DEV_PROJECT_SEEDS[1].id,
        contractNo: 'HT-2026-002',
        status: 'active',
        signedAmount: '1280000.00',
        currencyCode: 'CNY',
        currentSnapshotId: null,
        signedAt: '2026-03-20T09:30:00.000Z',
        retentionDueDate: null,
        createdBy: businessAdminUser.id,
        updatedBy: businessAdminUser.id
    }
];
