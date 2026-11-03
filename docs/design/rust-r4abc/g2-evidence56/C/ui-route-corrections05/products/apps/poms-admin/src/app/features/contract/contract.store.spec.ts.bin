import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ApprovalApi, AuthStore, ContractApi, ContractStatus, ContractStore } from '@poms/admin-data-access';
import { of, Subject, throwError } from 'rxjs';

const ACTIONS = ['submit-review', 'activate', 'approve', 'reject'] as const;
type Action = (typeof ACTIONS)[number];

function acknowledgement(action: Action) {
    return {
        targetId: 'contract-1', targetType: 'contract',
        resultStatus: action === 'submit-review' ? 'submitted' : action === 'activate' ? 'activated' : action === 'approve' ? 'approved' : 'rejected',
        businessStatusAfter: action === 'activate' ? 'active' : action === 'reject' ? 'draft' : 'pending-review',
        approvalRecordId: 'approval-1', confirmationRecordId: null, todoItemIds: [],
        preparationId: 'preparation-1', snapshotId: action === 'activate' ? 'snapshot-1' : null
    };
}

function contractDetail() {
    return {
        id: 'contract-1', projectId: 'project-1', projectName: '城市交通项目', customerName: null,
        contractNo: 'CT-2026-000001', customerContractNo: null, status: ContractStatus.PendingReview,
        signedAmountProjection: { mode: 'masked', value: null, displayText: '经营敏感字段已隐藏', fieldPackageKey: 'contract-finance', reasonCode: 'missing-sensitive-read-permission' },
        currencyCode: 'CNY', currentSnapshotId: null, signedAt: null, retentionDueDate: null, rowVersion: 2,
        createdAt: '2026-11-03T01:00:00.000Z', createdBy: 'actor-1', updatedAt: '2026-11-03T01:05:00.000Z', updatedBy: 'actor-1',
        currentTermSnapshot: null, currentPreparation: null, latestReviewBinding: null
    };
}

function approvalRecord(contractId: string, id = 'approval-1') {
    return {
        id, approvalType: 'contract-review', businessDomain: 'contract-finance', targetObjectType: 'contract', targetObjectId: contractId,
        projectId: 'project-1', currentStatus: 'pending', currentNodeKey: 'review', currentNodeName: '审核', initiatorUserId: 'actor-1',
        currentApproverUserId: 'actor-1', decision: null, decisionComment: null, targetTitle: '合同审核', targetStatus: 'pending-review',
        submittedAt: '2026-11-03T01:00:00.000Z', decidedAt: null, closedAt: null, rowVersion: 1,
        createdAt: '2026-11-03T01:00:00.000Z', updatedAt: '2026-11-03T01:00:00.000Z'
    };
}

describe('ContractStore acknowledged commands (UI fixtures, not producer acceptance)', () => {
    let store: ContractStore;
    let contractApi: {
        contractControllerSubmitReview: jest.Mock;
        contractControllerActivate: jest.Mock;
        contractControllerGetById: jest.Mock;
        contractControllerGetCurrentApproval: jest.Mock;
    };
    let approvalApi: {
        approvalControllerApproveRecord: jest.Mock;
        approvalControllerRejectRecord: jest.Mock;
    };
    let refreshTodos: jest.Mock;

    function writeMock(action: Action): jest.Mock {
        switch (action) {
            case 'submit-review': return contractApi.contractControllerSubmitReview;
            case 'activate': return contractApi.contractControllerActivate;
            case 'approve': return approvalApi.approvalControllerApproveRecord;
            case 'reject': return approvalApi.approvalControllerRejectRecord;
        }
    }

    function execute(action: Action) {
        switch (action) {
            case 'submit-review': return store.submitReview('contract-1', { preparationId: 'preparation-1', expectedVersion: 1 });
            case 'activate': return store.activateContract('contract-1', { expectedVersion: 2 });
            case 'approve': return store.approveRecord('approval-1', 1);
            case 'reject': return store.rejectRecord('approval-1', '需要修订', 1);
        }
    }

    beforeEach(() => {
        contractApi = {
            contractControllerSubmitReview: jest.fn(),
            contractControllerActivate: jest.fn(),
            contractControllerGetById: jest.fn().mockReturnValue(of(contractDetail())),
            contractControllerGetCurrentApproval: jest.fn().mockReturnValue(of(null))
        };
        approvalApi = {
            approvalControllerApproveRecord: jest.fn(),
            approvalControllerRejectRecord: jest.fn()
        };
        refreshTodos = jest.fn().mockResolvedValue(undefined);
        TestBed.configureTestingModule({ providers: [
            ContractStore,
            { provide: ContractApi, useValue: contractApi },
            { provide: ApprovalApi, useValue: approvalApi },
            { provide: AuthStore, useValue: { refreshTodos } }
        ] });
        store = TestBed.inject(ContractStore);
    });

    it.each(ACTIONS)('%s preserves the exact POST ACK when a following detail GET fails', async (action) => {
        const ack = acknowledgement(action);
        const failure = new HttpErrorResponse({ status: 503, error: { message: '合同读取暂时失败。' } });
        writeMock(action).mockReturnValue(of(ack));
        contractApi.contractControllerGetById.mockReturnValueOnce(throwError(() => failure));

        await expect(execute(action)).resolves.toBe(ack);

        expect(store.lastAcknowledgement()?.action).toBe(action);
        expect(store.lastAcknowledgement()?.contractId).toBe('contract-1');
        expect(store.lastAcknowledgement()?.result).toBe(ack);
        expect(store.commandRefreshError()).toBe('合同读取暂时失败。');
        expect(store.saving()).toBe(false);
        expect(store.refreshingAcknowledgement()).toBe(false);
        expect(writeMock(action)).toHaveBeenCalledTimes(1);
        expect(refreshTodos).toHaveBeenCalledTimes(1);
        expect(refreshTodos).toHaveBeenCalledWith({ propagateErrors: true, isCurrent: expect.any(Function) });

        await expect(store.reloadAcknowledgedState()).resolves.toBe(true);

        expect(store.commandRefreshError()).toBeNull();
        expect(store.lastAcknowledgement()?.result).toBe(ack);
        expect(writeMock(action)).toHaveBeenCalledTimes(1);
        expect(contractApi.contractControllerGetById).toHaveBeenCalledTimes(2);
        expect(contractApi.contractControllerGetCurrentApproval).toHaveBeenCalledTimes(2);
        expect(refreshTodos).toHaveBeenCalledTimes(2);
    });

    it.each(ACTIONS)('%s keeps a write failure unchanged and does not attempt command readback', async (action) => {
        const failure = new HttpErrorResponse({ status: 409, error: { message: '版本已变化。' } });
        writeMock(action).mockReturnValue(throwError(() => failure));

        await expect(execute(action)).rejects.toBe(failure);

        expect(store.lastAcknowledgement()).toBeNull();
        expect(store.commandRefreshError()).toBeNull();
        expect(store.saving()).toBe(false);
        expect(contractApi.contractControllerGetById).not.toHaveBeenCalled();
        expect(contractApi.contractControllerGetCurrentApproval).not.toHaveBeenCalled();
        expect(refreshTodos).not.toHaveBeenCalled();
    });

    it('keeps an approval GET failure visible without turning an approved command into failure', async () => {
        const ack = acknowledgement('approve');
        const failure = new HttpErrorResponse({ status: 403, error: { message: '审批摘要读取无权限。' } });
        approvalApi.approvalControllerApproveRecord.mockReturnValue(of(ack));
        contractApi.contractControllerGetCurrentApproval.mockReturnValue(throwError(() => failure));

        await expect(store.approveRecord('approval-1', 1)).resolves.toBe(ack);

        expect(store.lastAcknowledgement()?.result).toBe(ack);
        expect(store.commandRefreshError()).toBe('审批摘要读取无权限。');
        expect(store.currentApproval()).toBeNull();
    });

    it('keeps a todo refresh failure separate from the successful activation ACK', async () => {
        const ack = acknowledgement('activate');
        contractApi.contractControllerActivate.mockReturnValue(of(ack));
        refreshTodos.mockRejectedValueOnce(new Error('待办读取暂时失败。'));

        await expect(store.activateContract('contract-1', { expectedVersion: 2 })).resolves.toBe(ack);

        expect(store.commandRefreshError()).toBe('待办读取暂时失败。');
        expect(store.lastAcknowledgement()?.result).toBe(ack);
        await expect(store.reloadAcknowledgedState()).resolves.toBe(true);
        expect(contractApi.contractControllerActivate).toHaveBeenCalledTimes(1);
        expect(store.commandRefreshError()).toBeNull();
    });

    it('clears scoped ACK state without replaying a write during a later reload', async () => {
        const ack = acknowledgement('submit-review');
        contractApi.contractControllerSubmitReview.mockReturnValue(of(ack));
        await store.submitReview('contract-1', { preparationId: 'preparation-1' });

        store.clearSelectedContract();
        await expect(store.reloadAcknowledgedState()).resolves.toBe(true);

        expect(store.lastAcknowledgement()).toBeNull();
        expect(store.commandRefreshError()).toBeNull();
        expect(contractApi.contractControllerSubmitReview).toHaveBeenCalledTimes(1);
        expect(contractApi.contractControllerGetById).toHaveBeenCalledTimes(1);
    });
    it('keeps B detail and approval when old A responses arrive after B is loaded', async () => {
        const oldDetail = new Subject<ReturnType<typeof contractDetail>>();
        const oldApproval = new Subject<ReturnType<typeof approvalRecord>>();
        const detailB = { ...contractDetail(), id: 'contract-2', rowVersion: 3 };
        const approvalB = approvalRecord('contract-2', 'approval-2');
        contractApi.contractControllerGetById.mockReturnValueOnce(oldDetail).mockReturnValueOnce(of(detailB));
        contractApi.contractControllerGetCurrentApproval.mockReturnValueOnce(oldApproval).mockReturnValueOnce(of(approvalB));
        const previous = Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        await Promise.all([store.loadContract('contract-2'), store.loadCurrentApproval('contract-2')]);

        oldDetail.next(contractDetail());
        oldDetail.complete();
        oldApproval.next(approvalRecord('contract-1'));
        oldApproval.complete();
        await previous;

        expect(store.selectedContract()?.id).toBe('contract-2');
        expect(store.currentApproval()?.targetObjectId).toBe('contract-2');
        expect(store.currentApproval()?.id).toBe('approval-2');
    });

    it('does not let old request finally handlers clear B pending read indicators', async () => {
        const oldDetail = new Subject<ReturnType<typeof contractDetail>>();
        const newDetail = new Subject<ReturnType<typeof contractDetail>>();
        const oldApproval = new Subject<ReturnType<typeof approvalRecord>>();
        const newApproval = new Subject<ReturnType<typeof approvalRecord>>();
        contractApi.contractControllerGetById.mockReturnValueOnce(oldDetail).mockReturnValueOnce(newDetail);
        contractApi.contractControllerGetCurrentApproval.mockReturnValueOnce(oldApproval).mockReturnValueOnce(newApproval);
        const previous = Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        const current = Promise.all([store.loadContract('contract-2'), store.loadCurrentApproval('contract-2')]);
        oldDetail.next(contractDetail()); oldDetail.complete();
        oldApproval.next(approvalRecord('contract-1')); oldApproval.complete();
        await previous;

        expect(store.selectedContract()).toBeNull();
        expect(store.currentApproval()).toBeNull();
        expect(store.loading()).toBe(true);
        expect(store.loadingApproval()).toBe(true);

        newDetail.next({ ...contractDetail(), id: 'contract-2' }); newDetail.complete();
        newApproval.next(approvalRecord('contract-2')); newApproval.complete();
        await current;
        expect(store.loading()).toBe(false);
        expect(store.loadingApproval()).toBe(false);
    });

    it('distinguishes an old A scope from a later A scope after A to B to A', async () => {
        const oldDetail = new Subject<ReturnType<typeof contractDetail>>();
        const oldApproval = new Subject<ReturnType<typeof approvalRecord>>();
        const freshA = { ...contractDetail(), rowVersion: 9 };
        const freshApprovalA = { ...approvalRecord('contract-1', 'approval-new'), rowVersion: 9 };
        contractApi.contractControllerGetById.mockReturnValueOnce(oldDetail).mockReturnValueOnce(of({ ...contractDetail(), id: 'contract-2' })).mockReturnValueOnce(of(freshA));
        contractApi.contractControllerGetCurrentApproval.mockReturnValueOnce(oldApproval).mockReturnValueOnce(of(approvalRecord('contract-2'))).mockReturnValueOnce(of(freshApprovalA));
        const previous = Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        await Promise.all([store.loadContract('contract-2'), store.loadCurrentApproval('contract-2')]);
        await Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        oldDetail.next(contractDetail()); oldDetail.complete();
        oldApproval.next(approvalRecord('contract-1')); oldApproval.complete();
        await previous;

        expect(store.selectedContract()?.rowVersion).toBe(9);
        expect(store.currentApproval()?.id).toBe('approval-new');
    });

    it('keeps the newest same-contract detail and approval reads', async () => {
        const oldDetail = new Subject<ReturnType<typeof contractDetail>>();
        const oldApproval = new Subject<ReturnType<typeof approvalRecord>>();
        contractApi.contractControllerGetById.mockReturnValueOnce(oldDetail).mockReturnValueOnce(of({ ...contractDetail(), rowVersion: 8 }));
        contractApi.contractControllerGetCurrentApproval.mockReturnValueOnce(oldApproval).mockReturnValueOnce(of({ ...approvalRecord('contract-1', 'approval-new'), rowVersion: 8 }));
        const previous = Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        await Promise.all([store.loadContract('contract-1'), store.loadCurrentApproval('contract-1')]);
        oldDetail.next(contractDetail()); oldDetail.complete();
        oldApproval.next(approvalRecord('contract-1')); oldApproval.complete();
        await previous;

        expect(store.selectedContract()?.rowVersion).toBe(8);
        expect(store.currentApproval()?.rowVersion).toBe(8);
    });

    it('does not publish a late A POST ACK or clear saving while B has a command in flight', async () => {
        const postA = new Subject<ReturnType<typeof acknowledgement>>();
        const postB = new Subject<ReturnType<typeof acknowledgement>>();
        const ackA = acknowledgement('submit-review');
        const ackB = { ...acknowledgement('submit-review'), targetId: 'contract-2', preparationId: 'preparation-2' };
        contractApi.contractControllerSubmitReview.mockReturnValueOnce(postA).mockReturnValueOnce(postB);
        const previous = store.submitReview('contract-1', { preparationId: 'preparation-1' });
        store.setContractScope('contract-2');
        const current = store.submitReview('contract-2', { preparationId: 'preparation-2' });
        postA.next(ackA); postA.complete();
        await expect(previous).resolves.toBe(ackA);

        expect(store.saving()).toBe(true);
        expect(store.lastAcknowledgement()).toBeNull();
        expect(contractApi.contractControllerGetById).not.toHaveBeenCalled();
        expect(refreshTodos).not.toHaveBeenCalled();

        contractApi.contractControllerGetById.mockReturnValue(of({ ...contractDetail(), id: 'contract-2' }));
        postB.next(ackB); postB.complete();
        await expect(current).resolves.toBe(ackB);
        expect(store.lastAcknowledgement()?.contractId).toBe('contract-2');
        expect(store.saving()).toBe(false);
    });

    it('fences an already-started A ACK readback after switching to B', async () => {
        const oldDetail = new Subject<ReturnType<typeof contractDetail>>();
        const oldApproval = new Subject<ReturnType<typeof approvalRecord>>();
        const ackA = acknowledgement('submit-review');
        contractApi.contractControllerSubmitReview.mockReturnValue(of(ackA));
        contractApi.contractControllerGetById.mockReturnValueOnce(oldDetail).mockReturnValueOnce(of({ ...contractDetail(), id: 'contract-2' }));
        contractApi.contractControllerGetCurrentApproval.mockReturnValueOnce(oldApproval).mockReturnValueOnce(of(approvalRecord('contract-2')));
        const previous = store.submitReview('contract-1', { preparationId: 'preparation-1' });
        await Promise.resolve();
        expect(contractApi.contractControllerGetById).toHaveBeenCalledWith({ id: 'contract-1' });
        const todoScopeIsCurrent: () => boolean = refreshTodos.mock.calls[0][0].isCurrent;
        expect(todoScopeIsCurrent()).toBe(true);
        store.setContractScope('contract-2');
        expect(todoScopeIsCurrent()).toBe(false);
        await Promise.all([store.loadContract('contract-2'), store.loadCurrentApproval('contract-2')]);
        oldDetail.error(new Error('旧合同读取失败。'));
        oldApproval.next(approvalRecord('contract-1')); oldApproval.complete();
        await expect(previous).resolves.toBe(ackA);

        expect(store.selectedContract()?.id).toBe('contract-2');
        expect(store.currentApproval()?.targetObjectId).toBe('contract-2');
        expect(store.lastAcknowledgement()).toBeNull();
        expect(store.commandRefreshError()).toBeNull();
        expect(store.refreshingAcknowledgement()).toBe(false);
    });

    it('rejects a contract command for a different selected scope before sending a write', async () => {
        store.setContractScope('contract-2');

        await expect(store.submitReview('contract-1', { preparationId: 'preparation-1' })).rejects.toThrow('当前页面合同已变化');

        expect(contractApi.contractControllerSubmitReview).not.toHaveBeenCalled();
    });
});
