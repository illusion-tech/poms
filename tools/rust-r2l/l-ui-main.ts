// Acceptance entry only: the original App, appConfig, routes, templates,
// providers, AuthStore, CSRF and HttpClient remain the running application.
import { bootstrapApplication } from '@angular/platform-browser';
import type { ApprovalRecordSummary, ContractDetailView, ProjectSummary } from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../../apps/poms-admin/src/app.config';
import { AppComponent } from '../../apps/poms-admin/src/app.component';

export interface PomsLAcceptance {
    readonly version: 1;
    getProjectByCode(projectNo: string): Promise<ProjectSummary>;
    getContractByNumber(contractNo: string): Promise<ContractDetailView>;
    getApprovalRecord(id: string): Promise<ApprovalRecordSummary>;
}

declare global {
    interface Window {
        readonly __pomsLAcceptance?: Readonly<PomsLAcceptance>;
    }
}

bootstrapApplication(AppComponent, appConfig)
    .then(async (application) => {
        if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
            throw new Error('The L acceptance bridge requires a loopback origin');
        }
        if (Object.hasOwn(window, '__pomsLAcceptance')) {
            throw new Error('The L acceptance bridge already exists');
        }
        const [{ ProjectApi }, { ContractApi }, { ApprovalApi }] = await Promise.all([
            import('../../libs/shared/api-client/api/project.service'),
            import('../../libs/shared/api-client/api/contract.service'),
            import('../../libs/shared/api-client/api/approval.service')
        ]);
        const projectApi = application.injector.get(ProjectApi);
        const contractApi = application.injector.get(ContractApi);
        const approvalApi = application.injector.get(ApprovalApi);
        const bridge: Readonly<PomsLAcceptance> = Object.freeze({
            version: 1 as const,
            getProjectByCode: (projectNo: string) => firstValueFrom(projectApi.projectControllerGetByCode({ projectNo })),
            getContractByNumber: (contractNo: string) => firstValueFrom(contractApi.contractControllerGetByNo({ contractNo })),
            getApprovalRecord: (id: string) => firstValueFrom(approvalApi.approvalControllerGetApprovalRecord({ id }))
        });
        Object.defineProperty(window, '__pomsLAcceptance', { value: bridge, writable: false, configurable: false, enumerable: false });
    })
    .catch((err) => console.error(err));
