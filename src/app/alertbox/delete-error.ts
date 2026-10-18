import { HttpErrorResponse } from '@angular/common/http';

export type DeletedEntity = 'table' | 'employee' | 'food item';

const IN_USE_MESSAGES: Record<DeletedEntity, string> = {
  table:
    'This table cannot be deleted because it is in use. It has assigned employees or existing orders.',
  employee:
    'This employee cannot be deleted because they are in use. They are assigned to a table or linked to existing orders.',
  'food item': 'This food item cannot be deleted because it is used in existing orders.',
};

function rawText(error: HttpErrorResponse): string {
  const body: any = error.error;

  if (typeof body === 'string') return body;

  return String(body?.message ?? body?.detail ?? body?.title ?? body?.error ?? error.message ?? '');
}

export function isInUseError(error: HttpErrorResponse): boolean {
  if (error.status === 409) return true;

  return /association between entity types|has been severed|foreign key|reference constraint|conflicted with|cascade|still referenced|in use|related (data|records)|dependent/i.test(
    rawText(error),
  );
}

export function deleteErrorMessage(
  error: HttpErrorResponse,
  entity: DeletedEntity,
  fallback: string,
): string {
  if (error.status === 0) return 'Cannot reach the server. Check your internet connection.';
  if (error.status === 401) return 'Unauthorized. Please log in again.';
  if (isInUseError(error)) return IN_USE_MESSAGES[entity];
  const text = rawText(error).trim();
  return text && text.length <= 160 ? text : fallback;
}
