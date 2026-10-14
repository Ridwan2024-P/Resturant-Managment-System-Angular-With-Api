import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewOrders } from './new-orders';

describe('NewOrders', () => {
  let component: NewOrders;
  let fixture: ComponentFixture<NewOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(NewOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
