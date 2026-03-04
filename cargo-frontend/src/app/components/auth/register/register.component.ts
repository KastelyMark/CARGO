import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  userData = {
    name: '',
    email: '',
    phone: '',
    countryCode: '+36',
    password: '',
    confirmPassword: ''
  };
  
  countryCodes: CountryCode[] = [
    { code: '+36', name: 'Magyarország', flag: '🇭🇺' },
    { code: '+43', name: 'Ausztria', flag: '🇦🇹' },
    { code: '+49', name: 'Németország', flag: '🇩🇪' },
    { code: '+33', name: 'Franciaország', flag: '🇫🇷' },
    { code: '+39', name: 'Olaszország', flag: '🇮🇹' },
    { code: '+34', name: 'Spanyolország', flag: '🇪🇸' },
    { code: '+44', name: 'Egyesült Királyság', flag: '🇬🇧' },
    { code: '+1', name: 'Egyesült Államok', flag: '🇺🇸' },
    { code: '+420', name: 'Csehország', flag: '🇨🇿' },
    { code: '+421', name: 'Szlovákia', flag: '🇸🇰' },
    { code: '+40', name: 'Románia', flag: '🇷🇴' },
    { code: '+385', name: 'Horvátország', flag: '🇭🇷' },
    { code: '+386', name: 'Szlovénia', flag: '🇸🇮' },
    { code: '+48', name: 'Lengyelország', flag: '🇵🇱' }
  ];
  
  isSubmitting = false;
  showMessage = false;
  messageText = '';
  messageType = '';
  showCountryDropdown = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  toggleCountryDropdown() {
    this.showCountryDropdown = !this.showCountryDropdown;
  }

  selectCountryCode(countryCode: CountryCode) {
    this.userData.countryCode = countryCode.code;
    this.showCountryDropdown = false;
  }

  getSelectedCountry(): CountryCode {
    return this.countryCodes.find(c => c.code === this.userData.countryCode) || this.countryCodes[0];
  }

  validatePhone(): boolean {
    const phoneRegex = /^[0-9]{8,15}$/;
    return phoneRegex.test(this.userData.phone);
  }

  async onSubmit() {
    if (this.isSubmitting) return;
    
    if (this.userData.password !== this.userData.confirmPassword) {
      this.showErrorMessage('A jelszavak nem egyeznek meg.');
      return;
    }

    if (!this.validatePhone()) {
      this.showErrorMessage('Kérjük, adjon meg egy érvényes telefonszámot (8-15 számjegy).');
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      // Combine country code with phone number
      const registrationData = {
        ...this.userData,
        phone: this.userData.countryCode + this.userData.phone
      };

      const response = await this.apiService.register(registrationData).toPromise();
      
      if (response.success) {
        // Beállítjuk a pending verification flag-et
        localStorage.setItem('pendingVerification', 'true');
        localStorage.setItem('verificationEmail', this.userData.email);
        
        this.showSuccessMessage('Sikeres regisztráció! Ellenőrizd az email címed a hitelesítéshez.');
        setTimeout(() => {
          this.router.navigate(['/verify']);
        }, 2000);
      } else {
        this.showErrorMessage(response.message || 'Hiba történt a regisztráció során.');
      }
    } catch (error: any) {
      console.error('Register error:', error);
      this.showErrorMessage(error.error?.message || 'Hiba történt a regisztráció során.');
    } finally {
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