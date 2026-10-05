import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);

  const admin = localStorage.getItem('admin');
  const employee = localStorage.getItem('employee');

  if (admin || employee) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};