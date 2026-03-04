import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class VerifyGuard implements CanActivate {
  
  constructor(private router: Router) {}
  
  canActivate(): boolean {
    // Ellenőrizzük, hogy van-e pending verification
    const hasPendingVerification = localStorage.getItem('pendingVerification') === 'true';
    
    if (!hasPendingVerification) {
      // Ha nincs pending verification, irányítsuk át a login oldalra
      this.router.navigate(['/login']);
      return false;
    }
    
    return true;
  }
}