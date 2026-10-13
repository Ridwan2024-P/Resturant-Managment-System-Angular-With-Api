import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TablePayload {
  tableNumber: string;
  numberOfSeats: number;
  image: string;
  base64: string;
}

export interface EmployeeTablePayload {
  employeeId: string;
  tableId: number;
}

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api/Table';
  private readonly EMP_TABLE_URL = 'https://bssrms.runasp.net/api/EmployeeTable';

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    let headers = new HttpHeaders({ Accept: 'application/json' });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }


  getTables(page: number = 1, perPage: number = 10): Observable<any> {
    const params = new HttpParams().set('Page', page).set('Per_Page', perPage);

    return this.http.get<any>(`${this.BASE_URL}/datatable`, {
      headers: this.getHeaders(),
      params,
    });
  }

 
  getAllTables(): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/get`, { headers: this.getHeaders() });
  }

 
  createTable(data: TablePayload): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/create`, data, { headers: this.getHeaders() });
  }

 
  updateTable(id: string | number, data: TablePayload): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/update/${encodeURIComponent(String(id))}`, data, {
      headers: this.getHeaders(),
    });
  }

 
  deleteTable(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/delete/${encodeURIComponent(String(id))}`, {
      headers: this.getHeaders(),
    });
  }

  
  assignEmployee(data: EmployeeTablePayload): Observable<any> {
    return this.http.post<any>(`${this.EMP_TABLE_URL}/create`, data, {
      headers: this.getHeaders(),
    });
  }

 
  assignEmployees(data: EmployeeTablePayload[]): Observable<any> {
    return this.http.post<any>(`${this.EMP_TABLE_URL}/create-range`, data, {
      headers: this.getHeaders(),
    });
  }
}