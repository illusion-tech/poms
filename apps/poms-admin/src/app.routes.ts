import { Routes } from '@angular/router';
import { AppLayout } from '@/app/layout/components/app.layout';
import { LandingLayout } from '@/app/layout/components/app.landinglayout';
import { AuthLayout } from '@/app/layout/components/app.authlayout';
import { Notfound } from '@poms/admin/demo/misc/notfound/notfound';
import { authGuard } from '@/app/core/auth/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('@poms/admin/features/dashboard/marketing/marketingdashboard').then((c) => c.MarketingDashboard),
                data: { breadcrumb: 'Marketing Dashboard' }
            },
            {
                path: 'dashboard-ecommerce',
                loadComponent: () => import('@poms/admin/features/dashboard/ecommerce/ecommercedashboard').then((c) => c.EcommerceDashboard),
                data: { breadcrumb: 'E-Commerce Dashboard' }
            },
            {
                path: 'dashboard-banking',
                loadComponent: () => import('@poms/admin/features/dashboard/banking/bankingdashboard').then((c) => c.BankingDashboard),
                data: { breadcrumb: 'Banking Dashboard' }
            },
            {
                path: 'uikit',
                data: { breadcrumb: 'UI Kit' },
                loadChildren: () => import('@poms/admin/demo/uikit/uikit.routes')
            },
            {
                path: 'documentation',
                data: { breadcrumb: 'Documentation' },
                loadComponent: () => import('@poms/admin/demo/documentation/documentation').then((c) => c.Documentation)
            },
            {
                path: 'pages',
                loadChildren: () => import('@poms/admin/demo/pages.routes'),
                data: { breadcrumb: 'Pages' }
            },
            {
                path: 'apps',
                loadChildren: () => import('@poms/admin/features/apps.routes'),
                data: { breadcrumb: 'Apps' }
            },

            {
                path: 'blocks',
                data: { breadcrumb: 'Free Blocks' },
                loadChildren: () => import('@poms/admin/demo/blocks/blocks.routes')
            },
            {
                path: 'ecommerce',
                loadChildren: () => import('@poms/admin/demo/ecommerce/ecommerce.routes'),
                data: { breadcrumb: 'E-Commerce' }
            },
            {
                path: 'profile',
                loadChildren: () => import('@poms/admin/features/user-management/usermanagement.routes'),
                data: { breadcrumb: 'User Management' }
            }
        ]
    },
    {
        path: 'landing',
        component: LandingLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('@poms/admin/features/landing').then((c) => c.Landing)
            },
            {
                path: 'about',
                loadComponent: () => import('@poms/admin/features/landing/about').then((c) => c.About)
            },
            {
                path: 'pricing',
                loadComponent: () => import('@poms/admin/features/landing/pricing').then((c) => c.Pricing)
            },
            {
                path: 'contact',
                loadComponent: () => import('@poms/admin/features/landing/contact').then((c) => c.Contact)
            },
            {
                path: 'oops',
                loadComponent: () => import('@poms/admin/demo/misc/oops/oops').then((c) => c.Oops)
            },
            {
                path: 'error',
                redirectTo: '/notfound'
            }
        ]
    },
    {
        path: 'auth',
        component: AuthLayout,
        children: [
            {
                path: 'login',
                loadComponent: () => import('@poms/admin/features/auth/login').then((c) => c.Login)
            },
            {
                path: 'register',
                loadComponent: () => import('@poms/admin/features/auth/register').then((c) => c.Register)
            },
            {
                path: 'verification',
                loadComponent: () => import('@poms/admin/features/auth/verification').then((c) => c.Verification)
            },
            {
                path: 'forgot-password',
                loadComponent: () => import('@poms/admin/features/auth/forgotpassword').then((c) => c.ForgotPassword)
            },
            {
                path: 'new-password',
                loadComponent: () => import('@poms/admin/features/auth/newpassword').then((c) => c.NewPassword)
            },
            {
                path: 'lock-screen',
                loadComponent: () => import('@poms/admin/features/auth/lockscreen').then((c) => c.LockScreen)
            },
            {
                path: 'access',
                loadComponent: () => import('@poms/admin/features/auth/access').then((c) => c.Access)
            }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
