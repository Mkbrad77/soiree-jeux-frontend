import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameIntro } from './game-intro';

describe('GameIntro', () => {
  let component: GameIntro;
  let fixture: ComponentFixture<GameIntro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameIntro]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameIntro);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

