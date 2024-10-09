import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerPickerComponent } from './manager-picker.component';

describe('ManagerPickerComponent', () => {
  let component: ManagerPickerComponent;
  let fixture: ComponentFixture<ManagerPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
