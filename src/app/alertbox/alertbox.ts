
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAlertDialogImports } from '@spartan-ng/helm/alert-dialog';
import { ConfirmService } from '../services/confirm.service';



@Component({
  selector: 'app-alertbox',
  standalone: true,
  imports: [
    HlmAlertDialogImports,
    HlmButtonImports,
    NgIcon,
  ],
  providers: [provideIcons({ lucideTrash2 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './alertbox.css',
  templateUrl: './alertbox.html',
})
export class Alertbox {
  readonly confirm = inject(ConfirmService);

  onStateChanged(state: BrnDialogState): void {
    if (state === 'closed') {
      this.confirm.resolve(false);
    }
  }
}
