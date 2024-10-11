import {
  Component,
  OnInit,
  inject,
  DestroyRef,
  computed,
  signal,
  effect,
  Signal,
  WritableSignal,
} from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiMultiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { DataService, PlayerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';

@Component({
  standalone: true,
  selector: 'app-player-picker',
  template: `
    <tui-multi-select
      [formControl]="playerControl"
      [stringify]="stringify"
      [tuiTextfieldLabelOutside]="true"
      (searchChange)="onSearch($event)"
    >
      <small>Highlight Player Owned</small>
      <cdk-virtual-scroll-viewport
        *tuiDataList
        appendOnly
        [itemSize]="15"
        class="viewport"
      >
        <tui-data-list tuiMultiSelectGroup>
          <button
            *cdkVirtualFor="let item of filteredItems()"
            tuiOption
            type="button"
            [value]="item"
          >
            {{ item.web_name }}
          </button>
        </tui-data-list>
      </cdk-virtual-scroll-viewport>
    </tui-multi-select>
    <br />
  `,
  imports: [
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    AsyncPipe,
    ReactiveFormsModule,
    TuiMultiSelectModule,
    TuiTextfieldControllerModule,
    TuiLet,
  ],
  styleUrl: './player-picker.component.scss',
})
export class PlayerPickerComponent implements OnInit {
  private dataService: DataService = inject(DataService);
  private destroyRef: DestroyRef = inject(DestroyRef);

  private players: Signal<PlayerData[]> = toSignal(
    this.dataService.playerData$,
    {
      initialValue: [],
    }
  );
  private highlightedPlayerIds: Signal<number[]> = toSignal(
    this.dataService.highlightedPlayers$,
    { initialValue: [] }
  );

  private searchQuery: WritableSignal<string> = signal<string>('');

  protected readonly playerControl: FormControl<PlayerData[]> = new FormControl<
    PlayerData[]
  >([], {
    nonNullable: true,
  });

  protected readonly stringify: TuiStringHandler<PlayerData> = (
    player: PlayerData
  ) => player.web_name;

  protected filteredItems: Signal<PlayerData[]> = computed(() => {
    const search = this.searchQuery().toLowerCase();
    return this.players()
      .filter(({ web_name }) => web_name.toLowerCase().includes(search))
      .sort((a, b) => b.now_cost - a.now_cost);
  });

  constructor() {
    effect(() => {
      const highlightedPlayers: PlayerData[] = this.players().filter((player) =>
        this.highlightedPlayerIds().includes(player.id)
      );
      this.playerControl.setValue(highlightedPlayers, { emitEvent: false });
    });
  }

  ngOnInit() {
    this.handlePlayerControlChanges();
  }

  protected onSearch(search: string | null): void {
    this.searchQuery.set(search || '');
  }

  private handlePlayerControlChanges(): void {
    this.playerControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        this.dataService.setHighlightedPlayers(
          newValue.map((player) => player.id)
        );
      });
  }
}
