import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface Car {
  id: number;
  name: string;
  description: string;
  category: string;
  price_per_day: number;
  seats: number;
  transmission: string;
  fuel_type: string;
  image_url?: string;
  status: string;
}

export interface Rental {
  id: number;
  car_id: number;
  user_id: number;
  car_name: string;
  car_price: string;
  rental_date: string;
  return_date: string;
  customer_name: string;
  customer_email: string;
  total_days: number;
  total_price: number;
  status: string;
  created_at?: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  readonly baseUrl = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    this.http.get<{ success: boolean; user: User }>(`${this.baseUrl}/auth/me`)
      .pipe(
        catchError(() => {
          localStorage.removeItem('token');
          this.currentUserSubject.next(null);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response?.success) {
          this.currentUserSubject.next(response.user);
        } else {
          localStorage.removeItem('token');
          this.currentUserSubject.next(null);
        }
      });
  }

  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response?.success && response.token && isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', response.token);
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/register`, userData);
  }

  verify(code: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/verify`, { code });
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/resend-verification`, { email });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/forgot-password`, { email });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, {}).pipe(
      tap(() => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('token');
        }
        this.currentUserSubject.next(null);
      }),
      catchError(() => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('token');
        }
        this.currentUserSubject.next(null);
        return of({ success: true });
      })
    );
  }

  getCars(params?: Record<string, string>): Observable<{ success: boolean; cars: Car[] }> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.http.get<{ success: boolean; cars: Car[] }>(`${this.baseUrl}/cars${queryString}`);
  }

  getRentals(): Observable<{ success: boolean; rentals: Rental[] }> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: true, rentals: [] });
    }
    return this.http.get<{ success: boolean; rentals: Rental[] }>(`${this.baseUrl}/rentals`);
  }

  createRental(rentalData: any): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: false, message: 'Not in browser' });
    }
    return this.http.post<any>(`${this.baseUrl}/rentals`, rentalData);
  }

  sendContactMessage(message: ContactMessage): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/contact`, message);
  }

  get(url: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}${url}`);
  }

  post(url: string, data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}${url}`, data);
  }

  put(url: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}${url}`, data);
  }

  delete(url: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}${url}`);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }
}
