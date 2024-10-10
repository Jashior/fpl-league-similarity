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
import { DataService, ManagerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
      Manager
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
        <span>{{ data.manager_name }}</span>
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
