import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { DiscountType, FoodPayload, FoodService } from '../services/food.service';
import { ConfirmService } from '../services/confirm.service';
import { deleteErrorMessage } from '../alertbox/delete-error';

interface FoodRow {
  id: string | number | null;
  name: string;
  description: string;
  price: number;
  discountType: DiscountType;
  discount: number;
  discountedPrice: number;
  image?: string;
  raw: any;
}

interface FoodForm {
  name: string;
  description: string;
  price: string;
  discountType: DiscountType;
  discount: string;
}

const API_HOST = 'https://bssrms.runasp.net';
const IMAGE_FOLDER = '/images/food/';

@Component({
  selector: 'app-foods',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './foods.html',
  styleUrl: './foods.css',
})
export class Foods implements OnInit {
  private readonly service = inject(FoodService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmDialog = inject(ConfirmService);

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  foods: FoodRow[] = [];

  page = 1;
  pageSize = 10;
  pageSizes = [10, 20, 30, 50];
  totalItems = 0;
  serverLastPage = 1;

  showModal = false;
  submitted = false;
  editingId: string | number | null = null;

  form: FoodForm = this.emptyForm();

  imageFile: File | null = null;
  imagePreview = '';
  failedImages = new Set<string>();

  ngOnInit(): void {
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
    for (const key of ['data', 'items', 'foods', 'result']) {
      if (Array.isArray(response?.[key])) return response[key];
    }
    return [];
  }

  private imageUrl(value: any): string | undefined {
    if (typeof value !== 'string') return undefined;
    const image = value.trim().replace(/\\/g, '/');
    if (!image) return undefined;

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(image)) return image;
    if (image.length > 100 && /^[A-Za-z0-9+/=\r\n]+$/.test(image)) {
      return `data:image/jpeg;base64,${image.replace(/\s/g, '')}`;
    }
    if (!image.includes('/')) return `${API_HOST}${IMAGE_FOLDER}${encodeURIComponent(image)}`;
    if (image.startsWith('/')) return `${API_HOST}${image}`;
    return `${API_HOST}/${image}`;
  }

  calcDiscounted(price: number, type: string, discount: number): number {
    const p = Number(price) || 0;
    const d = Number(discount) || 0;
    let result = p;

    if (type === 'Percentage') result = p - (p * d) / 100;
    else if (type === 'Flat') result = p - d;

    return Math.max(Math.round(result * 100) / 100, 0);
  }

  private normalizeType(value: any): DiscountType {
    const v = String(value ?? '').toLowerCase();
    if (v.startsWith('per')) return 'Percentage';
    if (v.startsWith('flat') || v.startsWith('fix')) return 'Flat';
    return 'None';
  }

  private normalize(item: any): FoodRow {
    const f = item?.food ?? item;

    const price = Number(this.pick(f, ['price', 'Price']) ?? 0);
    const discountType = this.normalizeType(this.pick(f, ['discountType', 'discount_type']));
    const discount = Number(this.pick(f, ['discount', 'discountValue']) ?? 0);

    const apiDiscounted = this.pick(f, ['discountedPrice', 'discounted_price', 'finalPrice']);

    return {
      id: this.pick(f, ['id', 'foodId']) ?? null,
      name: this.pick(f, ['name', 'foodName']) ?? '-',
      description: this.pick(f, ['description']) ?? '',
      price,
      discountType,
      discount,
      discountedPrice:
        apiDiscounted !== undefined
          ? Number(apiDiscounted)
          : this.calcDiscounted(price, discountType, discount),
      image: this.imageUrl(this.pick(f, ['image', 'imageUrl', 'imagePath', 'photo', 'picture'])),
      raw: f,
    };
  }

  loadFoods(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getFoods(this.page, this.pageSize).subscribe({
      next: (response: any) => {
        const list = this.extractList(response);

        this.foods = list.filter((i: any) => i != null).map((i: any) => this.normalize(i));

        this.totalItems = Number(response?.total ?? this.foods.length);
        this.serverLastPage = Math.max(
          Number(response?.last_page ?? Math.ceil(this.totalItems / this.pageSize)),
          1,
        );

        if (this.page > this.serverLastPage) {
          this.page = this.serverLastPage;
          this.loadFoods();
          return;
        }

        this.failedImages.clear();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage =
          error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not load food items. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  get totalPages(): number {
    return this.serverLastPage;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeText(): string {
    if (!this.totalItems) return '0 items';
    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalItems);
    return `${start}-${end} of ${this.totalItems} items`;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) return;
    this.page = page;
    this.loadFoods();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    if (!this.pageSizes.includes(parsed)) return;
    this.pageSize = parsed;
    this.page = 1;
    this.loadFoods();
  }

  imgKey(food: FoodRow, index: number): string {
    return String(food.id ?? index);
  }

  onImgError(key: string): void {
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  discountLabel(food: FoodRow): string {
    if (food.discountType === 'Percentage') return `${food.discount} %`;
    if (food.discountType === 'Flat') return `${food.discount}`;
    return '-';
  }

  private emptyForm(): FoodForm {
    return { name: '', description: '', price: '', discountType: 'None', discount: '0' };
  }

  get discountDisabled(): boolean {
    return this.form.discountType === 'None';
  }

  get formDiscountedPrice(): number {
    return this.calcDiscounted(
      Number(this.form.price),
      this.form.discountType,
      Number(this.form.discount),
    );
  }

  onDiscountTypeChange(): void {
    if (this.form.discountType === 'None') this.form.discount = '0';
  }

  openAdd(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.imageFile = null;
    this.imagePreview = '';
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = true;
  }

  openEdit(food: FoodRow): void {
    if (food.id === null || food.id === undefined || food.id === '') {
      this.errorMessage = 'Cannot edit this food item because the API response has no ID.';
      return;
    }

    this.editingId = food.id;
    this.form = {
      name: food.name === '-' ? '' : food.name,
      description: food.description,
      price: String(food.price),
      discountType: food.discountType,
      discount: String(food.discount),
    };
    this.imageFile = null;
    this.imagePreview = food.image ?? '';
    this.submitted = false;
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) return;
    this.showModal = false;
    this.submitted = false;
    this.errorMessage = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      input.value = '';
      return;
    }

    this.imageFile = file;
    this.errorMessage = '';

    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = String(reader.result ?? '');
      this.cdr.detectChanges();
    };
    reader.onerror = () => {
      this.errorMessage = 'Could not preview the selected image.';
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  invalid(field: keyof FoodForm): boolean {
    if (!this.submitted) return false;
    const value = String(this.form[field] ?? '').trim();

    if (field === 'name' || field === 'description') return !value;
    if (field === 'price') return !value || Number(value) <= 0 || Number.isNaN(Number(value));
    if (field === 'discount') return this.discountError() !== '';
    return false;
  }

  errorText(field: keyof FoodForm): string {
    const value = String(this.form[field] ?? '').trim();

    switch (field) {
      case 'name':
        return 'Food name is required.';
      case 'description':
        return 'Description is required.';
      case 'price':
        return value ? 'Price must be greater than 0.' : 'Price is required.';
      case 'discount':
        return this.discountError();
      default:
        return '';
    }
  }

  private discountError(): string {
    if (this.form.discountType === 'None') return '';
    const d = Number(this.form.discount);
    const p = Number(this.form.price);

    if (Number.isNaN(d) || d < 0) return 'Discount must be a positive number.';
    if (this.form.discountType === 'Percentage' && d > 100) {
      return 'Percentage discount cannot be more than 100.';
    }
    if (this.form.discountType === 'Flat' && p > 0 && d > p) {
      return 'Flat discount cannot be more than the price.';
    }
    return '';
  }

  get formValid(): boolean {
    const price = Number(this.form.price);
    return (
      !!this.form.name.trim() &&
      !!this.form.description.trim() &&
      !!this.form.price.toString().trim() &&
      !Number.isNaN(price) &&
      price > 0 &&
      this.discountError() === ''
    );
  }

  save(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.saving) return;

    if (!this.formValid) {
      this.errorMessage = this.discountError() || 'Please complete all required fields correctly.';
      return;
    }

    const wasEditing = this.editingId !== null;
    const existing = wasEditing
      ? this.foods.find((f) => String(f.id) === String(this.editingId))
      : undefined;
    const existingImage = this.pick(existing?.raw, ['image', 'imageUrl', 'imagePath']) ?? '';

    const sendRequest = (base64: string): void => {
      const none = this.form.discountType === 'None';

      const payload: FoodPayload = {
        name: this.form.name.trim(),
        description: this.form.description.trim(),
        price: Number(this.form.price),
        discountType: this.form.discountType,
        discount: none ? 0 : Number(this.form.discount),
        image: this.imageFile ? this.imageFile.name : String(existingImage),
        base64,
      };

      this.saving = true;

      const request = wasEditing
        ? this.service.updateFood(this.editingId!, payload)
        : this.service.createFood(payload);

      request.subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.imageFile = null;
          this.imagePreview = '';
          this.submitted = false;

          this.flash(
            wasEditing ? 'Food item updated successfully.' : 'Food item added successfully.',
          );
          this.loadFoods();
        },
        error: (error: HttpErrorResponse) => {
          console.error('SAVE FOOD ERROR:', error, error.error);
          this.saving = false;

          this.errorMessage =
            error.error?.message ??
            error.error?.title ??
            (error.status === 401
              ? 'Unauthorized. Please log in again.'
              : error.status === 400
                ? 'Invalid food data. Check the fields and image format.'
                : 'Could not save the food item. Please try again.');

          this.cdr.detectChanges();
        },
      });
    };

    if (this.imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? '');
        sendRequest(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = () => {
        this.errorMessage = 'Could not read the selected image.';
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(this.imageFile);
    } else {
      sendRequest('');
    }
  }

  async remove(food: FoodRow): Promise<void> {
    if (food.id === null || food.id === undefined || food.id === '') {
      this.errorMessage = 'Cannot delete this food item because the API response has no ID.';
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete food item?',
      message: `Are you sure you want to delete ${food.name}? This cannot be undone.`,
    });

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.service.deleteFood(food.id).subscribe({
      next: () => {
        this.flash('Food item deleted successfully.');
        if (this.foods.length === 1 && this.page > 1) this.page--;
        this.loadFoods();
      },
      error: (error: HttpErrorResponse) => {
        void this.confirmDialog.alert({
          title: 'Cannot delete food item',
          message: deleteErrorMessage(error, 'food item', 'Could not delete the food item. Please try again.'),
        });
        this.cdr.detectChanges();
      },
    });
  }

  private flash(message: string): void {
    this.successMessage = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  selectNav(_id: string): void {}
}