import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { IdentityProviderCallback } from './identity-provider-callback';

describe('IdentityProviderCallback', () => {
    let fixture: ComponentFixture<IdentityProviderCallback>;
    let authStoreMock: {
        completeExternalLoginCallback: jest.Mock;
    };
    let routerMock: {
        navigateByUrl: jest.Mock;
    };

    async function createComponent(queryParams: Record<string, string | undefined>): Promise<IdentityProviderCallback> {
        await TestBed.configureTestingModule({
            imports: [IdentityProviderCallback],
            providers: [
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            queryParamMap: convertToParamMap(queryParams)
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(IdentityProviderCallback);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        return fixture.componentInstance;
    }

    beforeEach(() => {
        sessionStorage.clear();
        TestBed.resetTestingModule();
        authStoreMock = {
            completeExternalLoginCallback: jest.fn().mockResolvedValue(undefined)
        };
        routerMock = {
            navigateByUrl: jest.fn().mockResolvedValue(true)
        };
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('exchanges callback params for a POMS session and returns to the stored local URL', async () => {
        sessionStorage.setItem('poms_external_login_return_url', '/profile');

        await createComponent({
            state: 'callback-state',
            code: 'auth-code'
        });

        expect(authStoreMock.completeExternalLoginCallback).toHaveBeenCalledWith({
            state: 'callback-state',
            code: 'auth-code',
            error: undefined,
            errorDescription: undefined
        });
        expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/profile');
        expect(sessionStorage.getItem('poms_external_login_return_url')).toBeNull();
    });

    it('shows a local error when callback state is missing', async () => {
        const component = await createComponent({
            code: 'auth-code'
        });

        expect(component.loading()).toBe(false);
        expect(component.error()).toBe('外部登录参数缺少 state，请重新发起登录。');
        expect(authStoreMock.completeExternalLoginCallback).not.toHaveBeenCalled();
        expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    });

    it('passes provider error parameters through to the generated client flow', async () => {
        await createComponent({
            state: 'callback-state',
            error: 'access_denied',
            error_description: 'user denied'
        });

        expect(authStoreMock.completeExternalLoginCallback).toHaveBeenCalledWith({
            state: 'callback-state',
            code: undefined,
            error: 'access_denied',
            errorDescription: 'user denied'
        });
    });
});
