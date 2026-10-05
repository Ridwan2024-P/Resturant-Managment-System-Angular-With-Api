import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'https://bssrms.runasp.net/api/Auth';

  constructor(private http: HttpClient) {}

  login(data: {
    userName: string;
    password: string;
  }): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/SignIn`,
      data
    );
  }

  logout(): void {
    localStorage.clear();
  }
}