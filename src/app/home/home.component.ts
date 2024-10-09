import { Component, inject, Signal } from '@angular/core';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { GameweekPickerComponent } from '../gameweek-picker/gameweek-picker.component';
import { LeaguePickerComponent } from '../league-picker/league-picker.component';
import { GraphComponent } from '../graph/graph.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    JsonPipe,
    GameweekPickerComponent,
    LeaguePickerComponent,
    GraphComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private dataService: DataService = inject(DataService);
  loading: Signal<boolean> = toSignal(this.dataService.loading$, {
    initialValue: false,
  });
  managerData: Signal<ManagerData[]> = toSignal(this.dataService.managerData$, {
    initialValue: [],
  });
  currentGameweek: Signal<number> = toSignal(
    this.dataService.currentGameweek$,
    { initialValue: 0 }
  );

  constructor() {}
}
