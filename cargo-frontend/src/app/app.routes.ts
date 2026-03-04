import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { 
    path: 'home', 
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    data: { animation: 'HomePage' }
  },
  { 
    path: 'cars', 
    loadComponent: () => import('./components/cars/cars.component').then(m => m.CarsComponent),
    data: { animation: 'CarsPage' }
  },
  { 
    path: 'login', 
    loadComponent: () => import('./components/auth/login/login.component').then(m => m.LoginComponent),
    data: { animation: 'LoginPage' }
  },
  { 
    path: 'register', 
    loadComponent: () => import('./components/auth/register/register.component').then(m => m.RegisterComponent),
    data: { animation: 'RegisterPage' }
  },
  { 
    path: 'verify', 
    loadComponent: () => import('./components/auth/verify/verify.component').then(m => m.VerifyComponent),
    canActivate: [() => {
      const hasPendingVerification = localStorage.getItem('pendingVerification') === 'true';
      if (!hasPendingVerification) {
        // Ha nincs pending verification, irányítsuk át a login oldalra
        window.location.href = '/login';
        return false;
      }
      return true;
    }],
    data: { animation: 'VerifyPage' }
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard],
    data: { animation: 'DashboardPage' }
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    data: { animation: 'AdminPage' }
  },
  { path: '**', redirectTo: '/home' }
];