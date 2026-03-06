import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { BASE_PATH } from '@poms/shared-api-client';
import { POMS_AUTH_TOKEN_PROVIDER, type AuthTokenProvider } from './poms-api.tokens';
import { pomsAuthInterceptor } from './poms-auth.interceptor';

export interface ProvidePomsApiClientOptions {
    basePath: string;
    getAccessToken?: AuthTokenProvider;
}

export function providePomsApiClient(options: ProvidePomsApiClientOptions): EnvironmentProviders {
    const providers: Provider[] = [
        { provide: BASE_PATH, useValue: options.basePath },
        { provide: POMS_AUTH_TOKEN_PROVIDER, useValue: options.getAccessToken ?? (() => undefined) }
    ];

    return makeEnvironmentProviders([
        provideHttpClient(withFetch(), withInterceptors([pomsAuthInterceptor])),
        ...providers
    ]);
}

