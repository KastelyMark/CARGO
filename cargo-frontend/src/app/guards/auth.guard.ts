import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}
  
  canActivate(): Observable<boolean> | boolean {
    console.log('AuthGuard: Checking authentication...');
    
    // SSR esetén engedjük át
    if (!isPlatformBrowser(this.platformId)) {
      console.log('AuthGuard: SSR mode, allowing access');
      return true;
    }
    
    // Ellenőrizzük, hogy van-e token
    const token = localStorage.getItem('token');
    console.log('AuthGuard: Token check', token ? 'found' : 'not found');
    
    if (!token) {
      console.log('AuthGuard: No token, redirecting to login');
      this.router.navigate(['/login']);
      return false;
    }
    
    // Ellenőrizzük a current user-t
    const currentUser = this.apiService.getCurrentUser();
    console.log('AuthGuard: Current user check', currentUser);
    
    if (currentUser) {
      console.log('AuthGuard: User found, allowing access');
      return true;
    }
    
    // Ha nincs current user, várjunk a currentUser$ stream-re
    return this.apiService.currentUser$.pipe(
      map(user => {
        console.log('AuthGuard: User stream update', user);
        if (user) {
          return true;
        } else {
          console.log('AuthGuard: No user in stream, redirecting to login');
          this.router.navigate(['/login']);
          return false;
        }
      }),
      catchError((error) => {
        console.error('AuthGuard: Error in user stream', error);
        this.router.navigate(['/login']);
        return of(false);
      })
    );
  }
}