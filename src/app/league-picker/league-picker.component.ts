import { Component, inject, Signal, effect, DestroyRef } from '@angular/core';
import { DataService, League } from '../services/data.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiDataList } from '@taiga-ui/core';
import { TuiDataListWrapper, tuiItemsHandlersProvider } from '@taiga-ui/kit';
import {
  TuiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-league-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiSelectModule,
    TuiTextfieldControllerModule,
  ],
  template: `
    <form>
      <tui-select
        [formControl]="leagueControl"
        [readOnly]="loading()"
        [identityMatcher]="identityMatcher"
      >
        League
        <input
          tuiTextfieldLegacy
          placeholder="Choose league"
          [value]="currentLeague()?.name || 'yo'"
        />

        <tui-data-list-wrapper *tuiDataList [items]="availableLeagues()">
        </tui-data-list-wrapper>
      </tui-select>
      <br />
    </form>
  `,
  styleUrl: './league-picker.component.scss',
  providers: [
    tuiItemsHandlersProvider({
      stringify: (item: League): string => `${item.name}`,
    }),
  ],
})
export class LeaguePickerComponent {
  private dataService: DataService = inject(DataService);
  private destroyRef = inject(DestroyRef);

  loading: Signal<boolean> = toSignal(this.dataService.loading$, {
    initialValue: false,
  });

  availableLeagues: Signal<League[]> = toSignal(
    this.dataService.availableLeagues$,
    {
      initialValue: [],
    }
  );

  currentLeague: Signal<League | null> = toSignal(
    this.dataService.currentLeague$,
    { initialValue: null }
  );

  leagueControl = new FormControl<League | null>(null);

  identityMatcher = (a: League, b: League): boolean => a.id === b.id;

  constructor() {
    effect(() => {
      this.leagueControl.setValue(this.currentLeague(), {
        emitEvent: false,
      });
    });

    this.leagueControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        if (newValue !== null && newValue !== this.currentLeague()) {
          console.log(`Setting current league: ${newValue.name}`);
          this.dataService.setCurrentLeague(newValue);
        }
      });
  }
}
