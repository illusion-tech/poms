import { Routes } from '@angular/router';

export default [
    {
        path: 'cms',
        loadChildren: () => import('@poms/admin/features/cms/cms.routes'),
        data: { breadcrumb: 'CMS' }
    },
    {
        path: 'chat',
        loadComponent: () => import('@poms/admin/features/chat').then((c) => c.Chat),
        data: { breadcrumb: 'Chat' }
    },
    {
        path: 'files',
        loadComponent: () => import('@poms/admin/features/files').then((c) => c.Files),
        data: { breadcrumb: 'Files' }
    },
    {
        path: 'mail',
        loadChildren: () => import('@poms/admin/features/mail/mail.routes'),
        data: { breadcrumb: 'Mail' }
    },
    {
        path: 'tasklist',
        loadComponent: () => import('@poms/admin/features/tasklist').then((c) => c.TaskList),
        data: { breadcrumb: 'Task List' }
    }
] as Routes;
