import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerPickerComponent } from './player-picker.component';

describe('PlayerPickerComponent', () => {
  let component: PlayerPickerComponent;
  let fixture: ComponentFixture<PlayerPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayerPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
