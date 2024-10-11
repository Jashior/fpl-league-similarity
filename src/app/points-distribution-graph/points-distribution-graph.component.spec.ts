import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointsDistributionGraphComponent } from './points-distribution-graph.component';

describe('PointsDistributionGraphComponent', () => {
  let component: PointsDistributionGraphComponent;
  let fixture: ComponentFixture<PointsDistributionGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointsDistributionGraphComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointsDistributionGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
