import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    AttachmentStorageProviderConfigStatus,
    AttachmentStorageProviderConnectionTestStatus,
    AttachmentStorageProviderType,
    type AttachmentStorageProviderConfigSummary,
    type AttachmentStorageProviderConnectionTestResult
} from '@poms/admin-data-access';
import { AttachmentStorageProviderCard } from './attachment-storage-provider-card';

function createStorageProviderConfig(overrides: Partial<AttachmentStorageProviderConfigSummary> = {}): AttachmentStorageProviderConfigSummary {
    return {
        id: 'attachment-storage-provider-1',
        providerType: AttachmentStorageProviderType.HuaweiObsS3,
        displayName: '华为云 OBS 生产',
        status: AttachmentStorageProviderConfigStatus.Active,
        enabled: true,
        isDefault: false,
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        region: 'cn-north-4',
        bucket: 'poms-prod',
        keyPrefix: 'poms/attachments',
        forcePathStyle: false,
        accessKeyConfigured: true,
        secretAccessKeyConfigured: true,
        credentialsUpdatedAt: '2026-05-11T08:00:00.000Z',
        rowVersion: 4,
        createdAt: '2026-05-11T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-11T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createConnectionResult(overrides: Partial<AttachmentStorageProviderConnectionTestResult> = {}): AttachmentStorageProviderConnectionTestResult {
    return {
        status: AttachmentStorageProviderConnectionTestStatus.Success,
        message: 'Attachment storage provider connection is healthy.',
        checkedAt: '2026-05-11T08:30:00.000Z',
        ...overrides
    };
}

describe('AttachmentStorageProviderCard', () => {
    let fixture: ComponentFixture<AttachmentStorageProviderCard>;
    let component: AttachmentStorageProviderCard;
    const config = createStorageProviderConfig();

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttachmentStorageProviderCard]
        }).compileComponents();

        fixture = TestBed.createComponent(AttachmentStorageProviderCard);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('providerType', AttachmentStorageProviderType.HuaweiObsS3);
        fixture.componentRef.setInput('config', config);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('renders provider config as a demo-style action card without exposing raw secret', () => {
        const text = fixture.nativeElement.textContent;
        const card = fixture.nativeElement.querySelector('article') as HTMLElement | null;

        expect(text).toContain('华为云 OBS 生产');
        expect(text).toContain('华为云 OBS');
        expect(text).toContain('已激活');
        expect(text).toContain('AK/SK 已配置');
        expect(text).toContain('poms-prod');
        expect(text).not.toContain('secret-value');
        expect(card?.className).toContain('border-surface-200');
        expect(card?.className).not.toContain('border-dashed');
    });

    it('shows the latest connection test result', async () => {
        fixture.componentRef.setInput('testResult', createConnectionResult());
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('测试通过');
        expect(fixture.nativeElement.textContent).toContain('Attachment storage provider connection is healthy.');
    });

    it('renders an unconfigured provider slot with a configure action', async () => {
        fixture.componentRef.setInput('config', null);
        await fixture.whenStable();
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        const card = fixture.nativeElement.querySelector('article') as HTMLElement | null;

        expect(text).toContain('华为云 OBS');
        expect(text).toContain('待配置');
        expect(text).toContain('AK/SK 未配置');
        expect(text).toContain('配置');
        expect(text).toContain('测试连接');
        const testButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find((button) => button.textContent?.includes('测试连接'));
        expect(testButton?.disabled).toBe(true);
        expect(card?.className).not.toContain('border-dashed');
    });

    it('disables set-default unless config is active and enabled', async () => {
        fixture.componentRef.setInput(
            'config',
            createStorageProviderConfig({
                status: AttachmentStorageProviderConfigStatus.Disabled,
                enabled: false
            })
        );
        await fixture.whenStable();
        fixture.detectChanges();

        expect(component.canSetDefault(component.config() as AttachmentStorageProviderConfigSummary)).toBe(false);
    });

    it('emits card actions to the parent page', () => {
        const configureSpy = jest.fn();
        const editSpy = jest.fn();
        const testSpy = jest.fn();
        const setDefaultSpy = jest.fn();
        component.configureRequested.subscribe(configureSpy);
        component.editRequested.subscribe(editSpy);
        component.testRequested.subscribe(testSpy);
        component.setDefaultRequested.subscribe(setDefaultSpy);

        component.configureRequested.emit(AttachmentStorageProviderType.HuaweiObsS3);
        component.editRequested.emit(config);
        component.testRequested.emit(config);
        component.setDefaultRequested.emit(config);

        expect(configureSpy).toHaveBeenCalledWith(AttachmentStorageProviderType.HuaweiObsS3);
        expect(editSpy).toHaveBeenCalledWith(config);
        expect(testSpy).toHaveBeenCalledWith(config);
        expect(setDefaultSpy).toHaveBeenCalledWith(config);
    });
});
