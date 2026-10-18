import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Replacement for window.confirm(). Usage:
 *
 *   const ok = await this.confirmService.confirm({ message: 'Delete David?' });
 *   if (!ok) return;
 *
 * The dialog itself is rendered once by <app-confirm-dialog> in app.html.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly open = signal(false);
  readonly options = signal<Required<ConfirmOptions>>({
    title: 'Are you sure?',
    message: '',
    confirmText: 'Delete',
    cancelText: 'Cancel',
  });

  private resolver: ((result: boolean) => void) | null = null;

  confirm(options: ConfirmOptions): Promise<boolean> {
    // A new request while one is open counts as "cancel" for the old one.
    this.resolver?.(false);

    this.options.set({
      title: options.title ?? 'Are you sure?',
      message: options.message,
      confirmText: options.confirmText ?? 'Delete',
      cancelText: options.cancelText ?? 'Cancel',
    });
    this.open.set(true);

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  resolve(result: boolean): void {
    this.open.set(false);

    const resolver = this.resolver;
    this.resolver = null;
    resolver?.(result);
  }
}
