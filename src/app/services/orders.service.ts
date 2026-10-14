import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    // responseType 'text': if the API answers with plain text (e.g. "Order created") instead of
    // JSON, Angular would otherwise report a parse error even though the order was saved.
    return this.http.post<any>(`${this.BASE_URL}/create`, data, {
      headers: this.getHeaders(),
      responseType: 'text' as 'json',
    });
  }
}