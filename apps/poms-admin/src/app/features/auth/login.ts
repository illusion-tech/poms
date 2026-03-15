import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { AppleWidget } from './components/applewidget';
import { AuthLogoWidget } from './components/authlogowidget';
import { GoogleWidget } from './components/googlewidget';

function resolveLoginError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
        if (err.status === 0) {
            return '无法连接到服务器，请检查网络或稍后重试';
        }
        if (err.status === 401) {
            return '用户名或密码错误，请重试';
        }
        if (err.status >= 500) {
            return '服务器出现错误，请稍后重试';
        }
    }
    return '登录失败，请稍后重试';
}

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, AuthLogoWidget, GoogleWidget, AppleWidget, RouterModule, InputTextModule, CheckboxModule, ButtonModule, FormField, FormRoot],
    template: `
        <section class="animate-fadein animate-duration-300 animate-ease-in relative lg:pb-14 lg:py-52 py-36">
            <div class="landing-container mx-auto relative z-10 px-12">
                <div class="relative mt-28 max-w-184 mx-auto">
                    <div
                        class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[4deg] lg:rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                    ></div>
                    <div
                        class="w-full h-full inset-0 bg-white/64 dark:bg-surface-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[4deg] lg:-rotate-[7deg] backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)] dark:shadow-sm"
                    ></div>
                    <form
                        [formRoot]="loginForm"
                        class="space-y-8 p-8 relative z-10 bg-white/64 dark:bg-surface-800 backdrop-blur-[90px] rounded-3xl shadow-[0px_87px_24px_0px_rgba(120,149,206,0.00),0px_56px_22px_0px_rgba(120,149,206,0.01),0px_31px_19px_0px_rgba(120,149,206,0.03),0px_14px_14px_0px_rgba(120,149,206,0.04),0px_3px_8px_0px_rgba(120,149,206,0.06)]"
                    >
                        <div class="pt-8 pb-8">
                            <div class="flex items-center justify-center">
                                <auth-logo-widget />
                            </div>
                            <h1 class="text-4xl lg:text-6xl font-semibold text-surface-950 dark:text-surface-0 text-center">登录</h1>
                            <p class="text-center lg:text-xl text-surface-500 dark:text-white/64 mt-6 max-w-sm mx-auto">输入用户名和密码访问您的账户。</p>
                        </div>
                        <div class="flex md:flex-row flex-col items-center gap-4">
                            <a
                                routerLink=""
                                class="w-full md:flex-1 px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium text-surface-700 dark:text-surface-200 border border-surface shadow-[0px_1px_2px_0px_rgba(18,18,23,0.05)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <google-widget />
                                使用 Google 登录
                            </a>
                            <a
                                routerLink=""
                                class="w-full md:flex-1 px-6 py-3 rounded-full flex items-center justify-center gap-2 font-medium text-surface-700 dark:text-surface-200 border border-surface shadow-[0px_1px_2px_0px_rgba(18,18,23,0.05)] hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                            >
                                <apple-widget />
                                使用 Apple 登录
                            </a>
                        </div>
                        <div class="flex items-center gap-4">
                            <span class="h-px w-full bg-primary-500/10"></span>
                            <span class="text-surface-400">或</span>
                            <span class="h-px w-full bg-primary-500/10"></span>
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="username" class="font-medium text-surface-500 dark:text-white/64">用户名</label>
                            <input pInputText id="username" [formField]="loginForm.username" class="w-full" />
                            @if (loginForm.username().touched() && loginForm.username().invalid()) {
                                <p class="text-red-500 text-xs mt-1">{{ loginForm.username().errors()[0]?.message }}</p>
                            }
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="password" class="font-medium text-surface-500 dark:text-white/64">密码</label>
                            <input pInputText id="password" type="password" [formField]="loginForm.password" class="w-full" />
                            @if (loginForm.password().touched() && loginForm.password().invalid()) {
                                <p class="text-red-500 text-xs mt-1">{{ loginForm.password().errors()[0]?.message }}</p>
                            }
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <p-checkbox name="remember" id="remember" binary />
                                <label for="remember" class="text-surface-500 dark:text-white/64">记住我</label>
                            </div>
                            <a routerLink="/auth/forgot-password" class="font-semibold text-primary">忘记密码？</a>
                        </div>
                        @if (error()) {
                            <p class="text-red-500 text-sm text-center -mt-4">{{ error() }}</p>
                        }
                        <p-button type="submit" styleClass="w-full" rounded [loading]="loading()">登录</p-button>
                        <div class="flex items-center justify-center gap-2 mt-8">
                            <span class="text-surface-500 dark:text-white/64">还没有账号？</span>
                            <a routerLink="/auth/register" class="text-primary">创建账号</a>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    `
})
export class Login {
    readonly #authStore = inject(AuthStore);
    readonly #router = inject(Router);
    readonly #route = inject(ActivatedRoute);

    loading = signal(false);
    error = signal<string | null>(null);

    loginModel = signal({ username: '', password: '' });
    loginForm = form(
        this.loginModel,
        (s) => {
            required(s.username, { message: '请输入用户名' });
            required(s.password, { message: '请输入密码' });
        },
        {
            submission: {
                action: async () => {
                    const { username, password } = this.loginModel();
                    this.loading.set(true);
                    this.error.set(null);
                    try {
                        await this.#authStore.login(username, password);
                        const returnUrl = this.#route.snapshot.queryParams['returnUrl'] ?? '/';
                        this.#router.navigateByUrl(returnUrl);
                    } catch (err: unknown) {
                        this.error.set(resolveLoginError(err));
                    } finally {
                        this.loading.set(false);
                    }
                }
            }
        }
    );
}
