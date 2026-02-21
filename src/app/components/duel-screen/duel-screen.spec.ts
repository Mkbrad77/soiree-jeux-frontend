import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DuelScreenComponent } from './duel-screen';

describe('DuelScreenComponent', () => {
  let component: DuelScreenComponent;
  let fixture: ComponentFixture<DuelScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DuelScreenComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DuelScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

