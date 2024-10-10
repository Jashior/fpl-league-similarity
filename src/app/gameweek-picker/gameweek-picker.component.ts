import {
  Component,
  inject,
  Signal,
  computed,
  effect,
  DestroyRef,
} from '@angular/core';
import { DataService } from '../services/data.service';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiDataList } from '@taiga-ui/core';
import { TuiDataListWrapper } from '@taiga-ui/kit';
import {
  TuiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';

@Component({
  selector: 'app-gameweek-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiSelectModule,
    TuiTextfieldControllerModule,
  ],
  template: `
    <form>
      <tui-select [readOnly]="loading()" [formControl]="gameweekControl">
        Gameweek
        <input placeholder="Choose gameweek" tuiTextfieldLegacy />
        <tui-data-list-wrapper *tuiDataList [items]="gameweeks()" />
      </tui-select>
    </form>
    <br />
  `,
  styleUrl: './gameweek-picker.component.scss',
})
export class GameweekPickerComponent {
  private dataService: DataService = inject(DataService);
  private destroyRef = inject(DestroyRef);

  loading: Signal<boolean> = toSignal(this.dataService.loading$, {
    initialValue: false,
  });

  maxGameweek: Signal<number> = toSignal(this.dataService.maxGameweek$, {
    initialValue: 0,
  });

  currentGameweek: Signal<number> = toSignal(
    this.dataService.currentGameweek$,
    { initialValue: 0 }
  );

  gameweeks: Signal<number[]> = computed(() =>
    Array.from({ length: this.maxGameweek() }, (_, i) => i + 1)
  );

  gameweekControl = new FormControl<number>(this.currentGameweek());

  constructor() {
    effect(() => {
      this.gameweekControl.setValue(this.currentGameweek(), {
        emitEvent: false,
      });
    });

    this.gameweekControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        if (newValue !== null && newValue !== this.currentGameweek()) {
          console.log(`settin current gamewek ${newValue}`);
          this.dataService.setCurrentGameweek(newValue);
        }
      });
  }
}
