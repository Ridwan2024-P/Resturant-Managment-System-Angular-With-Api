import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Alertbox } from './alertbox/alertbox';



@Component({
  imports: [RouterOutlet, Alertbox],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('SP');
}
