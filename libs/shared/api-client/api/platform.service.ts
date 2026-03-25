/**
 * POMS API
 *
 *
 *
 * NOTE: This class is auto generated style-compatible shim written manually until OpenAPI regeneration catches up.
 */

import { Inject, Injectable, Optional } from '@angular/core';
import { HttpClient, HttpContext, HttpEvent, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { PlatformUserList } from '../model/platform-user-list';
import { BASE_PATH } from '../variables';
import { PomsApiConfiguration } from '../configuration';
import { BaseService } from '../api.base.service';

@Injectable({
    providedIn: 'root'
})
export class PlatformApi extends BaseService {
    constructor(
        protected httpClient: HttpClient,
        @Optional() @Inject(BASE_PATH) basePath: string | string[],
        @Optional() configuration?: PomsApiConfiguration
    ) {
        super(basePath, configuration);
    }

    public platformControllerListUsers(observe?: 'body', reportProgress?: boolean, options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext; transferCache?: boolean }): Observable<PlatformUserList>;
    public platformControllerListUsers(observe?: 'response', reportProgress?: boolean, options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext; transferCache?: boolean }): Observable<HttpResponse<PlatformUserList>>;
    public platformControllerListUsers(observe?: 'events', reportProgress?: boolean, options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext; transferCache?: boolean }): Observable<HttpEvent<PlatformUserList>>;
    public platformControllerListUsers(observe: any = 'body', reportProgress: boolean = false, options?: { httpHeaderAccept?: 'application/json'; context?: HttpContext; transferCache?: boolean }): Observable<any> {
        let localVarHeaders = this.defaultHeaders;
        localVarHeaders = this.configuration.addCredentialToHeaders('bearer', 'Authorization', localVarHeaders, 'Bearer ');

        const localVarHttpHeaderAcceptSelected: string | undefined = options?.httpHeaderAccept ?? 'application/json';
        if (localVarHttpHeaderAcceptSelected !== undefined) {
            localVarHeaders = localVarHeaders.set('Accept', localVarHttpHeaderAcceptSelected);
        }

        const localVarHttpContext: HttpContext = options?.context ?? new HttpContext();
        const localVarTransferCache: boolean = options?.transferCache ?? true;

        let responseType_: 'text' | 'json' | 'blob' = 'json';
        if (localVarHttpHeaderAcceptSelected?.startsWith('text')) {
            responseType_ = 'text';
        }

        const localVarPath = `/api/platform/users`;
        const { basePath, withCredentials } = this.configuration;

        return this.httpClient.request<PlatformUserList>('get', `${basePath}${localVarPath}`, {
            context: localVarHttpContext,
            responseType: responseType_ as any,
            ...(withCredentials ? { withCredentials } : {}),
            headers: localVarHeaders,
            observe,
            ...(localVarTransferCache !== undefined ? { transferCache: localVarTransferCache } : {}),
            reportProgress
        });
    }
}
