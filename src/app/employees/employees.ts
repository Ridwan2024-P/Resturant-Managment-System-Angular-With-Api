import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';

import { EmployeeService, EmployeePayload } from '../services/employee.service';

interface EmployeeRow {
  id: string | number | null;
  name: string;
  email: string;
  designation: string;
  joinDate: Date | null;
  phone: string;
  image?: string;
  raw: any;
}

interface EmployeeForm {
  firstName: string;
  middleName: string;
  lastName: string;
  spouseName: string;
  fatherName: string;
  motherName: string;
  designation: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: string;
  dateOfJoin: string;
  nidCardNumber: string;
}

const API_HOST = 'https://bssrms.runasp.net';
const IMAGE_FOLDER = '/images/user/';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmSidebarImports, Sidebar, Header],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class Employees implements OnInit {
  private readonly service = inject(EmployeeService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  employees: EmployeeRow[] = [];

  page = 1;
  pageSize = 10;
  pageSizes = [10, 20, 30, 50];
  totalItems = 0;
  serverLastPage = 1;

  showModal = false;
  submitted = false;

  editingId: string | number | null = null;

  form: EmployeeForm = this.emptyForm();

  imageFile: File | null = null;
  imagePreview = '';

  isValidBdPhone(phone: string): boolean {
    const normalizedPhone = phone.replace(/[\s-]/g, '');

    return /^(?:\+?88)?01[3-9]\d{8}$/.test(normalizedPhone);
  }

  failedImages = new Set<string>();

  ngOnInit(): void {
    this.loadEmployees();
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

  private toDate(value: any): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toInputDate(value: any): string {
    if (!value) {
      return '';
    }

    const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value));

    if (match) {
      return match[1];
    }

    const date = this.toDate(value);

    if (!date) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toApiDate(value: string): string {
    if (!value) {
      return '';
    }

    return `${value}T00:00:00.000Z`;
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    if (Array.isArray(response?.items)) {
      return response.items;
    }

    if (Array.isArray(response?.employees)) {
      return response.employees;
    }

    if (Array.isArray(response?.result)) {
      return response.result;
    }

    return [];
  }

  private imageUrl(value: any): string | undefined {
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
      return `${API_HOST}${IMAGE_FOLDER}${encodeURIComponent(image)}`;
    }

    // Absolute path on the API host.
    if (image.startsWith('/')) {
      return `${API_HOST}${image}`;
    }

    return `${API_HOST}/${image}`;
  }

  private normalize(employee: any): EmployeeRow {
    const e = employee?.employee ?? employee;
    const user = e?.user ?? e;

    const first = this.pick(user, ['firstName', 'firstname']);

    const middle = this.pick(user, ['middleName', 'middlename']);

    const last = this.pick(user, ['lastName', 'lastname']);

    const fullName =
      this.pick(user, ['fullName', 'employeeName', 'name']) ??
      [first, middle, last].filter(Boolean).join(' ');

    const rawJoinDate = this.pick(e, [
      'joinDate',
      'dateOfJoin',
      'dateOfJoining',
      'joiningDate',
      'joinedDate',
      'joinedAt',
      'hireDate',
    ]);

    const rawImage = this.pick(user, [
      'image',
      'imageUrl',
      'imagePath',
      'photo',
      'photoUrl',
      'picture',
      'profileImage',
      'profilePicture',
      'avatar',
    ]);

    return {
      id: this.pick(e, ['id', 'employeeId', 'empId', 'employeeTableId']) ?? null,

      name: fullName || '-',

      email: this.pick(user, ['email', 'emailAddress', 'Email', 'EmailAddress']) ?? '-',

      designation: this.pick(e, ['designation', 'position', 'role', 'jobTitle']) ?? '-',

      joinDate: this.toDate(rawJoinDate),

      phone: String(this.pick(user, ['phoneNumber', 'phone', 'mobile', 'contactNumber']) ?? '-'),

      image: this.imageUrl(rawImage),

      raw: e,
    };
  }

  loadEmployees(): void {
    this.loading = true;
    this.errorMessage = '';

    this.service.getEmployees(this.page, this.pageSize).subscribe({
      next: (response: any) => {
        console.log('EMPLOYEE API RESPONSE:', response);

        const list = this.extractList(response);

        this.employees = list
          .filter((item: any) => item != null)
          .map((item: any) => this.normalize(item));

        this.totalItems = Number(response?.total ?? this.employees.length);

        this.serverLastPage = Math.max(
          Number(response?.last_page ?? Math.ceil(this.totalItems / this.pageSize)),
          1,
        );

        if (this.page > this.serverLastPage) {
          this.page = this.serverLastPage;
          this.loadEmployees();
          return;
        }

        this.failedImages.clear();
        this.loading = false;

        this.cdr.detectChanges();

        console.log('NORMALIZED EMPLOYEES:', this.employees);
      },

      error: (error: HttpErrorResponse) => {
        this.saving = false;

        const message = String(error.error?.message ?? error.error?.title ?? '');

        if (
          error.status === 409 ||
          /email.*already exists|duplicate.*email|unique.*email/i.test(message)
        ) {
          this.errorMessage = 'This email address already exists.';
        } else {
          this.errorMessage =
            message ||
            (error.status === 401
              ? 'Unauthorized. Please log in again.'
              : 'Could not save the employee. Please try again.');
        }

        this.cdr.detectChanges();
      },
    });
  }

  imgKey(employee: EmployeeRow, index: number): string {
    return String(employee.id ?? index);
  }

  onImgError(key: string): void {
    this.failedImages.add(key);
    this.cdr.detectChanges();
  }

  get totalPages(): number {
    return this.serverLastPage;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get pagedEmployees(): EmployeeRow[] {
    return this.employees;
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
    this.loadEmployees();
  }

  changePageSize(size: number | string): void {
    const parsed = Number(size);

    if (!this.pageSizes.includes(parsed)) {
      return;
    }

    this.pageSize = parsed;
    this.page = 1;
    this.loadEmployees();
  }

  private emptyForm(): EmployeeForm {
    return {
      firstName: '',
      middleName: '',
      lastName: '',
      spouseName: '',
      fatherName: '',
      motherName: '',
      designation: '',
      email: '',
      phoneNumber: '',
      gender: '',
      dateOfBirth: '',
      dateOfJoin: '',
      nidCardNumber: '',
    };
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

  openEdit(emp: EmployeeRow): void {
    if (emp.id === null || emp.id === undefined || emp.id === '') {
      this.errorMessage = 'Cannot edit this employee because the API response has no employee ID.';
      return;
    }

    const raw = emp.raw;
    const user = raw?.user ?? raw;

    this.editingId = emp.id;

    this.form = {
      firstName: this.pick(user, ['firstName']) ?? '',

      middleName: this.pick(user, ['middleName']) ?? '',

      lastName: this.pick(user, ['lastName']) ?? '',

      spouseName: this.pick(user, ['spouseName']) ?? '',

      fatherName: this.pick(user, ['fatherName', 'fathersName']) ?? '',

      motherName: this.pick(user, ['motherName', 'mothersName']) ?? '',

      designation: emp.designation === '-' ? '' : emp.designation,

      email: emp.email === '-' ? '' : emp.email,

      phoneNumber: emp.phone === '-' ? '' : emp.phone,

      gender: String(this.pick(user, ['genderId', 'gender']) ?? ''),

      dateOfBirth: this.toInputDate(this.pick(user, ['dob', 'dateOfBirth', 'birthDate'])),

      dateOfJoin: this.toInputDate(this.pick(raw, ['joinDate', 'dateOfJoin', 'joiningDate'])),

      nidCardNumber: this.pick(user, ['nid', 'nidCardNumber', 'nidNumber']) ?? '',
    };

    this.imageFile = null;
    this.imagePreview = emp.image ?? '';

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

  invalid(field: keyof EmployeeForm): boolean {
    if (!this.submitted) {
      return false;
    }

    const value = String(this.form[field] ?? '').trim();

    if (field === 'middleName') {
      return false;
    }

    if (field === 'email') {
      return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    if (field === 'gender') {
      return !['1', '2', '3'].includes(value);
    }

    return !value;
  }

  get formValid(): boolean {
    const requiredFields: (keyof EmployeeForm)[] = [
      'firstName',
      'lastName',
      'spouseName',
      'fatherName',
      'motherName',
      'designation',
      'email',
      'phoneNumber',
      'gender',
      'dateOfBirth',
      'dateOfJoin',
      'nidCardNumber',
    ];

    return requiredFields.every((field) => {
      const value = String(this.form[field] ?? '').trim();

      if (!value) {
        return false;
      }

      if (field === 'email') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }

      if (field === 'gender') {
        return ['1', '2', '3'].includes(value);
      }

      return true;
    });
  }

  save(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.formValid) {
      this.errorMessage = 'Please complete all required fields correctly.';
      return;
    }
    const normalizedEmail = this.form.email.trim().toLowerCase();

    const duplicateEmail = this.employees.some((emp) => {
      const sameEmail = emp.email.trim().toLowerCase() === normalizedEmail;
      const sameEmployee = String(emp.id) === String(this.editingId);

      return sameEmail && !sameEmployee;
    });

    if (duplicateEmail) {
      this.errorMessage = 'This email address is already used by another employee.';
      return;
    }

    if (this.saving) {
      return;
    }
    const phone = this.form.phoneNumber.trim();

    if (!this.isValidBdPhone(phone)) {
      this.errorMessage =
        'Enter a valid Bangladesh phone number (e.g. 01712345678 or +8801712345678).';
      return;
    }

    const wasEditing = this.editingId !== null;

    const existingEmployee = wasEditing
      ? this.employees.find((emp) => String(emp.id) === String(this.editingId))
      : undefined;

    const existingUser = existingEmployee?.raw?.user ?? existingEmployee?.raw;

    const existingImage =
      this.pick(existingUser, [
        'image',
        'imageUrl',
        'imagePath',
        'photo',
        'photoUrl',
        'profileImage',
        'profilePicture',
        'avatar',
      ]) ?? '';

    const sendRequest = (base64: string): void => {
      const payload: EmployeePayload = {
        designation: this.form.designation.trim(),
        joinDate: this.toApiDate(this.form.dateOfJoin),
        email: this.form.email.trim(),
        phoneNumber: this.form.phoneNumber.trim(),
        firstName: this.form.firstName.trim(),
        middleName: this.form.middleName.trim(),
        lastName: this.form.lastName.trim(),
        fatherName: this.form.fatherName.trim(),
        motherName: this.form.motherName.trim(),
        spouseName: this.form.spouseName.trim(),
        dob: this.toApiDate(this.form.dateOfBirth),
        nid: this.form.nidCardNumber.trim(),
        genderId: Number(this.form.gender),
        image: this.imageFile ? this.imageFile.name : String(existingImage),
        base64,
      };

      this.saving = true;

      const request = wasEditing
        ? this.service.updateEmployee(this.editingId!, payload)
        : this.service.createEmployee(payload);

      request.subscribe({
        next: (response: any) => {
          console.log('SAVE EMPLOYEE RESPONSE:', response);

          this.saving = false;
          this.showModal = false;
          this.imageFile = null;
          this.imagePreview = '';
          this.submitted = false;

          this.flash(
            wasEditing ? 'Employee updated successfully.' : 'Employee added successfully.',
          );

          this.loadEmployees();
          this.cdr.detectChanges();
        },

        error: (error: HttpErrorResponse) => {
          console.error('SAVE EMPLOYEE ERROR:', error);

          console.error('API RESPONSE:', error.error);

          this.saving = false;

          this.errorMessage =
            error.error?.message ??
            error.error?.title ??
            (error.status === 401
              ? 'Unauthorized. Please log in again.'
              : error.status === 400
                ? 'Invalid employee data. Check the fields and image format.'
                : 'Could not save the employee. Please try again.');

          this.cdr.detectChanges();
        },
      });
    };

    if (this.imageFile) {
      const reader = new FileReader();

      reader.onload = () => {
        const result = String(reader.result ?? '');

        const base64 = result.includes(',') ? result.split(',')[1] : result;

        sendRequest(base64);
      };

      reader.onerror = () => {
        this.saving = false;
        this.errorMessage = 'Could not read the selected image.';

        this.cdr.detectChanges();
      };

      reader.readAsDataURL(this.imageFile);
    } else {
      sendRequest('');
    }
  }

  remove(emp: EmployeeRow): void {
    if (emp.id === null || emp.id === undefined || emp.id === '') {
      this.errorMessage =
        'Cannot delete this employee because the API response has no employee ID.';
      return;
    }

    if (!confirm(`Delete ${emp.name}?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.service.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.flash('Employee deleted successfully.');

        if (this.employees.length === 1 && this.page > 1) {
          this.page--;
        }

        this.loadEmployees();
      },

      error: (error: HttpErrorResponse) => {
        console.error('DELETE EMPLOYEE ERROR:', error);

        console.error('API RESPONSE:', error.error);

        this.errorMessage =
          error.error?.message ??
          (error.status === 401
            ? 'Unauthorized. Please log in again.'
            : 'Could not delete the employee. Please try again.');

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
