import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderPayload, OrderService } from './orders.service';

export interface CartFood {
  id: number;
  name: string;
  description?: string;
  price: number;
  finalPrice: number;
  image?: string;
}

export interface CartLine {
  food: CartFood;
  quantity: number;
}

export interface CartTable {
  id: number;
  number: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly orderService = inject(OrderService);

  readonly lines = signal<CartLine[]>([]);
  readonly selectedTable = signal<CartTable | null>(null);
  readonly phone = signal('');
  readonly open = signal(false);
  readonly placing = signal(false);
  readonly error = signal('');
  readonly successMessage = signal('');

  readonly count = computed(() => this.lines().reduce((sum, l) => sum + l.quantity, 0));
  readonly subTotal = computed(() =>
    this.lines().reduce((sum, l) => sum + l.food.finalPrice * l.quantity, 0),
  );

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  add(food: CartFood): void {
    this.lines.update((lines) => {
      const exists = lines.some((l) => l.food.id === food.id);

      return exists
        ? lines.map((l) => (l.food.id === food.id ? { ...l, quantity: l.quantity + 1 } : l))
        : [...lines, { food, quantity: 1 }];
    });

    this.successMessage.set('');
    this.error.set('');
  }

  setQuantity(foodId: number, value: number | string): void {
    const n = Math.floor(Number(value));
    const quantity = Number.isFinite(n) && n >= 1 ? n : 1;

    this.lines.update((lines) => lines.map((l) => (l.food.id === foodId ? { ...l, quantity } : l)));
  }

  remove(foodId: number): void {
    this.lines.update((lines) => lines.filter((l) => l.food.id !== foodId));
  }

  selectTable(table: CartTable): void {
    this.selectedTable.set(table);
    this.error.set('');
  }

  openCart(): void {
    this.error.set('');
    this.open.set(true);
  }

  closeCart(): void {
    if (this.placing()) return;
    this.open.set(false);
  }

  reset(): void {
    this.lines.set([]);
    this.selectedTable.set(null);
    this.phone.set('');
    this.open.set(false);
    this.placing.set(false);
    this.error.set('');
    this.successMessage.set('');
  }

  private makeOrderNumber(table: CartTable): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${yy}${mm}${dd}-${table.number.replace(/\s+/g, '')}-${rand}`;
  }

  confirmOrder(): void {
    this.error.set('');

    if (this.placing()) return;

    const table = this.selectedTable();
    const lines = this.lines();

    if (!table) {
      this.error.set('Please select a table first.');
      return;
    }

    if (!lines.length) {
      this.error.set('Your cart is empty.');
      return;
    }

    if (!Number.isFinite(table.id) || lines.some((l) => !Number.isFinite(l.food.id))) {
      this.error.set(
        'Table or food ID is missing from the API response, so the order cannot be sent.',
      );
      return;
    }

    const phone = this.phone().trim();

    const payload: OrderPayload = {
      tableId: table.id,
      orderNumber: this.makeOrderNumber(table),
      amount: Math.round(this.subTotal() * 100) / 100,
      items: lines.map((l) => ({
        foodId: l.food.id,
        quantity: l.quantity,
        unitPrice: l.food.finalPrice,
        totalPrice: Math.round(l.food.finalPrice * l.quantity * 100) / 100,
      })),
    };

    if (phone) payload.phoneNumber = phone;

    this.placing.set(true);

    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.placing.set(false);
        this.open.set(false);
        this.lines.set([]);
        this.phone.set('');
        this.successMessage.set(`Order ${payload.orderNumber} placed for table ${table.number}.`);

        if (this.successTimer) clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('CREATE ORDER ERROR:', error.status, error.error);
        console.error('ORDER PAYLOAD SENT:', payload);
        this.placing.set(false);
        this.error.set(this.orderErrorText(error));
      },
    });
  }

  private orderErrorText(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach the server. Check your internet connection.';
    if (error.status === 401) return 'Unauthorized. Please log in again.';

    const body: any = error.error;

    if (typeof body === 'string' && body.trim()) return body.slice(0, 300);

    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.entries(body.errors)[0] as [string, any];
      if (first) {
        const msg = Array.isArray(first[1]) ? first[1][0] : first[1];
        return `${first[0]}: ${msg}`;
      }
    }

    const message = body?.message ?? body?.title ?? body?.error ?? body?.detail;
    if (message) return `${message} (HTTP ${error.status})`;

    return `Could not place the order (HTTP ${error.status}). Open the browser console for details.`;
  }
}
