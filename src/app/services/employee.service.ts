import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api/Employee';

  private readonly LIST_URL = `${this.BASE_URL}/datatable`;

  private readonly CREATE_URL = `${this.BASE_URL}/create`;

  private readonly UPDATE_URL = `${this.BASE_URL}/update`;

  private readonly DELETE_URL = `${this.BASE_URL}/delete`;

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('token') ??
      localStorage.getItem('accessToken') ??
      localStorage.getItem('access_token');

    let headers = new HttpHeaders({
      Accept: 'application/json',
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  getEmployees(page: number = 1, perPage: number = 10): Observable<any> {
    const params = new HttpParams().set('Page', page).set('Per_Page', perPage);

    return this.http.get<any>(this.LIST_URL, {
      headers: this.getHeaders(),
      params,
    });
  }

  createEmployee(data: EmployeePayload): Observable<any> {
    return this.http.post<any>(this.CREATE_URL, data, {
      headers: this.getHeaders(),
    });
  }

  addEmployee(data: EmployeePayload): Observable<any> {
    return this.createEmployee(data);
  }

  updateEmployee(id: string | number, data: EmployeePayload): Observable<any> {
    const employeeId = encodeURIComponent(String(id));

    return this.http.put<any>(`${this.UPDATE_URL}/${employeeId}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteEmployee(id: string | number): Observable<any> {
    const employeeId = encodeURIComponent(String(id));

    return this.http.delete<any>(`${this.DELETE_URL}/${employeeId}`, {
      headers: this.getHeaders(),
    });
  }
}

export interface EmployeePayload {
  designation: string;
  joinDate: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  dob: string;
  nid: string;
  genderId: number;
  image: string;
  base64: string;
}
