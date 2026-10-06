

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api';

  getDashboardStats(month: number, year: number): Observable<any> {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<any>(
      `${this.BASE_URL}/Dashboard/stats?Month=${month}&Year=${year}`,
      { headers }
    );
  }

  getEmployees(): Observable<any> {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<any>(
      `${this.BASE_URL}/Employee/get`,
      { headers }
    );
  }

  getOrders(): Observable<any> {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<any>(
      `${this.BASE_URL}/Order/get`,
      { headers }
    );
  }
}