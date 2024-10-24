import {
  Component,
  OnInit,
  inject,
  computed,
  signal,
  effect,
  DestroyRef,
  Signal,
  WritableSignal,
} from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiStringHandler } from '@taiga-ui/cdk';
import {
  TuiMultiSelectModule,
  TuiTextfieldControllerModule,
} from '@taiga-ui/legacy';
import { DataService, ManagerData } from '../services/data.service';
import { TuiLet } from '@taiga-ui/cdk';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { takeUntil } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-manager-picker',
  template: `
    <tui-multi-select
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
            *cdkVirtualFor="let item of filteredItems()"
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
  private destroyRef: DestroyRef = inject(DestroyRef);
  private managers: Signal<ManagerData[]> = toSignal(
    this.dataService.managerData$,
    {
      initialValue: [],
    }
  );
  private highlightedManagerIds: Signal<number[]> = toSignal(
    this.dataService.highlightedManagers$,
    { initialValue: [] }
  );
  private searchQuery: WritableSignal<string> = signal<string>('');

  protected readonly managerControl = new FormControl<ManagerData[]>([], {
    nonNullable: true,
  });

  protected readonly stringify: TuiStringHandler<ManagerData> = (
    manager: ManagerData
  ) => manager.manager_name;

  protected filteredItems: Signal<ManagerData[]> = computed(() => {
    const search = this.searchQuery().toLowerCase();
    return this.managers().filter(({ manager_name }) =>
      manager_name.toLowerCase().includes(search)
    );
  });

  constructor() {
    effect(() => {
      const highlightedManagers: ManagerData[] = this.managers().filter(
        (manager) => this.highlightedManagerIds().includes(manager.team_id)
      );
      this.managerControl.setValue(highlightedManagers, { emitEvent: false });
    });
  }

  ngOnInit() {
    this.handleManagerControlChanges();
  }

  protected onSearch(search: string | null): void {
    this.searchQuery.set(search || '');
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
