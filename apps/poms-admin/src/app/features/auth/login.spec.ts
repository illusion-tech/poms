import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, IdentityProvider, type EnabledLoginProviderSummary } from '@poms/admin-data-access';
import { Login } from './login';

function createProvider(overrides: Partial<EnabledLoginProviderSummary> = {}): EnabledLoginProviderSummary {
    return {
        id: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        displayName: '飞书生产租户',
        loginScopes: ['contact:user.base:readonly'],
        ...overrides
    };
}

describe('Login external providers', () => {
    let fixture: ComponentFixture<Login>;
    let component: Login;
    let authStoreMock: {
        loadEnabledLoginProviders: jest.Mock;
        authorizeExternalLogin: jest.Mock;
        login: jest.Mock;
    };

    beforeEach(async () => {
        sessionStorage.clear();

        authStoreMock = {
            loadEnabledLoginProviders: jest.fn().mockResolvedValue([createProvider()]),
            authorizeExternalLogin: jest.fn().mockResolvedValue({
                authorizeUrl: 'https://accounts.feishu.cn/oauth',
                stateExpiresAt: '2026-05-07T08:30:00.000Z'
            }),
            login: jest.fn().mockResolvedValue(undefined)
        };
        await TestBed.configureTestingModule({
            imports: [Login],
            providers: [
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParams: {
                                returnUrl: '/profile'
                            }
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigateByUrl: jest.fn()
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('renders enabled provider login buttons from the public provider list', () => {
        const text = fixture.nativeElement.textContent;
        const logo = fixture.nativeElement.querySelector('img[alt="飞书 logo"]') as HTMLImageElement | null;

        expect(authStoreMock.loadEnabledLoginProviders).toHaveBeenCalledWith();
        expect(text).toContain('使用 飞书生产租户 登录');
        expect(text).not.toContain('使用 Google 登录');
        expect(text).not.toContain('使用 Apple 登录');
        expect(logo?.getAttribute('src')).toBe('/identity-providers/feishu.svg');
    });

    it('stores safe return url and redirects to provider authorize URL', async () => {
        const redirectSpy = jest.spyOn(component, 'redirectTo').mockImplementation(() => undefined);

        await component.startExternalLogin(createProvider());

        expect(authStoreMock.authorizeExternalLogin).toHaveBeenCalledWith('identity-provider-1');
        expect(sessionStorage.getItem('poms_external_login_return_url')).toBe('/profile');
        expect(redirectSpy).toHaveBeenCalledWith('https://accounts.feishu.cn/oauth');
    });

    it('falls back unsafe return url to the app root before external authorization', async () => {
        TestBed.inject(ActivatedRoute).snapshot.queryParams['returnUrl'] = 'https://evil.example.com';
        jest.spyOn(component, 'redirectTo').mockImplementation(() => undefined);

        await component.startExternalLogin(createProvider());

        expect(sessionStorage.getItem('poms_external_login_return_url')).toBe('/');
    });
});

describe('Login session notice', () => {
    let authStoreMock: {
        loadEnabledLoginProviders: jest.Mock;
        authorizeExternalLogin: jest.Mock;
        login: jest.Mock;
    };

    beforeEach(async () => {
        authStoreMock = {
            loadEnabledLoginProviders: jest.fn().mockResolvedValue([]),
            authorizeExternalLogin: jest.fn(),
            login: jest.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [Login],
            providers: [
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParams: {
                                returnUrl: '/customers',
                                reason: 'session_expired'
                            }
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: {
                        navigateByUrl: jest.fn()
                    }
                }
            ]
        }).compileComponents();
    });

    it('shows a clear session expired prompt on the login page', async () => {
        const fixture = TestBed.createComponent(Login);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('登录已过期，请重新登录后继续。');
    });
});
