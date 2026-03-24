import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/components/app.layout';
import { LandingLayout } from './app/layout/components/app.landinglayout';
import { AuthLayout } from './app/layout/components/app.authlayout';
import { Notfound } from './app/demo/misc/notfound/notfound';
import { authGuard } from './app/core/auth/auth.guard';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'dashboard',
                loadComponent: () => import('./app/features/dashboard/workbench').then((c) => c.Workbench),
                data: { breadcrumb: '工作台' }
            },
            {
                path: 'projects',
                loadComponent: () => import('./app/features/project/project-list').then((c) => c.ProjectList),
                data: { breadcrumb: '项目管理' }
            },
            {
                path: 'projects/:id',
                loadComponent: () => import('./app/features/project/project-detail').then((c) => c.ProjectDetail),
                data: { breadcrumb: '项目详情' }
            },
            {
                path: 'contracts',
                loadComponent: () => import('./app/features/contract/contract-list').then((c) => c.ContractList),
                data: { breadcrumb: '合同管理' }
            },
            {
                path: 'contracts/:id',
                loadComponent: () => import('./app/features/contract/contract-detail').then((c) => c.ContractDetail),
                data: { breadcrumb: '合同详情' }
            },
            {
                path: 'demo-marketing',
                loadComponent: () => import('./app/features/dashboard/marketing/marketingdashboard').then((c) => c.MarketingDashboard),
                data: { breadcrumb: 'Marketing Dashboard' }
            },
            {
                path: 'dashboard-ecommerce',
                loadComponent: () => import('./app/features/dashboard/ecommerce/ecommercedashboard').then((c) => c.EcommerceDashboard),
                data: { breadcrumb: 'E-Commerce Dashboard' }
            },
            {
                path: 'dashboard-banking',
                loadComponent: () => import('./app/features/dashboard/banking/bankingdashboard').then((c) => c.BankingDashboard),
                data: { breadcrumb: 'Banking Dashboard' }
            },
            {
                path: 'uikit',
                data: { breadcrumb: 'UI Kit' },
                loadChildren: () => import('./app/demo/uikit/uikit.routes')
            },
            {
                path: 'documentation',
                data: { breadcrumb: 'Documentation' },
                loadComponent: () => import('./app/demo/documentation/documentation').then((c) => c.Documentation)
            },
            {
                path: 'pages',
                loadChildren: () => import('./app/demo/pages.routes'),
                data: { breadcrumb: 'Pages' }
            },
            {
                path: 'apps',
                loadChildren: () => import('./app/features/apps.routes'),
                data: { breadcrumb: 'Apps' }
            },

            {
                path: 'blocks',
                data: { breadcrumb: 'Free Blocks' },
                loadChildren: () => import('./app/demo/blocks/blocks.routes')
            },
            {
                path: 'ecommerce',
                loadChildren: () => import('./app/demo/ecommerce/ecommerce.routes'),
                data: { breadcrumb: 'E-Commerce' }
            },
            {
                path: 'profile',
                loadChildren: () => import('./app/features/user-management/usermanagement.routes'),
                data: { breadcrumb: 'User Management' }
            },
            {
                path: 'platform/users',
                loadComponent: () => import('./app/features/user-management/user-list').then((c) => c.UserList),
                data: { breadcrumb: '用户管理' }
            }
        ]
    },
    {
        path: 'landing',
        component: LandingLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('./app/features/landing').then((c) => c.Landing)
            },
            {
                path: 'about',
                loadComponent: () => import('./app/features/landing/about').then((c) => c.About)
            },
            {
                path: 'pricing',
                loadComponent: () => import('./app/features/landing/pricing').then((c) => c.Pricing)
            },
            {
                path: 'contact',
                loadComponent: () => import('./app/features/landing/contact').then((c) => c.Contact)
            },
            {
                path: 'oops',
                loadComponent: () => import('./app/demo/misc/oops/oops').then((c) => c.Oops)
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
                loadComponent: () => import('./app/features/auth/login').then((c) => c.Login)
            },
            {
                path: 'register',
                loadComponent: () => import('./app/features/auth/register').then((c) => c.Register)
            },
            {
                path: 'verification',
                loadComponent: () => import('./app/features/auth/verification').then((c) => c.Verification)
            },
            {
                path: 'forgot-password',
                loadComponent: () => import('./app/features/auth/forgotpassword').then((c) => c.ForgotPassword)
            },
            {
                path: 'new-password',
                loadComponent: () => import('./app/features/auth/newpassword').then((c) => c.NewPassword)
            },
            {
                path: 'lock-screen',
                loadComponent: () => import('./app/features/auth/lockscreen').then((c) => c.LockScreen)
            },
            {
                path: 'access',
                loadComponent: () => import('./app/features/auth/access').then((c) => c.Access)
            }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
