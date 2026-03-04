import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = {
    email: '',
    password: ''
  };
  
  isSubmitting = false;
  showMessage = false;
  messageText = '';
  messageType = '';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  async onSubmit() {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    
    try {
      console.log('Attempting login with:', this.credentials.email);
      
      this.apiService.login(this.credentials).subscribe({
        next: (response) => {
          console.log('Login response:', response);
          
          if (response && response.success) {
            this.showSuccessMessage('Sikeres bejelentkezés!');
            
            // Várjunk egy kicsit, hogy a token beállítódjon és a currentUser$ frissüljön
            setTimeout(() => {
              console.log('Current user after login:', this.apiService.getCurrentUser());
              console.log('Token in localStorage:', localStorage.getItem('token'));
              
              // Check for pending rental
              const pendingRental = sessionStorage.getItem('pendingRental');
              if (pendingRental) {
                try {
                  const rental = JSON.parse(pendingRental);
                  sessionStorage.removeItem('pendingRental');
                  console.log('Redirecting to dashboard with pending rental:', rental);
                  this.router.navigate(['/dashboard'], {
                    queryParams: {
                      carId: rental.carId,
                      carName: rental.carName,
                      carPrice: rental.carPrice
                    }
                  });
                } catch (e) {
                  console.error('Error parsing pending rental:', e);
                  this.router.navigate(['/dashboard']);
                }
              } else {
                console.log('Redirecting to dashboard...');
                this.router.navigate(['/dashboard']);
              }
            }, 1000);
          } else {
            this.showErrorMessage(response?.message || 'Hibás email vagy jelszó.');
          }
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Login error:', error);
          
          // Részletesebb hibaüzenet
          let errorMessage = 'Hiba történt a bejelentkezés során.';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.showErrorMessage(errorMessage);
          this.isSubmitting = false;
        }
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      this.showErrorMessage('Hiba történt a bejelentkezés során.');
      this.isSubmitting = false;
    }
  }

  private showSuccessMessage(message: string) {
    this.messageText = message;
    this.messageType = 'success';
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }

  private showErrorMessage(message: string) {
    this.messageText = message;
    this.messageType = 'error';
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }
}