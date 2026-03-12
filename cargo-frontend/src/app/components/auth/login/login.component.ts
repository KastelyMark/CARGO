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
      this.apiService.login(this.credentials).subscribe({
        next: (response) => {
          if (response && response.success) {
            this.showSuccessMessage('Sikeres bejelentkezés!');
            
            setTimeout(() => {
              const pendingRental = sessionStorage.getItem('pendingRental');
              if (pendingRental) {
                try {
                  const rental = JSON.parse(pendingRental);
                  sessionStorage.removeItem('pendingRental');
                  this.router.navigate(['/dashboard'], {
                    queryParams: {
                      carId: rental.carId,
                      carName: rental.carName,
                      carPrice: rental.carPrice
                    }
                  });
                } catch (e) {
                  this.router.navigate(['/dashboard']);
                }
              } else {
                this.router.navigate(['/dashboard']);
              }
            }, 1000);
          } else {
            this.showErrorMessage(response?.message || 'Hibás email vagy jelszó.');
          }
          this.isSubmitting = false;
        },
        error: (error: any) => {
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