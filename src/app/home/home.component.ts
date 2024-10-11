import { Component, inject, Signal } from '@angular/core';
import { DataService, ManagerData } from '../services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, JsonPipe } from '@angular/common';
import { GameweekPickerComponent } from '../gameweek-picker/gameweek-picker.component';
import { LeaguePickerComponent } from '../league-picker/league-picker.component';
import { GraphComponent } from '../graph/graph.component';
import { ManagerPickerComponent } from '../manager-picker/manager-picker.component';
import { PlayerPickerComponent } from '../player-picker/player-picker.component';
import { TuiIcon } from '@taiga-ui/core';
import { PointDistributionGraphComponent } from '../points-distribution-graph/points-distribution-graph.component';
import { TuiSwitch } from '@taiga-ui/kit';
import { FormsModule } from '@angular/forms';
import { TuiLink } from '@taiga-ui/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    JsonPipe,
    GameweekPickerComponent,
    LeaguePickerComponent,
    GraphComponent,
    ManagerPickerComponent,
    PlayerPickerComponent,
    PointDistributionGraphComponent,
    TuiIcon,
    CommonModule,
    FormsModule,
    TuiSwitch,
    TuiLink,
  ],
  template: `
    <div class="flex h-screen flex-col lg:flex-row">
      <div
        class="lg:w-80 w-full p-4 overflow-y-auto flex flex-col sm:justify-between "
      >
        <div>
          <app-league-picker class="mb-4"></app-league-picker>
          <app-gameweek-picker class="mb-4"></app-gameweek-picker>
          <app-manager-picker></app-manager-picker>
          <app-player-picker></app-player-picker>
          <div class="mb-2">
            <div class="flex items-center space-x-2">
              <span>Show Points Distribution Graph: </span>
              <input
                tuiSwitch
                type="checkbox"
                [(ngModel)]="isPointDistribution"
              />
            </div>
          </div>
        </div>
        <div class="flex justify-center mt-4 mb-2">
          <a
            href="https://github.com/Jashior/fpl_league_similarity
          "
          >
            <button iconEnd="@tui.github" tuiLink type="button">
              View on GitHub
            </button>
          </a>
        </div>
      </div>
      <div class="flex-1 p-4 overflow-hidden">
        @if (managerData() && !loading()) { @if (isPointDistribution) {
        <app-point-distribution-graph
          class="w-full h-full"
        ></app-point-distribution-graph>
        } @else {
        <app-graph class="w-full h-full"></app-graph>
        } } @else {
        <div class="flex items-center justify-center h-full">
          <p class="text-xl text-gray-600">Loading manager data...</p>
        </div>
        }
      </div>
    </div>
  `,
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

  isPointDistribution: boolean = false;

  constructor() {}

  toggleGraphMode() {
    this.isPointDistribution = !this.isPointDistribution;
  }
}
