import { Component, inject, Signal } from '@angular/core';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { GameweekPickerComponent } from '../gameweek-picker/gameweek-picker.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [JsonPipe, GameweekPickerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private dataService: DataService = inject(DataService);
  managerData: Signal<ManagerData[]> = toSignal(this.dataService.managerData$, {
    initialValue: [],
  });
  currentGameweek: Signal<number> = toSignal(
    this.dataService.currentGameweek$,
    { initialValue: 0 }
  );

  constructor() {}
}
