import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, ContactMessage } from '../../services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  contactData: ContactMessage = {
    name: '',
    email: '',
    message: ''
  };
  
  isSubmitting = false;
  showMessage = false;
  messageText = '';
  messageType = '';

  constructor(private apiService: ApiService) {}

  async onSubmit() {
    if (this.isSubmitting) return;
    
    if (!this.contactData.name || this.contactData.name.length < 2) {
      this.showErrorMessage('A névnek legalább 2 karakterből kell állnia');
      return;
    }
    
    if (!this.contactData.email || !this.contactData.email.includes('@')) {
      this.showErrorMessage('Érvényes email címet adj meg');
      return;
    }
    
    if (!this.contactData.message || this.contactData.message.length < 10) {
      this.showErrorMessage('Az üzenetnek legalább 10 karakterből kell állnia');
      return;
    }
    
    this.isSubmitting = true;
    
    try {
      const response = await this.apiService.sendContactMessage(this.contactData).toPromise();
      
      if (response && response.success) {
        this.showSuccessMessage('Üzenet sikeresen elküldve!');
        this.contactData = { name: '', email: '', message: '' };
      } else {
        this.showErrorMessage(response?.message || 'Hiba történt az üzenet küldése során.');
      }
    } catch (error: any) {
      const errorMessage = error.error?.message || 'Hiba történt az üzenet küldése során.';
      this.showErrorMessage(errorMessage);
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