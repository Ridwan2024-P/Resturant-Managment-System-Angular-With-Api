import { Component } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
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

  errorMessage = '';

  onSubmit(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const email = this.loginForm.controls.email.value ?? '';
    const password = this.loginForm.controls.password.value ?? '';

    const loginData = {
      userName: email,
      password: password,
    };

    console.log('Sending login:', loginData);

    this.authService.login(loginData).subscribe({
      next: (response: any) => {
        console.log('Login response:', response);

        if (response.token) {
          localStorage.setItem('token', response.token);
        }

        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }

        if (response.refreshTokenExpiryTime) {
          localStorage.setItem('refreshTokenExpiryTime', response.refreshTokenExpiryTime);
        }

        if (response.user) {
          localStorage.setItem('user', JSON.stringify(response.user));

          console.log('User:', response.user);
        }

        const role =
          response.user?.role ??
          response.user?.Role ??
          response.user?.userRole ??
          response.user?.UserRole;

        if (role) {
          localStorage.setItem('role', role);
          console.log('Role:', role);
        }

        localStorage.removeItem('admin');
        localStorage.removeItem('employee');

        if (role === 'admin') {
          localStorage.setItem('admin', JSON.stringify(response.user));
        }

        if (role === 'employee') {
          localStorage.setItem('employee', JSON.stringify(response.user));
        }

        this.router.navigate(['/dashboard']);
      },

      error: (error) => {
        console.error('Login error:', error);

        this.errorMessage = 'Invalid username or password';

        this.cdr.detectChanges();
      },
    });
  }
}
