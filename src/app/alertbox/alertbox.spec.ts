import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Alertbox } from './alertbox';

describe('Alertbox', () => {
  let component: Alertbox;
  let fixture: ComponentFixture<Alertbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Alertbox],
    }).compileComponents();

    fixture = TestBed.createComponent(Alertbox);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
