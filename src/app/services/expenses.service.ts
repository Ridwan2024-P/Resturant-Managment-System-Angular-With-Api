import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ExpensePayload {
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  notes: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExpenseService {
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api/Expense';
  private readonly LIST_URL = `${this.BASE_URL}/datatable`;
  private readonly CREATE_URL = `${this.BASE_URL}/create`;
  private readonly UPDATE_URL = `${this.BASE_URL}/update`;
  private readonly DELETE_URL = `${this.BASE_URL}/delete`;

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

  getExpenses(
    page: number = 1,
    perPage: number = 10,
    search: string = '',
    sort: string = '',
  ): Observable<any> {
    let params = new HttpParams().set('Page', page).set('Per_Page', perPage);

    if (search.trim()) params = params.set('Search', search.trim());
    if (sort.trim()) params = params.set('Sort', sort.trim());

    return this.http.get<any>(this.LIST_URL, { headers: this.getHeaders(), params });
  }

  createExpense(data: ExpensePayload): Observable<any> {
    return this.http.post<any>(this.CREATE_URL, data, { headers: this.getHeaders() });
  }

  updateExpense(id: string | number, data: ExpensePayload): Observable<any> {
    return this.http.put<any>(`${this.UPDATE_URL}/${encodeURIComponent(String(id))}`, data, {
      headers: this.getHeaders(),
    });
  }

  deleteExpense(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.DELETE_URL}/${encodeURIComponent(String(id))}`, {
      headers: this.getHeaders(),
    });
  }
}