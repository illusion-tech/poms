import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access/lib/auth/auth.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
    let authenticated: ReturnType<typeof signal<boolean>>;
    let initialize: jest.Mock<Promise<void>, []>;
    let router: Router;

    async function runGuard(url = '/dashboard'): Promise<boolean | UrlTree> {
        return TestBed.runInInjectionContext(() => authGuard({} as never, { url } as never));
    }

    beforeEach(() => {
        authenticated = signal(false);
        initialize = jest.fn(async () => undefined);

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: AuthStore,
                    useValue: {
                        isAuthenticated: computed(() => authenticated()),
                        initialize
                    }
                }
            ]
        });

        router = TestBed.inject(Router);
    });

    it('allows an already authenticated user without reinitializing', async () => {
        authenticated.set(true);

        const result = await runGuard('/projects');

        expect(result).toBe(true);
        expect(initialize).not.toHaveBeenCalled();
    });

    it('bootstraps the cookie session before redirecting to login', async () => {
        const result = await runGuard('/projects');

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fprojects');
        expect(initialize).toHaveBeenCalledTimes(1);
    });

    it('allows navigation when bootstrap restores a cookie session', async () => {
        initialize.mockImplementation(async () => {
            authenticated.set(true);
        });

        const result = await runGuard('/projects');

        expect(result).toBe(true);
        expect(initialize).toHaveBeenCalledTimes(1);
    });
});
