import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
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
  showPassword = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

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

    this.authService.login(loginData).subscribe({
      next: (response: any) => {
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
        }

        const role =
          response.user?.role ??
          response.user?.Role ??
          response.user?.userRole ??
          response.user?.UserRole;

        if (role) {
          localStorage.setItem('role', role);
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
        this.errorMessage = 'Invalid email or password.';
        this.cdr.detectChanges();
      },
    });
  }
}
