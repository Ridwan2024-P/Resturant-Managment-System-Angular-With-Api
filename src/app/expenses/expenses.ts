import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { ExpensePayload, ExpenseService } from '../services/expenses.service';
import { ConfirmService } from '../services/confirm.service';

interface ExpenseRow {
  id: string | number | null;
  title: string;
  category: string;
  amount: number;
  date: Date | null;
  notes: string;
  raw: any;
}

interface ExpenseForm {
  title: string;
  amount: string;
  category: string;
  expenseDate: string;
  notes: string;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './expenses.html',
  styleUrl: './expenses.css',
})
export class Expenses implements OnInit {
  private readonly service = inject(ExpenseService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmDialog = inject(ConfirmService);

  categories = ['Ingredients', 'Salary', 'Utilities', 'Rent', 'Maintenance', 'Other'];

  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';

  expenses: ExpenseRow[] = [];

  page = 1;
  pageSize = 10;
  pageSizes = [10, 20, 30, 50];
  totalItems = 0;
  serverLastPage = 1;

  showModal = false;
  submitted = false;
  editingId: string | number | null = null;

  form: ExpenseForm = this.emptyForm();

  ngOnInit(): void {
    this.loadExpenses();
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
    for (const key of ['data', 'items', 'expenses', 'result']) {
      if (Array.isArray(response?.[key])) return response[key];
    }
    return [];
  }

  private toDate(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private toInputDate(value: any): string {
    if (!value) return '';
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));
    if (match) return match[1];
    const d = this.toDate(value);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private toApiDate(value: string): string {
    return value ? `${value}T00:00:00.000Z` : '';
  }

  private normalize(item: any): ExpenseRow {
    const e = item?.expense ?? item;

    return {
      id: this.pick(e, ['id', 'expenseId']) ?? null,
      title: this.pick(e, ['title', 'name']) ?? '-',
      category: this.pick(e, ['category', 'categoryName']) ?? '-',
      amount: Number(this.pick(e, ['amount', 'Amount']) ?? 0),
      date: this.toDate(this.pick(e, ['expenseDate', 'date', 'createdAt'])),
      notes: this.pick(e, ['notes', 'note', 'description']) ?? '',
      raw: e,
    };
  }

  loadExpenses(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getExpenses(this.page, this.pageSize).subscribe({
      next: (response: any) => {
        const list = this.extractList(response);

        this.expenses = list.filter((i: any) => i != null).map((i: any) => this.normalize(i));

        this.totalItems = Number(response?.total ?? this.expenses.length);
        this.serverLastPage = Math.max(
          Number(response?.last_page ?? Math.ceil(this.totalItems / this.pageSize)),
          1,
        );

        if (this.page > this.serverLastPage) {
          this.page = this.serverLastPage;
          this.loadExpenses();
          return;
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage =
          error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not load expenses. Please try again.';
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
    this.loadExpenses();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);
    if (!this.pageSizes.includes(parsed)) return;
    this.pageSize = parsed;
    this.page = 1;
    this.loadExpenses();
  }

  private emptyForm(): ExpenseForm {
    return { title: '', amount: '', category: '', expenseDate: '', notes: '' };
  }

  openAdd(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = true;
  }

  openEdit(exp: ExpenseRow): void {
    if (exp.id === null || exp.id === undefined || exp.id === '') {
      this.errorMessage = 'Cannot edit this expense because the API response has no ID.';
      return;
    }

    if (exp.category && exp.category !== '-' && !this.categories.includes(exp.category)) {
      this.categories = [...this.categories, exp.category];
    }

    this.editingId = exp.id;
    this.form = {
      title: exp.title === '-' ? '' : exp.title,
      amount: String(exp.amount),
      category: exp.category === '-' ? '' : exp.category,
      expenseDate: this.toInputDate(this.pick(exp.raw, ['expenseDate', 'date'])),
      notes: exp.notes,
    };
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

  invalid(field: keyof ExpenseForm): boolean {
    if (!this.submitted || field === 'notes') return false;
    const value = String(this.form[field] ?? '').trim();
    if (field === 'amount') return !value || Number.isNaN(Number(value)) || Number(value) <= 0;
    return !value;
  }

  errorText(field: keyof ExpenseForm): string {
    const value = String(this.form[field] ?? '').trim();

    switch (field) {
      case 'title':
        return 'Title is required.';
      case 'amount':
        return value ? 'Amount must be greater than 0.' : 'Amount is required.';
      case 'category':
        return 'Please select a category.';
      case 'expenseDate':
        return 'Expense date is required.';
      default:
        return '';
    }
  }

  get formValid(): boolean {
    const amount = Number(this.form.amount);
    return (
      !!this.form.title.trim() &&
      !!this.form.category &&
      !!this.form.expenseDate &&
      !!this.form.amount.toString().trim() &&
      !Number.isNaN(amount) &&
      amount > 0
    );
  }

  save(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.saving) return;

    if (!this.formValid) {
      this.errorMessage = 'Please complete all required fields correctly.';
      return;
    }

    const wasEditing = this.editingId !== null;

    const payload: ExpensePayload = {
      title: this.form.title.trim(),
      category: this.form.category,
      amount: Number(this.form.amount),
      expenseDate: this.toApiDate(this.form.expenseDate),
      notes: this.form.notes.trim(),
    };

    this.saving = true;

    const request = wasEditing
      ? this.service.updateExpense(this.editingId!, payload)
      : this.service.createExpense(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.submitted = false;
        this.flash(wasEditing ? 'Expense updated successfully.' : 'Expense added successfully.');
        this.loadExpenses();
      },
      error: (error: HttpErrorResponse) => {
        console.error('SAVE EXPENSE ERROR:', error, error.error);
        this.saving = false;
        this.errorMessage =
          error.error?.message ??
          error.error?.title ??
          (error.status === 401
            ? 'Unauthorized. Please log in again.'
            : error.status === 400
              ? 'Invalid expense data. Check the fields.'
              : 'Could not save the expense. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  async remove(exp: ExpenseRow): Promise<void> {
    if (exp.id === null || exp.id === undefined || exp.id === '') {
      this.errorMessage = 'Cannot delete this expense because the API response has no ID.';
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete expense?',
      message: `Are you sure you want to delete ${exp.title}? This cannot be undone.`,
    });

    if (!confirmed) return;

    this.errorMessage = '';
    this.successMessage = '';

    this.service.deleteExpense(exp.id).subscribe({
      next: () => {
        this.flash('Expense deleted successfully.');
        if (this.expenses.length === 1 && this.page > 1) this.page--;
        this.loadExpenses();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.error?.message ??
          (error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not delete the expense. Please try again.');
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
