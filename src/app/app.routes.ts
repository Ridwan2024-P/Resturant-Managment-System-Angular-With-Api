import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './auth.guard';
export const routes: Routes = [
     {
        path:'dashboard',component:Dashboard, canActivate: [authGuard]
    },
    {
        path:'', component:Login, pathMatch: 'full'
    },{
        path:'login',component:Login
    }
];
