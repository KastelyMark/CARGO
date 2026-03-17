import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { PLATFORM_ID } from '@angular/core';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('a komponens létrejön', () => {
    expect(component).toBeTruthy();
  });

  it('kezdetben nincs bejelentkezett felhasználó', () => {
    expect(component.currentUser).toBeNull();
  });

  it('kezdetben a bérlési modal zárva van', () => {
    expect(component.showRentalModal).toBeFalse();
  });

  it('openRentalModal megnyitja a modalt', () => {
    component.openRentalModal();
    expect(component.showRentalModal).toBeTrue();
  });

});
