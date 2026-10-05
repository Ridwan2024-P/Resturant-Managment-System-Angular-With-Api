import { Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HttpClient } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgForm,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideAlertTriangle } from '@ng-icons/lucide';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../services/auth';

@Component({
  imports: [
    HlmCardImports,
    HlmLabelImports,
    HlmInputImports,
    HlmAlertImports,
    NgIcon,
    HlmButtonImports,
    FormsModule,
    ReactiveFormsModule,
  ],
  host: { class: 'w-full max-w-md' },
  selector: 'app-login',
  providers: [provideIcons({ lucideAlertTriangle })],
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });
  // matcher = new MyErrorStateMatcher();

  errorMessage: string = '';
  onSubmit() {
    this.errorMessage = '';
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.loginForm.value;

    this.authService.getUsers().subscribe((users) => {
      const admin = users.find(
        (u) => u.email === email && u.password === password && u.role === 'admin',
      );
      const employee = users.find(
        (u) => u.email === email && u.password === password && u.role === 'employee',
      );
      localStorage.removeItem('admin');
      localStorage.removeItem('employee');

      if (admin) {
        const { password, ...adminData } = admin;

        localStorage.setItem('admin', JSON.stringify(adminData));
        localStorage.setItem('role', admin.role);

        this.router.navigate(['/dashboard']);
      } else if (employee) {
        const { password, ...employeeData } = employee;

        localStorage.setItem('employee', JSON.stringify(employeeData));
        localStorage.setItem('role', employee.role);

        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage = 'Invalid email or password';
        this.cdr.detectChanges();
      }
    });
  }
}
