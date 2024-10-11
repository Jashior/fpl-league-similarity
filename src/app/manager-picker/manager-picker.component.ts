import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiMultiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { Observable, Subject, combineLatest, map, startWith } from 'rxjs';
import { DataService, ManagerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';

@Component({
  standalone: true,
  selector: 'app-manager-picker',
  template: `
    <tui-multi-select
      *tuiLet="items$ | async as items"
      [formControl]="managerControl"
      [stringify]="stringify"
      [tuiTextfieldLabelOutside]="true"
      (searchChange)="onSearch($event)"
    >
      <small>Highlight Manager</small>
      <cdk-virtual-scroll-viewport
        *tuiDataList
        appendOnly
        class="viewport"
        [itemSize]="15"
      >
        <tui-data-list tuiMultiSelectGroup>
          <button
            *cdkVirtualFor="let item of items"
            tuiOption
            type="button"
            [value]="item"
          >
            {{ item.manager_name }}
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
    JsonPipe,
  ],
  styleUrl: './manager-picker.component.scss',
})
export class ManagerPickerComponent implements OnInit {
  private dataService: DataService = inject(DataService);
  private destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  protected readonly items$: Observable<ManagerData[]> = combineLatest([
    this.search$.pipe(startWith('')),
    this.dataService.managerData$,
  ]).pipe(
    map(([search, managers]) =>
      managers.filter(({ manager_name }) =>
        manager_name.toLowerCase().includes(search.toLowerCase())
      )
    ),
    startWith([])
  );

  protected readonly managerControl = new FormControl<ManagerData[]>([], {
    nonNullable: true,
  });

  protected readonly stringify: TuiStringHandler<ManagerData> = (
    manager: ManagerData
  ) => manager.manager_name;

  ngOnInit() {
    this.initializeHighlightedManagers();
    this.handleManagerControlChanges();
  }

  protected onSearch(search: string | null): void {
    this.search$.next(search || '');
  }

  private initializeHighlightedManagers(): void {
    combineLatest([
      this.dataService.highlightedManagers$,
      this.dataService.managerData$,
    ])
      .pipe(
        map(([highlightedIds, managers]) =>
          managers.filter((manager) => highlightedIds.includes(manager.team_id))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((highlightedManagers) => {
        this.managerControl.setValue(highlightedManagers, { emitEvent: false });
      });
  }

  private handleManagerControlChanges(): void {
    this.managerControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        this.dataService.setHighlightedManagers(
          newValue.map((manager) => manager.team_id)
        );
      });
  }
}
