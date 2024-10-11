import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiMultiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { Observable, Subject, combineLatest, map, startWith } from 'rxjs';
import { DataService, PlayerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
      *tuiLet="items$ | async as items"
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
            *cdkVirtualFor="let item of items"
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
  private destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  protected readonly items$: Observable<PlayerData[]> = combineLatest([
    this.search$.pipe(startWith('')),
    this.dataService.playerData$,
  ]).pipe(
    map(([search, players]) =>
      players
        .filter(({ web_name }) =>
          web_name.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => b.now_cost - a.now_cost)
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
