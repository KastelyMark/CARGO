import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

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
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  car?: Car;
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
  private baseUrl = 'http://localhost:5000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.checkAuthStatus();
  }

  private checkAuthStatus() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      console.log('Checking auth status, token:', token ? 'exists' : 'not found');
      
      if (token) {
        // Használjunk setTimeout-ot, hogy elkerüljük az SSR problémákat
        setTimeout(() => {
          const headers = { 'Authorization': `Bearer ${token}` };
          console.log('Calling /auth/me endpoint...');
          
          this.http.get<{success: boolean, user: User}>(`${this.baseUrl}/auth/me`, { headers })
            .subscribe({
              next: (response) => {
                console.log('/auth/me response:', response);
                if (response.success) {
                  this.currentUserSubject.next(response.user);
                  console.log('User authenticated:', response.user);
                } else {
                  console.log('Auth failed, removing token');
                  localStorage.removeItem('token');
                  this.currentUserSubject.next(null);
                }
              },
              error: (error) => {
                console.error('/auth/me error:', error);
                localStorage.removeItem('token');
                this.currentUserSubject.next(null);
              }
            });
        }, 100);
      }
    }
  }

  // Auth methods
  login(credentials: {email: string, password: string}): Observable<any> {
    console.log('API Service: Attempting login for', credentials.email);
    
    return this.http.post<any>(`${this.baseUrl}/auth/login`, credentials)
      .pipe(
        tap(response => {
          console.log('API Service: Login response received', response);
          
          if (response.success && response.token && isPlatformBrowser(this.platformId)) {
            console.log('API Service: Storing token and user data');
            localStorage.setItem('token', response.token);
            this.currentUserSubject.next(response.user);
            console.log('API Service: Current user set to', response.user);
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

  forceVerifyUser(email: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/force-verify`, { email });
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, {})
      .pipe(
        tap(() => {
          if (isPlatformBrowser(this.platformId)) {
            localStorage.removeItem('token');
          }
          this.currentUserSubject.next(null);
        })
      );
  }

  // Cars methods
  getCars(): Observable<{success: boolean, cars: Car[]}> {
    const options = isPlatformBrowser(this.platformId) ? { withCredentials: true } : {};
    return this.http.get<{success: boolean, cars: Car[]}>(`${this.baseUrl}/cars`, options);
  }

  // Rentals methods
  getRentals(): Observable<{success: boolean, rentals: Rental[]}> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable(observer => {
        observer.next({ success: true, rentals: [] });
        observer.complete();
      });
    }
    
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.get<{success: boolean, rentals: Rental[]}>(`${this.baseUrl}/rentals`, {
      headers,
      withCredentials: true
    });
  }

  createRental(rentalData: any): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return new Observable(observer => {
        observer.next({ success: false, message: 'Not in browser' });
        observer.complete();
      });
    }
    
    const token = localStorage.getItem('token');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return this.http.post<any>(`${this.baseUrl}/rentals`, rentalData, {
      headers,
      withCredentials: true
    });
  }

  // Contact method
  sendContactMessage(message: ContactMessage): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/contact`, message);
  }

  // Generic HTTP methods for admin
  get(url: string): Observable<any> {
    return this.http.get<any>(`http://localhost:5000${url}`, { withCredentials: true });
  }

  post(url: string, data: any): Observable<any> {
    return this.http.post<any>(`http://localhost:5000${url}`, data, { withCredentials: true });
  }

  put(url: string, data: any): Observable<any> {
    return this.http.put<any>(`http://localhost:5000${url}`, data, { withCredentials: true });
  }

  delete(url: string): Observable<any> {
    return this.http.delete<any>(`http://localhost:5000${url}`, { withCredentials: true });
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}