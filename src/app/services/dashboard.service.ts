import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SalesRevenue {
  todaysSales: number;
  monthlySales: number;
  yearlySales: number;
  totalSales: number;
  todaysSalesAmount: number;
  monthlySalesAmount: number;
  yearlySalesAmount: number;
  totalSalesAmount: number;
  todaysExpenses: number;
  monthlyExpenses: number;
  yearlyExpenses: number;
  totalExpenses: number;
  todaysRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalRevenue: number;
}

export interface RecentOrder {
  id: string;
  orderNumber: string;
  amount: number;
  orderStatus: string;
  orderTime: string;
  tableNumber: string;
}

export interface TopSellingFood {
  id: number;
  name: string;
  price: number;
  image: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalEmployees: number;
  totalFoods: number;
  todaysOrders: number;
  todaysRevenue: number;
  totalTables: number;
  occupiedTables: number;
  salesRevenue: SalesRevenue;
  recentOrders: RecentOrder[];
  topSellingFoods: TopSellingFood[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  private readonly BASE_URL = 'https://bssrms.runasp.net/api';

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

 
  getDashboardStats(month: number, year: number): Observable<DashboardStats> {
    const params = new HttpParams().set('Month', month).set('Year', year);

    return this.http.get<DashboardStats>(`${this.BASE_URL}/Dashboard/stats`, {
      headers: this.getHeaders(),
      params,
    });
  }
}