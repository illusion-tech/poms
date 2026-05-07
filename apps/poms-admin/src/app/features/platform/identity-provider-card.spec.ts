import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionTestStatus,
    IdentityProviderSearchGrantMode,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult
} from '@poms/admin-data-access';
import { IdentityProviderCard } from './identity-provider-card';

function createIdentityProviderConfig(overrides: Partial<IdentityProviderConfigSummary> = {}): IdentityProviderConfigSummary {
    return {
        id: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        displayName: '飞书生产租户',
        status: IdentityProviderConfigStatus.Active,
        enabled: true,
        loginEnabled: true,
        bindingEnabled: true,
        searchEnabled: true,
        clientId: 'cli_feishu_prod',
        secretConfigured: true,
        redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
        loginScopes: ['contact:user.base:readonly'],
        searchScopes: ['contact:user.employee_id:readonly'],
        tenantAllowlist: [],
        searchGrantMode: IdentityProviderSearchGrantMode.PerAdmin,
        rowVersion: 4,
        createdAt: '2026-05-07T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-07T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

function createConnectionResult(overrides: Partial<IdentityProviderConnectionTestResult> = {}): IdentityProviderConnectionTestResult {
    return {
        status: IdentityProviderConnectionTestStatus.Success,
        message: 'Local configuration is complete.',
        checkedAt: '2026-05-07T08:30:00.000Z',
        ...overrides
    };
}

describe('IdentityProviderCard', () => {
    let fixture: ComponentFixture<IdentityProviderCard>;
    let component: IdentityProviderCard;
    const config = createIdentityProviderConfig();

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [IdentityProviderCard]
        }).compileComponents();

        fixture = TestBed.createComponent(IdentityProviderCard);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('provider', IdentityProvider.Feishu);
        fixture.componentRef.setInput('config', config);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('renders provider config as an action card without exposing raw secret', () => {
        const text = fixture.nativeElement.textContent;
        const logo = fixture.nativeElement.querySelector('img[alt="飞书 logo"]') as HTMLImageElement | null;

        expect(text).toContain('飞书生产租户');
        expect(text).toContain('飞书');
        expect(text).toContain('已激活');
        expect(text).toContain('secret 已配置');
        expect(text).toContain('contact:user.base:readonly');
        expect(text).not.toContain('secret-value');
        expect(logo?.getAttribute('src')).toBe('/identity-providers/feishu.svg');
    });

    it('shows the latest connection test result', async () => {
        fixture.componentRef.setInput('testResult', createConnectionResult());
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('测试通过');
        expect(fixture.nativeElement.textContent).toContain('Local configuration is complete.');
    });

    it('renders an unconfigured provider slot with a configure action', async () => {
        fixture.componentRef.setInput('config', null);
        await fixture.whenStable();
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        const card = fixture.nativeElement.querySelector('article') as HTMLElement | null;

        expect(text).toContain('飞书');
        expect(text).toContain('待配置');
        expect(text).toContain('secret 未配置');
        expect(text).toContain('配置');
        expect(card?.className).not.toContain('border-dashed');
    });

    it('emits edit and test actions to the parent page', () => {
        const editSpy = jest.fn();
        const testSpy = jest.fn();
        component.editRequested.subscribe(editSpy);
        component.testRequested.subscribe(testSpy);

        component.editRequested.emit(config);
        component.testRequested.emit(config);

        expect(editSpy).toHaveBeenCalledWith(config);
        expect(testSpy).toHaveBeenCalledWith(config);
    });

    it('emits configure action for an unconfigured provider slot', () => {
        const configureSpy = jest.fn();
        component.configureRequested.subscribe(configureSpy);

        component.configureRequested.emit(IdentityProvider.Feishu);

        expect(configureSpy).toHaveBeenCalledWith(IdentityProvider.Feishu);
    });
});
