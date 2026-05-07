import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { consumeExternalLoginReturnUrl } from './external-login-return-url';

function externalLoginCallbackErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
            return '无法连接到登录服务，请检查网络或稍后重试。';
        }
        if (err.status === 400) {
            return '外部登录参数或票据已失效，请重新发起登录。';
        }
        if (err.status === 401) {
            return '外部账号尚未绑定到可用的 POMS 用户，请联系管理员处理。';
        }
        if (err.status >= 500) {
            return '登录服务出现错误，请稍后重试。';
        }
    }
    return '外部登录没有完成，请重新发起登录。';
}

@Component({
    selector: 'app-identity-provider-callback',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative py-36 lg:py-52 lg:pb-14">
            <div class="landing-container relative z-10 mx-auto px-12">
                <div class="relative mx-auto mt-28 max-w-184">
                    <div
                        class="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 rotate-[4deg] rounded-3xl bg-white/64 shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] backdrop-blur-[90px] dark:bg-surface-800 dark:shadow-sm lg:rotate-[7deg]"
                    ></div>
                    <div
                        class="relative z-10 rounded-3xl bg-white/64 p-8 text-center shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] backdrop-blur-[90px] dark:bg-surface-800"
                    >
                        @if (loading()) {
                            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300">
                                <i class="pi pi-spin pi-spinner text-xl"></i>
                            </div>
                            <h1 class="mt-6 text-3xl font-semibold text-surface-950 dark:text-surface-0">正在完成登录</h1>
                            <p class="mx-auto mt-4 max-w-sm text-surface-500 dark:text-white/64">正在校验外部身份并创建 POMS 会话。</p>
                        } @else {
                            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                                <i class="pi pi-times text-xl"></i>
                            </div>
                            <h1 class="mt-6 text-3xl font-semibold text-surface-950 dark:text-surface-0">登录未完成</h1>
                            <p class="mx-auto mt-4 max-w-sm text-surface-500 dark:text-white/64">{{ error() }}</p>
                            <p-button label="返回登录页" routerLink="/auth/login" styleClass="mt-8 rounded-md!" />
                        }
                    </div>
                </div>
            </div>
        </section>
    `
})
export class IdentityProviderCallback {
    readonly #authStore = inject(AuthStore);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);

    constructor() {
        void this.completeExternalLogin();
    }

    async completeExternalLogin(): Promise<void> {
        const query = this.#route.snapshot.queryParamMap;
        const state = query.get('state');
        if (!state) {
            this.fail('外部登录参数缺少 state，请重新发起登录。');
            return;
        }

        try {
            await this.#authStore.completeExternalLoginCallback({
                state,
                code: query.get('code') ?? undefined,
                error: query.get('error') ?? undefined,
                errorDescription: query.get('error_description') ?? undefined
            });
            await this.#router.navigateByUrl(consumeExternalLoginReturnUrl());
        } catch (err: unknown) {
            this.fail(externalLoginCallbackErrorMessage(err));
        }
    }

    private fail(message: string): void {
        this.error.set(message);
        this.loading.set(false);
    }
}
