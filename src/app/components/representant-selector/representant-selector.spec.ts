import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepresentantSelectorComponent } from './representant-selector';

describe('RepresentantSelectorComponent', () => {
  let component: RepresentantSelectorComponent;
  let fixture: ComponentFixture<RepresentantSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepresentantSelectorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RepresentantSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

