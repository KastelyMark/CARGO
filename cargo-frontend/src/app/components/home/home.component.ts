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
    
    this.isSubmitting = true;
    
    try {
      const response = await this.apiService.sendContactMessage(this.contactData).toPromise();
      
      if (response.success) {
        this.showSuccessMessage('Üzenet sikeresen elküldve!');
        this.contactData = { name: '', email: '', message: '' };
      } else {
        this.showErrorMessage('Hiba történt az üzenet küldése során.');
      }
    } catch (error) {
      this.showErrorMessage('Hiba történt az üzenet küldése során.');
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