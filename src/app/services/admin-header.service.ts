import { Injectable, inject } from '@angular/core';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, BehaviorSubject, tap } from 'rxjs';

export interface UserData {
  id: string;
  fullName: string;
  email: string;
  image: string | null;
  phoneNumber: string;
  userName: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminHeaderService {
  private http = inject(HttpClient);

  private readonly API_URL = 'https://bssrms.runasp.net/api/Auth/profile';

  private userSubject = new BehaviorSubject<UserData | null>(this.getStoredUser());

  user$ = this.userSubject.asObservable();

  getProfile(): Observable<UserData> {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    console.log('PROFILE TOKEN:', token);

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<UserData>(this.API_URL, {
        headers,
      })
      .pipe(
        tap((user) => {
          this.userSubject.next(user);
          localStorage.setItem('user', JSON.stringify(user));
        }),
      );
  }

 getUser(): UserData | null {

  try {

    const rawUser =
      localStorage.getItem('user');

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser) as UserData;

  } catch (error) {

    console.error(
      'Failed to parse user:',
      error
    );

    return null;
  }
}

  private getStoredUser(): UserData | null {
    try {
      const rawUser = localStorage.getItem('user');

      if (!rawUser) {
        return null;
      }

      return JSON.parse(rawUser) as UserData;
    } catch (error) {
      console.error('Failed to parse stored user:', error);

      return null;
    }
  }

  getUserName(): string {
    return this.getUser()?.fullName ?? 'User';
  }

  getUsername(): string {
    return this.getUser()?.userName ?? '';
  }

  getEmail(): string {
    return this.getUser()?.email ?? '';
  }

  getPhoneNumber(): string {
    return this.getUser()?.phoneNumber ?? '';
  }

  getUserId(): string {
    return this.getUser()?.id ?? '';
  }

  getAvatarUrl(): string {
    return this.getUser()?.image ?? '';
  }

  getInitials(): string {
    const fullName = this.getUserName();

    const initials = fullName
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();

    return initials || 'U';
  }

  getProfileDetails(): {
    label: string;
    value: string;
    icon: string;
  }[] {
    const user = this.getUser();

    if (!user) {
      return [];
    }

    return [
      {
        label: 'Full name',
        value: user.fullName,
        icon: 'fa-regular fa-user',
      },

      {
        label: 'Username',
        value: user.userName,
        icon: 'fa-solid fa-at',
      },

      {
        label: 'Email',
        value: user.email,
        icon: 'fa-regular fa-envelope',
      },

      {
        label: 'Phone',
        value: user.phoneNumber,
        icon: 'fa-solid fa-phone',
      },

      {
        label: 'User ID',
        value: user.id,
        icon: 'fa-solid fa-id-badge',
      },
    ];
  }

  clearUser(): void {
    this.userSubject.next(null);

    localStorage.removeItem('user');
  }
}
