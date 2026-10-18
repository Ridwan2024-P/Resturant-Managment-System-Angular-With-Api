import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { FoodService } from '../services/food.service';
import { TableService } from '../services/Tables.service';
import { CartService } from '../services/cart.service';

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
  readonly cart = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);

  loadingTables = true;
  loadingFoods = true;

  errorMessage = '';

  tables: TableCard[] = [];
  foods: FoodCard[] = [];

  search = '';

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

  get selectedTableId(): number | null {
    return this.cart.selectedTable()?.id ?? null;
  }

  get successMessage(): string {
    return this.cart.successMessage();
  }

  selectTable(table: TableCard): void {
    this.cart.selectTable({ id: table.id, number: table.number });
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

  addToCart(food: FoodCard): void {
    this.cart.add(food);
  }

  selectNav(_id: string): void {}
}
