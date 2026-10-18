import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { TablePayload, TableService } from '../services/Tables.service';
import { EmployeeService } from '../services/employee.service';
import { ConfirmService } from '../services/confirm.service';

interface AssignedEmployee {
  id: string | null;
  name: string;
  image?: string;
}

interface TableRow {
  id: string | number | null;
  tableNumber: string;
  seats: number | string;
  status: string;
  image?: string;
  employees: AssignedEmployee[];
  raw: any;
}

interface TableForm {
  tableNumber: string;
  numberOfSeats: string;
}

const API_HOST = 'https://bssrms.runasp.net';
const TABLE_IMAGE_FOLDER = '/images/table/';
const USER_IMAGE_FOLDER = '/images/user/';

@Component({
  selector: 'app-tables',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './tables.html',
  styleUrl: './tables.css',
})
export class Tables implements OnInit {
  private readonly service = inject(TableService);
  private readonly employeeService = inject(EmployeeService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly confirmDialog = inject(ConfirmService);

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  tables: TableRow[] = [];

  page = 1;
  pageSize = 10;
  pageSizes = [10, 20, 30, 50];
  totalItems = 0;
  serverLastPage = 1;

 
  showModal = false;
  submitted = false;
  editingId: string | number | null = null;
  form: TableForm = { tableNumber: '', numberOfSeats: '' };
  imageFile: File | null = null;
  imagePreview = '';
  existingImageName = '';

 
  showAssign = false;
  assignTable: TableRow | null = null;
  assignLoading = false;
  assignError = '';
  allEmployees: AssignedEmployee[] = [];
  alreadyAssigned = new Set<string>();
  selectedEmployees = new Set<string>();

  failedImages = new Set<string>();

  private employeeLookup: Map<string, AssignedEmployee> | null = null;

  ngOnInit(): void {
    this.loadTables();
  }

 

  private pick(obj: any, keys: string[]): any {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    for (const key of keys) {
      const value = obj[key];

      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }

    return undefined;
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    for (const key of ['data', 'items', 'tables', 'result', 'results']) {
      if (Array.isArray(response?.[key])) {
        return response[key];
      }
    }

    return [];
  }

  private imageUrl(value: any, folder: string): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const image = value.trim().replace(/\\/g, '/');

    if (!image) {
      return undefined;
    }

    if (/^(https?:\/\/|data:image\/|blob:)/i.test(image)) {
      return image;
    }

    if (image.length > 100 && /^[A-Za-z0-9+/=\r\n]+$/.test(image)) {
      return `data:image/jpeg;base64,${image.replace(/\s/g, '')}`;
    }

    if (!image.includes('/')) {
      return `${API_HOST}${folder}${encodeURIComponent(image)}`;
    }

    return image.startsWith('/') ? `${API_HOST}${image}` : `${API_HOST}/${image}`;
  }

  
  private findImage(candidates: any[]): string | undefined {
    for (const obj of candidates) {
      if (!obj || typeof obj !== 'object') {
        continue;
      }

      for (const [key, value] of Object.entries(obj)) {
        if (/base64/i.test(key)) {
          continue;
        }

        if (/image|photo|picture|avatar/i.test(key) && typeof value === 'string' && value.trim()) {
          return this.imageUrl(value, USER_IMAGE_FOLDER);
        }
      }
    }

    return undefined;
  }

  private normalizeEmployee(item: any): AssignedEmployee {
   
    const e = item?.employee ?? item;
    const user = e?.user ?? e;

    const first = this.pick(user, ['firstName', 'firstname']);
    const last = this.pick(user, ['lastName', 'lastname']);

    const name =
      this.pick(user, ['fullName', 'employeeName', 'name']) ??
      [first, last].filter(Boolean).join(' ');

    const rawImage = this.findImage([user, e, item, e?.user, item?.user, item?.employee?.user]);

    const id = this.pick(e, ['id', 'employeeId', 'empId']) ?? this.pick(item, ['employeeId']);

    return {
      id: id !== undefined ? String(id) : null,
      name: name || 'Employee',
      image: this.imageUrl(rawImage, USER_IMAGE_FOLDER),
    };
  }

  private normalizeStatus(t: any): string {
    const text = this.pick(t, ['bookingStatus', 'status', 'tableStatus']);

    if (typeof text === 'string') {
      return text;
    }

    const available = this.pick(t, ['isAvailable', 'available']);
    if (typeof available === 'boolean') {
      return available ? 'Available' : 'Not Available';
    }

    const booked = this.pick(t, ['isBooked', 'booked', 'isBooking']);
    if (typeof booked === 'boolean') {
      return booked ? 'Not Available' : 'Available';
    }

    return '-';
  }

  
  private findEmployees(t: any): any[] {
    const known = this.pick(t, [
      'employees',
      'assignedEmployees',
      'employeeTables',
      'employeeTable',
      'tableEmployees',
      'employeeList',
      'assignedEmployeeList',
    ]);

    if (Array.isArray(known)) {
      return known;
    }

   
    for (const [key, value] of Object.entries(t ?? {})) {
      if (/order|booking|reservation|image/i.test(key)) {
        continue;
      }

      if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
        return value;
      }
    }

    return [];
  }

  private normalize(t: any): TableRow {
    const employeesRaw = this.findEmployees(t);

    return {
      id: this.pick(t, ['id', 'tableId']) ?? null,
      tableNumber: String(this.pick(t, ['tableNumber', 'tableNo', 'number', 'name']) ?? '-'),
      seats: this.pick(t, ['numberOfSeats', 'totalSeats', 'seats', 'seatCount']) ?? '-',
      status: this.normalizeStatus(t),
      image: this.imageUrl(this.pick(t, ['image', 'imageUrl', 'imagePath']), TABLE_IMAGE_FOLDER),
      employees: employeesRaw
        .filter((x: any) => x != null)
        .map((x: any) => this.normalizeEmployee(x)),
      raw: t,
    };
  }

  private errorText(error: HttpErrorResponse, fallback: string): string {
    const apiMessage = error.error?.message ?? error.error?.title;

    if (typeof apiMessage === 'string' && apiMessage) {
      return apiMessage;
    }

    if (error.status === 401) {
      return 'Unauthorized. Please log in again.';
    }

    return fallback;
  }

 
  loadTables(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getTables(this.page, this.pageSize).subscribe({
      next: (response: any) => {
        console.log('TABLE API RESPONSE:', response);

        this.tables = this.extractList(response)
          .filter((item: any) => item != null)
          .map((item: any) => this.normalize(item));

        this.totalItems = Number(response?.total ?? this.tables.length);

        this.serverLastPage = Math.max(
          Number(response?.last_page ?? Math.ceil(this.totalItems / this.pageSize)),
          1,
        );

        if (this.page > this.serverLastPage) {
          this.page = this.serverLastPage;
          this.loadTables();
          return;
        }

        this.failedImages.clear();
        this.loading = false;
        this.cdr.detectChanges();

        if (this.tables.length && this.tables.every((t) => t.employees.length === 0)) {
          this.mergeEmployeesFromGet();
        } else {
          this.enrichEmployees();
        }
      },

      error: (error: HttpErrorResponse) => {
        console.error('LOAD TABLES ERROR:', error);

        this.loading = false;
        this.errorMessage = this.errorText(error, 'Could not load tables. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

  
  private enrichEmployees(): void {
    const needs = this.tables.some((t) =>
      t.employees.some((e) => !e.image || e.name === 'Employee'),
    );

    if (!needs) {
      return;
    }

    const apply = (): void => {
      this.tables.forEach((t) =>
        t.employees.forEach((e) => {
          const found = e.id ? this.employeeLookup?.get(e.id) : undefined;

          if (found) {
            e.image = e.image ?? found.image;
            e.name = e.name === 'Employee' ? found.name : e.name;
          }
        }),
      );

      this.failedImages.clear();
      this.cdr.detectChanges();
    };

    if (this.employeeLookup) {
      apply();
      return;
    }

    this.employeeService.getEmployees(1, 200).subscribe({
      next: (response: any) => {
        const list: any[] = Array.isArray(response)
          ? response
          : (response?.data ?? response?.items ?? response?.employees ?? []);

        const map = new Map<string, AssignedEmployee>();

        list
          .filter((x) => x != null)
          .forEach((x) => {
            const emp = this.normalizeEmployee(x);
            const e = x?.employee ?? x;
            const user = e?.user ?? e;

            [emp.id, e?.id, e?.employeeId, e?.userId, user?.id, user?.userId].forEach((k) => {
              if (k !== undefined && k !== null && k !== '') {
                map.set(String(k), emp);
              }
            });
          });

        this.employeeLookup = map;
        apply();
      },

      error: (error: HttpErrorResponse) => console.warn('Could not load employees for photos', error),
    });
  }

 
  private mergeEmployeesFromGet(): void {
    this.service.getAllTables().subscribe({
      next: (response: any) => {
        console.log('TABLE GET RESPONSE:', response);

        const byId = new Map<string, AssignedEmployee[]>();

        this.extractList(response).forEach((item: any) => {
          const row = this.normalize(item);

          if (row.id !== null && row.employees.length) {
            byId.set(String(row.id), row.employees);
          }
        });

        this.tables.forEach((t) => {
          const found = byId.get(String(t.id));

          if (found) {
            t.employees = found;
          }
        });

        this.cdr.detectChanges();
        this.enrichEmployees();
      },

      error: (error: HttpErrorResponse) => console.warn('TABLE GET failed:', error),
    });
  }

  get totalPages(): number {
    return this.serverLastPage;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeText(): string {
    if (!this.totalItems) {
      return '0 items';
    }

    const start = (this.page - 1) * this.pageSize + 1;
    const end = Math.min(this.page * this.pageSize, this.totalItems);

    return `${start}-${end} of ${this.totalItems} items`;
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }

    this.page = page;
    this.loadTables();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);

    if (!this.pageSizes.includes(parsed)) {
      return;
    }

    this.pageSize = parsed;
    this.page = 1;
    this.loadTables();
  }

  imgKey(prefix: string, index: number, id: string | number | null): string {
    return `${prefix}-${id ?? index}`;
  }

  onImgError(key: string): void {
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  isAvailable(status: string): boolean {
    return status.trim().toLowerCase() === 'available';
  }

  

  openAdd(): void {
    this.editingId = null;
    this.form = { tableNumber: '', numberOfSeats: '' };
    this.imageFile = null;
    this.imagePreview = '';
    this.existingImageName = '';
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.showModal = true;
  }

  openEdit(table: TableRow): void {
    if (table.id === null || table.id === undefined || table.id === '') {
      this.errorMessage = 'Cannot edit this table because the API response has no table ID.';
      return;
    }

    this.editingId = table.id;
    this.form = {
      tableNumber: table.tableNumber === '-' ? '' : table.tableNumber,
      numberOfSeats: String(table.seats === '-' ? '' : table.seats),
    };
    this.imageFile = null;
    this.imagePreview = table.image ?? '';
    this.existingImageName = String(this.pick(table.raw, ['image', 'imageUrl', 'imagePath']) ?? '');
    this.submitted = false;
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.saving) {
      return;
    }

    this.showModal = false;
    this.submitted = false;
    this.errorMessage = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

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

  invalid(field: keyof TableForm): boolean {
    if (!this.submitted) {
      return false;
    }

    const value = String(this.form[field] ?? '').trim();

    if (field === 'numberOfSeats') {
      return !/^\d+$/.test(value) || Number(value) < 1;
    }

    return !value;
  }

  fieldError(field: keyof TableForm): string {
    const value = String(this.form[field] ?? '').trim();

    if (field === 'tableNumber') {
      return 'Table number is required.';
    }

    return value ? 'Seats must be a whole number of 1 or more.' : 'Number of seats is required.';
  }

  get formValid(): boolean {
    return (
      this.form.tableNumber.trim() !== '' &&
      /^\d+$/.test(String(this.form.numberOfSeats).trim()) &&
      Number(this.form.numberOfSeats) >= 1
    );
  }

  save(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (this.saving) {
      return;
    }

    if (!this.formValid) {
      this.errorMessage = 'Please enter a table number and a valid number of seats.';
      return;
    }

    const number = this.form.tableNumber.trim().toLowerCase();

    const duplicate = this.tables.some(
      (t) =>
        t.tableNumber.trim().toLowerCase() === number && String(t.id) !== String(this.editingId),
    );

    if (duplicate) {
      this.errorMessage = 'This table number already exists.';
      return;
    }

    const wasEditing = this.editingId !== null;

    const send = (base64: string): void => {
      const payload: TablePayload = {
        tableNumber: this.form.tableNumber.trim(),
        numberOfSeats: Number(this.form.numberOfSeats),
        image: this.imageFile ? this.imageFile.name : this.existingImageName,
        base64,
      };

      this.saving = true;

      const request = wasEditing
        ? this.service.updateTable(this.editingId!, payload)
        : this.service.createTable(payload);

      request.subscribe({
        next: () => {
          this.saving = false;
          this.showModal = false;
          this.imageFile = null;
          this.imagePreview = '';
          this.submitted = false;

          this.flash(wasEditing ? 'Table updated successfully.' : 'Table added successfully.');
          this.loadTables();
        },

        error: (error: HttpErrorResponse) => {
          console.error('SAVE TABLE ERROR:', error, error.error);

          this.saving = false;
          this.errorMessage = this.errorText(
            error,
            error.status === 400
              ? 'Invalid table data. Check the fields and image format.'
              : 'Could not save the table. Please try again.',
          );
          this.cdr.detectChanges();
        },
      });
    };

    if (this.imageFile) {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result ?? '');
        send(result.includes(',') ? result.split(',')[1] : result);
      };

      reader.onerror = () => {
        this.errorMessage = 'Could not read the selected image.';
        this.cdr.detectChanges();
      };

      reader.readAsDataURL(this.imageFile);
    } else {
      send('');
    }
  }

  async remove(table: TableRow): Promise<void> {
    if (table.id === null || table.id === undefined || table.id === '') {
      this.errorMessage = 'Cannot delete this table because the API response has no table ID.';
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete table?',
      message: `Are you sure you want to delete table ${table.tableNumber}? This cannot be undone.`,
    });

    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.service.deleteTable(table.id).subscribe({
      next: () => {
        this.flash('Table deleted successfully.');

        if (this.tables.length === 1 && this.page > 1) {
          this.page--;
        }

        this.loadTables();
      },

      error: (error: HttpErrorResponse) => {
        console.error('DELETE TABLE ERROR:', error, error.error);

        this.errorMessage = this.errorText(error, 'Could not delete the table. Please try again.');
        this.cdr.detectChanges();
      },
    });
  }

 

  openAssign(table: TableRow): void {
    if (table.id === null || table.id === undefined || table.id === '') {
      this.errorMessage = 'Cannot assign employees because the table has no ID.';
      return;
    }

    this.assignTable = table;
    this.assignError = '';
    this.selectedEmployees = new Set<string>();
    this.alreadyAssigned = new Set(
      table.employees.map((e) => e.id).filter((id): id is string => !!id),
    );
    this.allEmployees = [];
    this.assignLoading = true;
    this.showAssign = true;

    this.employeeService.getEmployees(1, 200).subscribe({
      next: (response: any) => {
        const list: any[] = Array.isArray(response)
          ? response
          : (response?.data ?? response?.items ?? response?.employees ?? []);

        this.allEmployees = list
          .filter((x) => x != null)
          .map((x) => this.normalizeEmployee(x))
          .filter((x) => !!x.id);

        this.assignLoading = false;
        this.cdr.detectChanges();
      },

      error: (error: HttpErrorResponse) => {
        this.assignLoading = false;
        this.assignError = this.errorText(error, 'Could not load employees.');
        this.cdr.detectChanges();
      },
    });
  }

  closeAssign(): void {
    if (this.saving) {
      return;
    }

    this.showAssign = false;
    this.assignTable = null;
  }

  toggleEmployee(id: string | null): void {
    if (!id || this.alreadyAssigned.has(id)) {
      return;
    }

    if (this.selectedEmployees.has(id)) {
      this.selectedEmployees.delete(id);
    } else {
      this.selectedEmployees.add(id);
    }
  }

  saveAssign(): void {
    if (!this.assignTable || this.saving) {
      return;
    }

    if (this.selectedEmployees.size === 0) {
      this.assignError = 'Select at least one employee.';
      return;
    }

    const tableId = Number(this.assignTable.id);

    const items = Array.from(this.selectedEmployees).map((employeeId) => ({
      employeeId,
      tableId,
    }));

    this.saving = true;
    this.assignError = '';

    const request =
      items.length === 1
        ? this.service.assignEmployee(items[0])
        : this.service.assignEmployees(items);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showAssign = false;
        this.assignTable = null;

        this.flash('Employees assigned successfully.');
        this.loadTables();
      },

      error: (error: HttpErrorResponse) => {
        console.error('ASSIGN EMPLOYEES ERROR:', error, error.error);

        this.saving = false;
        this.assignError = this.errorText(error, 'Could not assign employees. Please try again.');
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