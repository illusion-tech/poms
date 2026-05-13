import { provideHttpClient, withFetch } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { BASE_PATH, PomsApiConfiguration } from '@poms/shared-api-client';

export interface ProvidePomsApiClientOptions {
    basePath: string;
}

export function providePomsApiClient(options: ProvidePomsApiClientOptions): EnvironmentProviders {
    const providers: Provider[] = [
        { provide: BASE_PATH, useValue: options.basePath },
        {
            provide: PomsApiConfiguration,
            useValue: new PomsApiConfiguration({
                basePath: options.basePath,
                withCredentials: true
            })
        }
    ];

    return makeEnvironmentProviders([
        provideHttpClient(withFetch()),
        ...providers
    ]);
}

