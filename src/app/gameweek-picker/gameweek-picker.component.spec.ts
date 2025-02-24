import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameweekPickerComponent } from './gameweek-picker.component';

describe('GameweekPickerComponent', () => {
  let component: GameweekPickerComponent;
  let fixture: ComponentFixture<GameweekPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameweekPickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameweekPickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
