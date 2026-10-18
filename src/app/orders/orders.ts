import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { FoodService } from '../services/food.service';
import { OrderPayload, OrderService } from '../services/orders.service';
import { TableService } from '../services/Tables.service';
import { ConfirmService } from '../services/confirm.service';

interface OrderItemView {
  foodId: number | null;
  name: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OrderView {
  id: string | number;
  orderNumber: string;
  date: Date | null;
  tableNumber: string;
  tableId: number | null;
  phone: string;
  status: number;
  amount: number;
  items: OrderItemView[];
}

interface FoodOption {
  id: number;
  name: string;
  finalPrice: number;
  image?: string;
}

export const STATUSES = [
  { label: 'Pending', short: 'Pending' },
  { label: 'Confirmed', short: 'Confirmed' },
  { label: 'Preparing', short: 'Preparing' },
  { label: 'Prepared To Serve', short: 'P.T.S' },
  { label: 'Served', short: 'Served' },
  { label: 'Paid', short: 'Paid' },
];

const API_HOST = 'https://bssrms.runasp.net';
const FOOD_IMAGE_FOLDER = '/images/food/';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly orderService = inject(OrderService);
  private readonly foodService = inject(FoodService);
  private readonly tableService = inject(TableService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmDialog = inject(ConfirmService);

  readonly statuses = STATUSES;

  loading = true;
  errorMessage = '';
  toast = '';
  private toastTimer: any;

  orders: OrderView[] = [];

  page = 1;
  pageSize = 9;
  totalItems = 0;
  serverLastPage = 1;

  filterStatus: number | null = null;
  filterOpen = false;
  statusMenuFor: string | number | null = null;

  foods: FoodOption[] = [];
  private tableIds = new Map<string, number>();

  editing: OrderView | null = null;
  editPhone = '';
  editItems: OrderItemView[] = [];
  addFoodId: number | null = null;
  saving = false;
  modalError = '';

  failedImages = new Set<string>();

  ngOnInit(): void {
    this.loadOrders();
    this.loadFoods();
    this.loadTables();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.filterOpen = false;
    this.statusMenuFor = null;
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
    for (const key of ['data', 'items', 'orders', 'result']) {
      if (Array.isArray(response?.[key])) return response[key];
    }
    return [];
  }

  private imageUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const image = value.trim().replace(/\\/g, '/');
    if (!image) return undefined;

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(image)) return image;
    if (!image.includes('/')) return `${API_HOST}${FOOD_IMAGE_FOLDER}${encodeURIComponent(image)}`;
    return image.startsWith('/') ? `${API_HOST}${image}` : `${API_HOST}/${image}`;
  }

  private parseStatus(value: unknown): number {
    if (typeof value === 'number' && value >= 0 && value < STATUSES.length) return value;

    const key = String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');

    if (/^\d+$/.test(String(value))) return Math.min(Number(value), STATUSES.length - 1);

    const map: Record<string, number> = {
      pending: 0,
      confirmed: 1,
      preparing: 2,
      preparedtoserve: 3,
      pts: 3,
      served: 4,
      paid: 5,
    };
    return map[key] ?? 0;
  }

  private toDate(value: unknown): Date | null {
    if (!value) return null;
    const d = new Date(String(value).replace(/(\.\d{3})\d+/, '$1'));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private normalizeItem(raw: any): OrderItemView {
    const food = raw?.food ?? raw?.menuItem ?? {};
    const quantity = Number(this.pick(raw, ['quantity', 'qty']) ?? 1) || 1;
    const unitPrice = Number(
      this.pick(raw, ['unitPrice', 'price']) ??
        this.pick(food, ['discountPrice', 'discountedPrice', 'price']) ??
        0,
    );
    const total = Number(
      this.pick(raw, ['totalPrice', 'total', 'lineTotal']) ?? unitPrice * quantity,
    );
    const foodId = this.pick(raw, ['foodId']) ?? this.pick(food, ['id']);

    return {
      foodId: foodId !== undefined ? Number(foodId) : null,
      name:
        this.pick(raw, ['foodName', 'name', 'itemName', 'title']) ??
        this.pick(food, ['name']) ??
        '-',
      image: this.imageUrl(
        this.pick(raw, ['image', 'foodImage', 'imageUrl']) ?? this.pick(food, ['image']),
      ),
      quantity,
      unitPrice,
      totalPrice: total,
    };
  }

  private normalizeOrder(raw: any): OrderView {
    const o = raw?.order ?? raw;
    const items = this.pick(o, ['orderItems', 'items', 'orderDetails']);
    const list: OrderItemView[] = Array.isArray(items)
      ? items.map((i: any) => this.normalizeItem(i))
      : [];

    const table = o?.table && typeof o.table === 'object' ? o.table : {};
    const tableId = this.pick(table, ['tableId', 'id']) ?? this.pick(o, ['tableId']);
    const tableNumber =
      this.pick(table, ['tableNumber', 'name']) ??
      this.pick(o, ['tableNumber', 'tableName']) ??
      (typeof o?.table === 'string' ? o.table : undefined);

    const phone =
      this.pick(o, ['phoneNumber', 'phone']) ??
      this.pick(o?.orderedBy, ['phoneNumber']) ??
      this.pick(o?.orderTakenBy, ['phoneNumber']);

    return {
      id: this.pick(o, ['id', 'orderId']) ?? '',
      orderNumber: this.pick(o, ['orderNumber']) ?? '-',
      date: this.toDate(this.pick(o, ['orderTime', 'orderDate', 'createdAt', 'date'])),
      tableNumber: String(tableNumber ?? '-'),
      tableId: tableId !== undefined && Number.isFinite(Number(tableId)) ? Number(tableId) : null,
      phone: String(phone ?? ''),
      status: this.parseStatus(this.pick(o, ['orderStatus', 'status'])),
      amount: Number(this.pick(o, ['amount', 'totalAmount', 'totalPrice']) ?? 0),
      items: list,
    };
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMessage = '';

    this.orderService.getOrdersPage(this.page, this.pageSize, this.filterStatus).subscribe({
      next: (response: any) => {
        const list = this.extractList(response)
          .filter((o: any) => o != null)
          .map((o: any) => this.normalizeOrder(o));

        this.totalItems = Number(response?.total ?? list.length);
        this.serverLastPage = Math.max(
          Number(response?.last_page ?? Math.ceil(this.totalItems / this.pageSize)),
          1,
        );

        if (this.page > this.serverLastPage) {
          this.page = this.serverLastPage;
          this.loadOrders();
          return;
        }

        this.orders = list;
        this.fillMissingItems();
      },
      error: (error: HttpErrorResponse) => {
        console.error('ORDER LIST ERROR:', error);
        this.loading = false;
        this.errorMessage =
          error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not load orders. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  private fillMissingItems(): void {
    const missing = this.orders.filter((o) => !o.items.length && o.id !== '');

    if (!missing.length) {
      this.finishLoading();
      return;
    }

    forkJoin(
      missing.map((o) => this.orderService.getOrderById(o.id).pipe(catchError(() => of(null)))),
    ).subscribe((details) => {
      missing.forEach((order, i) => {
        const d = details[i];
        if (!d) return;
        const full = this.normalizeOrder(d?.data ?? d);
        order.items = full.items;
        if (order.tableId === null) order.tableId = full.tableId;
        if (!order.phone) order.phone = full.phone;
        if (!order.amount) order.amount = full.amount;
      });

      this.finishLoading();
    });
  }

  private finishLoading(): void {
    this.failedImages.clear();
    this.loading = false;
    this.cdr.detectChanges();
  }

  private loadFoods(): void {
    this.foodService.getFoods(1, 100).subscribe({
      next: (response: any) => {
        this.foods = this.extractList(response)
          .filter((f: any) => f != null)
          .map((raw: any): FoodOption => {
            const f = raw?.food ?? raw;
            const price = Number(this.pick(f, ['price']) ?? 0);
            const final = this.pick(f, [
              'discountPrice',
              'discountedPrice',
              'discounted_price',
              'finalPrice',
            ]);
            return {
              id: Number(this.pick(f, ['id', 'foodId'])),
              name: this.pick(f, ['name', 'foodName']) ?? '-',
              finalPrice: final !== undefined ? Number(final) : price,
              image: this.imageUrl(this.pick(f, ['image', 'imageUrl'])),
            };
          });
        this.cdr.detectChanges();
      },
      error: (error) => console.error('FOOD LIST ERROR:', error),
    });
  }

  private loadTables(): void {
    this.tableService.getTables(1, 100).subscribe({
      next: (response: any) => {
        for (const raw of this.extractList(response)) {
          const t = raw?.table ?? raw;
          const id = Number(this.pick(t, ['id', 'tableId']));
          const number = String(this.pick(t, ['tableNumber', 'number', 'name', 'tableName']) ?? '');
          if (number && Number.isFinite(id)) this.tableIds.set(number, id);
        }
      },
      error: (error) => console.error('TABLE LIST ERROR:', error),
    });
  }

  statusLabel(order: OrderView): string {
    return STATUSES[order.status]?.short ?? '-';
  }

  imageOf(item: OrderItemView): string | undefined {
    if (item.image) return item.image;
    return this.foods.find((f) => f.id === item.foodId)?.image;
  }

  imgKey(order: OrderView, index: number): string {
    return `${order.id}-${index}`;
  }

  onImgError(key: string): void {
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  totalQuantity(order: OrderView): number {
    return order.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  totalAmount(order: OrderView): number {
    return order.amount || order.items.reduce((sum, i) => sum + i.totalPrice, 0);
  }

  get filterLabel(): string {
    return this.filterStatus === null ? 'Filter Orders' : STATUSES[this.filterStatus].label;
  }

  private showToast(message: string): void {
    this.toast = message;
    this.cdr.detectChanges();
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    if (error.status === 401) return 'Unauthorized. Please log in again.';
    const body: any = error.error;
    if (typeof body === 'string' && body.trim()) return body.slice(0, 200);
    if (body?.errors && typeof body.errors === 'object') {
      const first = Object.entries(body.errors)[0] as [string, any];
      if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}`;
    }
    return body?.message ?? body?.title ?? `${fallback} (HTTP ${error.status})`;
  }

  toggleFilter(event: Event): void {
    event.stopPropagation();
    this.statusMenuFor = null;
    this.filterOpen = !this.filterOpen;
  }

  applyFilter(status: number | null): void {
    this.filterStatus = status;
    this.filterOpen = false;
    this.page = 1;
    this.loadOrders();
  }

  get totalPages(): number {
    return this.serverLastPage;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeText(): string {
    if (!this.totalItems) return '0 orders';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalItems);
    return `${start}-${end} of ${this.totalItems} orders`;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.loadOrders();
  }

  toggleStatusMenu(order: OrderView, event: Event): void {
    event.stopPropagation();
    this.filterOpen = false;
    this.statusMenuFor = this.statusMenuFor === order.id ? null : order.id;
  }

  changeStatus(order: OrderView, status: number, event: Event): void {
    event.stopPropagation();
    this.statusMenuFor = null;

    if (status === order.status) return;

    this.orderService.updateStatus(order.id, status).subscribe({
      next: () => {
        order.status = status;
        this.showToast('Order status updated successfully.');
        if (this.filterStatus !== null) this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        console.error('UPDATE STATUS ERROR:', error);
        this.errorMessage = this.errorText(error, 'Could not update the order status.');
        this.cdr.detectChanges();
      },
    });
  }

  async remove(order: OrderView): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete order?',
      message: `Are you sure you want to delete order ${order.orderNumber}? This cannot be undone.`,
    });

    if (!confirmed) return;

    this.errorMessage = '';

    this.orderService.deleteOrder(order.id).subscribe({
      next: () => {
        this.showToast('Order deleted successfully.');
        if (this.orders.length === 1 && this.page > 1) this.page--;
        this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.errorText(error, 'Could not delete the order.');
        this.cdr.detectChanges();
      },
    });
  }

  openEdit(order: OrderView): void {
    this.editing = order;
    this.editPhone = order.phone;
    this.editItems = order.items.map((i) => ({ ...i }));
    this.addFoodId = null;
    this.modalError = '';
  }

  closeEdit(): void {
    if (this.saving) return;
    this.editing = null;
  }

  addFood(): void {
    const food = this.foods.find((f) => f.id === Number(this.addFoodId));
    if (!food) return;

    const existing = this.editItems.find((i) => i.foodId === food.id);

    if (existing) {
      existing.quantity++;
      existing.totalPrice = existing.unitPrice * existing.quantity;
    } else {
      this.editItems.push({
        foodId: food.id,
        name: food.name,
        image: food.image,
        quantity: 1,
        unitPrice: food.finalPrice,
        totalPrice: food.finalPrice,
      });
    }

    this.addFoodId = null;
  }

  setQuantity(item: OrderItemView, value: number | string): void {
    const n = Math.floor(Number(value));
    item.quantity = Number.isFinite(n) && n >= 1 ? n : 1;
    item.totalPrice = Math.round(item.unitPrice * item.quantity * 100) / 100;
  }

  removeEditItem(item: OrderItemView): void {
    this.editItems = this.editItems.filter((i) => i !== item);
  }

  get editTotal(): number {
    return this.editItems.reduce((sum, i) => sum + i.totalPrice, 0);
  }

  saveEdit(): void {
    const order = this.editing;
    if (!order || this.saving) return;

    this.modalError = '';

    if (!this.editItems.length) {
      this.modalError = 'An order needs at least one item.';
      return;
    }

    const tableId = order.tableId ?? this.tableIds.get(order.tableNumber) ?? null;

    if (tableId === null || !Number.isFinite(tableId)) {
      this.modalError = "Could not find this order's table ID, so it cannot be updated.";
      return;
    }

    if (this.editItems.some((i) => i.foodId === null || !Number.isFinite(i.foodId))) {
      this.modalError = 'An item is missing its food ID, so the order cannot be updated.';
      return;
    }

    const payload: OrderPayload = {
      tableId,
      orderNumber: order.orderNumber,
      amount: Math.round(this.editTotal * 100) / 100,
      items: this.editItems.map((i) => ({
        foodId: i.foodId as number,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: Math.round(i.unitPrice * i.quantity * 100) / 100,
      })),
    };

    const phone = this.editPhone.trim();
    if (phone) payload.phoneNumber = phone;

    this.saving = true;

    this.orderService.updateOrder(order.id, payload).subscribe({
      next: () => {
        this.saving = false;
        this.editing = null;
        this.showToast('Order updated successfully.');
        this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        console.error('UPDATE ORDER ERROR:', error, error.error);
        console.error('UPDATE PAYLOAD:', payload);
        this.saving = false;
        this.modalError = this.errorText(error, 'Could not update the order.');
        this.cdr.detectChanges();
      },
    });
  }

  selectNav(_id: string): void {}
}