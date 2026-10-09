import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './auth.guard';
import { Profile } from './header/profile/profile';
import { Employees } from './employees/employees';

export const routes: Routes = [
     {
        path:'dashboard',component:Dashboard, canActivate: [authGuard],
    },
    {
        path:'', component:Login, pathMatch: 'full'
    },{
        path:'login',component:Login
    },
    { path: 'profile',   loadComponent: () =>
    import('./header/profile/profile').then(m => m.Profile) },
    {
       path:'employee',component:Employees, canActivate: [authGuard],
    }
    
];
