import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  okText?: string;
}

type DialogOptions = Required<ConfirmOptions> & { variant: 'confirm' | 'alert' };

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly options = signal<DialogOptions>({
    variant: 'confirm',
    title: 'Are you sure?',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });

  private resolver: ((result: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    return this.show({
      variant: 'confirm',
      title: options.title ?? 'Are you sure?',
      message: options.message,
      confirmText: options.confirmText ?? 'Delete',
      cancelText: options.cancelText ?? 'Cancel',
    });
  }

  async alert(options: AlertOptions): Promise<void> {
    await this.show({
      variant: 'alert',
      title: options.title ?? 'Notice',
      message: options.message,
      confirmText: options.okText ?? 'OK',
      cancelText: '',
    });
  }

  resolve(result: boolean): void {
    this.open.set(false);

    const resolver = this.resolver;
    this.resolver = null;
    resolver?.(result);
  }

  private show(options: DialogOptions): Promise<boolean> {
    this.resolver?.(false);
    this.options.set(options);
    this.open.set(true);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }
}
