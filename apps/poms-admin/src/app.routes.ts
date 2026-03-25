import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/components/app.layout';
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
                path: 'profile',
                loadChildren: () => import('./app/features/user-management/usermanagement.routes'),
                data: { breadcrumb: '个人中心' }
            },
            {
                path: 'platform/users',
                loadComponent: () => import('./app/features/user-management/user-list').then((c) => c.UserList),
                data: { breadcrumb: '用户管理' }
            },
            {
                path: 'platform/roles',
                loadComponent: () => import('./app/features/platform/role-list').then((c) => c.RoleList),
                data: { breadcrumb: '角色管理' }
            },
            {
                path: 'platform/org-units',
                loadComponent: () => import('./app/features/platform/org-unit-list').then((c) => c.OrgUnitList),
                data: { breadcrumb: '组织管理' }
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
