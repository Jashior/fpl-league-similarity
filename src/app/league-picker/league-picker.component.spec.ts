import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaguePickerComponent } from './league-picker.component';

describe('LeaguePickerComponent', () => {
  let component: LeaguePickerComponent;
  let fixture: ComponentFixture<LeaguePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaguePickerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaguePickerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
