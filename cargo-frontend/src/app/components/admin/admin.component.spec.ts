import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent, HttpClientTestingModule, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('a komponens létrejön', () => {
    expect(component).toBeTruthy();
  });

  it('kezdetben nincs bejelentkezve az admin', () => {
    expect(component.isLoggedIn).toBeFalse();
  });

  it('az aktív tab alapból dashboard', () => {
    expect(component.activeTab).toBe('dashboard');
  });

  it('switchTab megváltoztatja az aktív tabot', () => {
    component.switchTab('users');
    expect(component.activeTab).toBe('users');
  });

});
