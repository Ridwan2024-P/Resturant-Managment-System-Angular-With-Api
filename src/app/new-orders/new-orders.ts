import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

import { FoodService } from '../services/food.service';
import { TableService } from '../services/Tables.service';
import { OrderPayload, OrderService } from '../services/orders.service';

interface TableCard {
  id: number;
  number: string;
  seats: number | null;
  occupied: boolean;
  image?: string;
}

interface FoodCard {
  id: number;
  name: string;
  description: string;
  price: number;
  finalPrice: number;
  image?: string;
}

interface CartLine {
  food: FoodCard;
  quantity: number;
}

const API_HOST = 'https://bssrms.runasp.net';
const FOOD_IMAGE_FOLDER = '/images/food/';
const TABLE_IMAGE_FOLDER = '/images/table/';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './new-orders.html',
  styleUrl: './new-orders.css',
})
export class NewOrder implements OnInit {
  private readonly foodService = inject(FoodService);
  private readonly tableService = inject(TableService);
  private readonly orderService = inject(OrderService);
  private readonly cdr = inject(ChangeDetectorRef);

  loadingTables = true;
  loadingFoods = true;
  placing = false;

  errorMessage = '';
  cartError = '';
  successMessage = '';

  tables: TableCard[] = [];
  foods: FoodCard[] = [];

  selectedTableId: number | null = null;
  search = '';

  cart: CartLine[] = [];
  cartOpen = false;
  phone = '';

  failedImages = new Set<string>();

  ngOnInit(): void {
    this.loadTables();
    this.loadFoods();
  }

  private pick(obj: any, keys: string[]): any {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
      const value = obj[key];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return undefined;
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) return response;
    for (const key of ['data', 'items', 'tables', 'foods', 'result']) {
      if (Array.isArray(response?.[key])) return response[key];
    }
    return [];
  }

  private imageUrl(value: unknown, folder: string): string | undefined {
    if (typeof value !== 'string') return undefined;
    const image = value.trim().replace(/\\/g, '/');
    if (!image) return undefined;

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(image)) return image;
    if (!image.includes('/')) return `${API_HOST}${folder}${encodeURIComponent(image)}`;
    return image.startsWith('/') ? `${API_HOST}${image}` : `${API_HOST}/${image}`;
  }

  private discounted(price: number, type: string, discount: number): number {
    let result = price;
    if (/^per/i.test(type)) result = price - (price * discount) / 100;
    else if (/^(flat|fix)/i.test(type)) result = price - discount;
    return Math.max(Math.round(result * 100) / 100, 0);
  }

  loadTables(): void {
    this.loadingTables = true;

    this.tableService.getTables(1, 100).subscribe({
      next: (response: any) => {
        this.tables = this.extractList(response)
          .filter((t: any) => t != null)
          .map((raw: any): TableCard => {
            const t = raw?.table ?? raw;
            const status = String(this.pick(t, ['status', 'tableStatus']) ?? '').toLowerCase();
            const flag = this.pick(t, ['isOccupied', 'occupied']);

            return {
              id: Number(this.pick(t, ['id', 'tableId'])),
              number: String(
                this.pick(t, ['tableNumber', 'number', 'name', 'tableName', 'id']) ?? '-',
              ),
              seats:
                Number(this.pick(t, ['seats', 'capacity', 'seatCount', 'noOfSeats', 'seat'])) ||
                null,
              occupied: flag !== undefined ? !!flag : status.startsWith('occ'),
              image: this.imageUrl(
                this.pick(t, ['image', 'imageUrl', 'imagePath', 'photo']),
                TABLE_IMAGE_FOLDER,
              ),
            };
          });

        this.loadingTables = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('TABLE API ERROR:', error);
        this.loadingTables = false;
        this.errorMessage = this.apiError(error, 'Could not load tables.');
        this.cdr.detectChanges();
      },
    });
  }

  loadFoods(): void {
    this.loadingFoods = true;

    this.foodService.getFoods(1, 100).subscribe({
      next: (response: any) => {
        this.foods = this.extractList(response)
          .filter((f: any) => f != null)
          .map((raw: any): FoodCard => {
            const f = raw?.food ?? raw;
            const price = Number(this.pick(f, ['price']) ?? 0);
            const apiFinal = this.pick(f, ['discountedPrice', 'discounted_price', 'finalPrice']);
            const type = String(this.pick(f, ['discountType', 'discount_type']) ?? 'None');
            const discount = Number(this.pick(f, ['discount']) ?? 0);

            return {
              id: Number(this.pick(f, ['id', 'foodId'])),
              name: this.pick(f, ['name', 'foodName']) ?? '-',
              description: this.pick(f, ['description']) ?? '',
              price,
              finalPrice:
                apiFinal !== undefined ? Number(apiFinal) : this.discounted(price, type, discount),
              image: this.imageUrl(
                this.pick(f, ['image', 'imageUrl', 'imagePath', 'photo']),
                FOOD_IMAGE_FOLDER,
              ),
            };
          });

        this.loadingFoods = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        console.error('FOOD API ERROR:', error);
        this.loadingFoods = false;
        this.errorMessage = this.apiError(error, 'Could not load food items.');
        this.cdr.detectChanges();
      },
    });
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    return error.status === 401 ? 'Unauthorized. Please log in again.' : fallback;
  }

  selectTable(table: TableCard): void {
    this.selectedTableId = table.id;
    this.cartError = '';
  }

  get selectedTable(): TableCard | undefined {
    return this.tables.find((t) => t.id === this.selectedTableId);
  }

  get filteredFoods(): FoodCard[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.foods;
    return this.foods.filter(
      (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    );
  }

  hasDiscount(food: FoodCard): boolean {
    return food.finalPrice < food.price;
  }

  onImgError(key: string): void {
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  get cartCount(): number {
    return this.cart.reduce((sum, l) => sum + l.quantity, 0);
  }

  get subTotal(): number {
    return this.cart.reduce((sum, l) => sum + l.food.finalPrice * l.quantity, 0);
  }

  addToCart(food: FoodCard): void {
    const line = this.cart.find((l) => l.food.id === food.id);

    if (line) line.quantity++;
    else this.cart.push({ food, quantity: 1 });

    this.successMessage = '';
    this.cartError = '';
  }

  setQuantity(line: CartLine, value: number | string): void {
    const n = Math.floor(Number(value));
    line.quantity = Number.isFinite(n) && n >= 1 ? n : 1;
  }

  removeLine(line: CartLine): void {
    this.cart = this.cart.filter((l) => l !== line);
  }

  openCart(): void {
    this.cartError = '';
    this.cartOpen = true;
  }

  closeCart(): void {
    if (this.placing) return;
    this.cartOpen = false;
  }

  private makeOrderNumber(table: TableCard): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `${yy}${mm}${dd}-${table.number.replace(/\s+/g, '')}-${rand}`;
  }

  confirmOrder(): void {
    this.cartError = '';

    if (this.placing) return;

    const table = this.selectedTable;

    if (!table) {
      this.cartError = 'Please select a table first.';
      return;
    }

    if (!this.cart.length) {
      this.cartError = 'Your cart is empty.';
      return;
    }

    if (!Number.isFinite(table.id) || this.cart.some((l) => !Number.isFinite(l.food.id))) {
      this.cartError =
        'Table or food ID is missing from the API response, so the order cannot be sent.';
      return;
    }

    const phone = this.phone.trim();

    const payload: OrderPayload = {
      tableId: table.id,
      orderNumber: this.makeOrderNumber(table),
      amount: Math.round(this.subTotal * 100) / 100,
      items: this.cart.map((l) => ({
        foodId: l.food.id,
        quantity: l.quantity,
        unitPrice: l.food.finalPrice,
        totalPrice: Math.round(l.food.finalPrice * l.quantity * 100) / 100,
      })),
    };

    if (phone) payload.phoneNumber = phone;

    this.placing = true;

    this.orderService.createOrder(payload).subscribe({
      next: () => {
        this.placing = false;
        this.cartOpen = false;
        this.cart = [];
        this.phone = '';
        this.errorMessage = '';
        this.successMessage = `Order ${payload.orderNumber} placed for table ${table.number}.`;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 5000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('CREATE ORDER ERROR:', error.status, error.error);
        console.error('ORDER PAYLOAD SENT:', payload);
        this.placing = false;
        this.cartError = this.orderErrorText(error);
        this.cdr.detectChanges();
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

  selectNav(_id: string): void {}
}
