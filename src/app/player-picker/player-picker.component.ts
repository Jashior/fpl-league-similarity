import { TuiDataListWrapper } from '@taiga-ui/kit';
import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
} from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiMultiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { TuiDataList } from '@taiga-ui/core';
import { Observable, Subject, combineLatest, map, startWith } from 'rxjs';
import { DataService, PlayerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  standalone: true,
  selector: 'app-player-picker',
  template: `
    <tui-multi-select
      *tuiLet="items$ | async as items"
      [formControl]="playerControl"
      [stringify]="stringify"
      [tuiTextfieldLabelOutside]="true"
      (searchChange)="onSearch($event)"
    >
      Player
      <tui-data-list-wrapper
        *tuiDataList
        [items]="items"
        [itemContent]="itemContent"
        tuiMultiSelectGroup
      ></tui-data-list-wrapper>
    </tui-multi-select>

    <ng-template #itemContent let-data>
      <div class="template">
        <div class="flex w-full flex-col justify-between"></div>
        <span>{{ data.web_name }}</span>
      </div>
    </ng-template>

    <br />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    TuiDataList,
    TuiDataListWrapper,
    TuiMultiSelectModule,
    TuiTextfieldControllerModule,
    TuiLet,
  ],
})
export class PlayerPickerComponent implements OnInit {
  private dataService: DataService = inject(DataService);
  private destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  protected readonly items$: Observable<PlayerData[]> = combineLatest([
    this.search$.pipe(startWith('')),
    this.dataService.playerData$,
  ]).pipe(
    map(([search, players]) =>
      players.filter(({ web_name }) =>
        web_name.toLowerCase().includes(search.toLowerCase())
      )
    ),
    startWith([])
  );

  protected readonly playerControl = new FormControl<PlayerData[]>([], {
    nonNullable: true,
  });

  protected readonly stringify: TuiStringHandler<PlayerData> = (
    player: PlayerData
  ) => player.web_name;

  ngOnInit() {
    this.initializeHighlightedPlayers();
    this.handlePlayerControlChanges();
  }

  protected onSearch(search: string | null): void {
    this.search$.next(search || '');
  }

  private initializeHighlightedPlayers(): void {
    combineLatest([
      this.dataService.highlightedPlayers$,
      this.dataService.playerData$,
    ])
      .pipe(
        map(([highlightedIds, players]) =>
          players.filter((player) => highlightedIds.includes(player.id))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((highlightedPlayers) => {
        this.playerControl.setValue(highlightedPlayers, { emitEvent: false });
      });
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
