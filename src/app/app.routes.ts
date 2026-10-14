import { Routes } from '@angular/router';
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';
import { authGuard } from './auth.guard';
import { Profile } from './header/profile/profile';
import { Employees } from './employees/employees';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: '',
    component: Login,
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'profile',
    loadComponent: () => import('./header/profile/profile').then((m) => m.Profile), canActivate: [authGuard],
  },
  {
    path: 'employee',
    loadComponent: () => import('./employees/employees').then((m) => m.Employees), canActivate: [authGuard],
  },
  {
    path: 'tables',
    loadComponent: () => import('./tables/tables').then((m) => m.Tables), canActivate: [authGuard],
  },
  {
    path: 'food',
    loadComponent: () => import('./foods/foods').then((m) => m.Foods), canActivate: [authGuard],
  },
   {
    path: 'expense',
    loadComponent: () => import('./expenses/expenses').then((m) => m.Expenses),canActivate: [authGuard],
  },
  {
    path: 'new-order',
    loadComponent: () => import('./new-orders/new-orders').then((m) => m.NewOrder),canActivate: [authGuard],
  },
   {
    path: 'order',
    loadComponent: () => import('./orders/orders').then((m) => m.Orders),canActivate: [authGuard],
  },
];
