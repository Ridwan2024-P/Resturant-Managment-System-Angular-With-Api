import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OrderItemPayload {
  foodId: number;
  foodPackageId?: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderPayload {
  tableId: number;
  orderNumber: string;
  amount: number;
  phoneNumber?: string;
  items: OrderItemPayload[];
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api/Order';

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

  createOrder(data: OrderPayload): Observable<any> {
    return this.http.post<any>(`${this.BASE_URL}/create`, data, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }

  getOrdersPage(
    page: number = 1,
    perPage: number = 9,
    status: number | null = null,
    search: string = '',
    sort: string = '',
  ): Observable<any> {
    let params = new HttpParams().set('Page', page).set('Per_Page', perPage);

    if (status !== null) params = params.set('Status', status);
    if (search.trim()) params = params.set('Search', search.trim());
    if (sort.trim()) params = params.set('Sort', sort.trim());

    return this.http.get<any>(`${this.BASE_URL}/datatable`, { headers: this.getHeaders(), params });
  }

  getOrderById(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.BASE_URL}/get/${encodeURIComponent(String(id))}`, {
      headers: this.getHeaders(),
    });
  }

  updateOrder(id: string | number, data: OrderPayload): Observable<any> {
    return this.http.put<any>(`${this.BASE_URL}/update/${encodeURIComponent(String(id))}`, data, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }

  updateStatus(id: string | number, status: number): Observable<any> {
    return this.http.put<any>(
      `${this.BASE_URL}/update-status/${encodeURIComponent(String(id))}`,
      { status, orderStatus: status },
      { headers: this.getHeaders(), responseType: 'text' as 'json' },
    );
  }

  deleteOrder(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.BASE_URL}/delete/${encodeURIComponent(String(id))}`, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }
}
