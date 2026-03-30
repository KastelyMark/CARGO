import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnDestroy {
  credentials = { email: '', password: '' };
  forgotEmail = '';

  isSubmitting = false;
  isForgotSubmitting = false;
  showForgotForm = false;
  showMessage = false;
  messageText = '';
  messageType = '';

  private sub?: Subscription;

  constructor(private apiService: ApiService, private router: Router) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSubmit(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.hideMessage();

    this.sub = this.apiService.login(this.credentials).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response?.success) {
          this.showSuccessMessage('Sikeres bejelentkezés!');
          setTimeout(() => {
            const pendingRental = sessionStorage.getItem('pendingRental');
            if (pendingRental) {
              try {
                const rental = JSON.parse(pendingRental);
                sessionStorage.removeItem('pendingRental');
                this.router.navigate(['/dashboard'], {
                  queryParams: { carId: rental.carId, carName: rental.carName, carPrice: rental.carPrice }
                });
                return;
              } catch {}
            }
            this.router.navigate(['/dashboard']);
          }, 1000);
        } else {
          this.showErrorMessage(response?.message || 'Hibás email vagy jelszó.');
        }
      },
      error: (error: any) => {
        this.isSubmitting = false;
        this.showErrorMessage(error.error?.message || 'Hiba történt a bejelentkezés során.');
      }
    });
  }

  onForgotPassword(): void {
    if (this.isForgotSubmitting || !this.forgotEmail) return;
    this.isForgotSubmitting = true;
    this.hideMessage();

    this.apiService.forgotPassword(this.forgotEmail).subscribe({
      next: (response) => {
        this.isForgotSubmitting = false;
        this.showSuccessMessage(response?.message || 'Ha az email cím regisztrálva van, elküldtük az ideiglenes jelszót.');
        this.showForgotForm = false;
        this.forgotEmail = '';
      },
      error: (error: any) => {
        this.isForgotSubmitting = false;
        this.showErrorMessage(error.error?.message || 'Hiba történt a jelszó visszaállítás során.');
      }
    });
  }

  toggleForgotForm(): void {
    this.showForgotForm = !this.showForgotForm;
    this.hideMessage();
  }

  private showSuccessMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'success';
    this.showMessage = true;
  }

  private showErrorMessage(message: string): void {
    this.messageText = message;
    this.messageType = 'error';
    this.showMessage = true;
  }

  private hideMessage(): void {
    this.showMessage = false;
  }
}
