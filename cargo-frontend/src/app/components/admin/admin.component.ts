import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Stats {
  users: number;
  registeredUsers: number;
  messages: number;
  newMessages: number;
  rentals: number;
  pendingRentals: number;
  cars: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  is_verified: number;
  created_at: string;
}

interface Car {
  id: number;
  name: string;
  description: string;
  price_per_day: number;
  image_url?: string;
  category: string;
  transmission: string;
  fuel_type: string;
  seats: number;
  status: string;
}

interface Rental {
  id: number;
  user_id: number;
  car_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface Message {
  id: number;
  name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  isLoggedIn = false;
  isLoading = true;
  adminPassword = '';
  
  // Active tab
  activeTab: 'dashboard' | 'users' | 'cars' | 'rentals' | 'messages' = 'dashboard';
  
  // Data
  stats: Stats = {
    users: 0,
    registeredUsers: 0,
    messages: 0,
    newMessages: 0,
    rentals: 0,
    pendingRentals: 0,
    cars: 0
  };
  
  users: User[] = [];
  cars: Car[] = [];
  rentals: Rental[] = [];
  messages: Message[] = [];
  
  // Modals
  showCarModal = false;
  showUserModal = false;
  showEmailModal = false;
  
  // Forms
  carForm: any = {
    id: null,
    name: '',
    description: '',
    price_per_day: 0,
    category: 'Gazdaságos',
    transmission: 'automatic',
    fuel_type: 'Benzin',
    seats: 5
  };
  
  userForm: any = {
    id: null,
    name: '',
    email: '',
    phone: '',
    is_verified: 1
  };
  
  emailForm = {
    toEmail: '',
    toName: '',
    subject: '',
    message: ''
  };
  
  selectedImage: File | null = null;
  
  // Messages
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAdminStatus();
  }

  async checkAdminStatus() {
    try {
      const response: any = await this.apiService.get('/api/admin/status').toPromise();
      this.isLoggedIn = response.logged_in;
      
      if (this.isLoggedIn) {
        await this.loadDashboardData();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isLoggedIn = false;
    } finally {
      this.isLoading = false;
    }
  }

  async login() {
    try {
      const response: any = await this.apiService.post('/api/admin/login', {
        password: this.adminPassword
      }).toPromise();
      
      if (response.success) {
        this.isLoggedIn = true;
        this.adminPassword = '';
        await this.loadDashboardData();
        this.displayMessage('Sikeres bejelentkezés!', 'success');
      }
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Bejelentkezés sikertelen', 'error');
    }
  }

  async logout() {
    try {
      await this.apiService.post('/api/admin/logout', {}).toPromise();
      this.isLoggedIn = false;
      this.displayMessage('Sikeres kijelentkezés', 'success');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async loadDashboardData() {
    try {
      const statsResponse: any = await this.apiService.get('/api/admin/stats').toPromise();
      this.stats = statsResponse.stats;
      
      const usersResponse: any = await this.apiService.get('/api/admin/users').toPromise();
      this.users = usersResponse.users;
      
      const carsResponse: any = await this.apiService.get('/api/cars').toPromise();
      this.cars = carsResponse.cars || [];
      
      const rentalsResponse: any = await this.apiService.get('/api/admin/rentals').toPromise();
      this.rentals = rentalsResponse.rentals;
      
      const messagesResponse: any = await this.apiService.get('/api/admin/messages').toPromise();
      this.messages = messagesResponse.messages;
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  switchTab(tab: 'dashboard' | 'users' | 'cars' | 'rentals' | 'messages') {
    this.activeTab = tab;
  }

  // Car Management
  openCarModal(car?: Car) {
    if (car) {
      this.carForm = { ...car };
    } else {
      this.carForm = {
        id: null,
        name: '',
        description: '',
        price_per_day: 0,
        category: 'Gazdaságos',
        transmission: 'automatic',
        fuel_type: 'Benzin',
        seats: 5
      };
    }
    this.selectedImage = null;
    this.showCarModal = true;
  }

  closeCarModal() {
    this.showCarModal = false;
    this.carForm = {};
    this.selectedImage = null;
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedImage = file;
    }
  }

  async saveCar() {
    try {
      const formData = new FormData();
      formData.append('name', this.carForm.name);
      formData.append('description', this.carForm.description);
      formData.append('price_per_day', this.carForm.price_per_day.toString());
      formData.append('category', this.carForm.category);
      formData.append('transmission', this.carForm.transmission);
      formData.append('fuel_type', this.carForm.fuel_type);
      formData.append('seats', this.carForm.seats.toString());
      
      if (this.selectedImage) {
        formData.append('image', this.selectedImage);
      }

      if (this.carForm.id) {
        await this.apiService.put(`/api/admin/cars/${this.carForm.id}`, formData).toPromise();
        this.displayMessage('Autó sikeresen frissítve', 'success');
      } else {
        await this.apiService.post('/api/admin/cars', formData).toPromise();
        this.displayMessage('Autó sikeresen létrehozva', 'success');
      }
      
      this.closeCarModal();
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Művelet sikertelen', 'error');
    }
  }

  async deleteCar(id: number) {
    if (!confirm('Biztosan törölni szeretnéd ezt az autót?')) return;
    
    try {
      await this.apiService.delete(`/api/admin/cars/${id}`).toPromise();
      this.displayMessage('Autó törölve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Törlés sikertelen', 'error');
    }
  }

  // User Management
  openUserModal(user?: User) {
    if (user) {
      this.userForm = { ...user };
    } else {
      this.userForm = {
        id: null,
        name: '',
        email: '',
        phone: '',
        is_verified: 1
      };
    }
    this.showUserModal = true;
  }

  closeUserModal() {
    this.showUserModal = false;
    this.userForm = {};
  }

  async saveUser() {
    try {
      if (this.userForm.id) {
        await this.apiService.put(`/api/admin/users/${this.userForm.id}`, this.userForm).toPromise();
        this.displayMessage('Felhasználó frissítve', 'success');
      }
      
      this.closeUserModal();
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Művelet sikertelen', 'error');
    }
  }

  async deleteUser(id: number) {
    if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    
    try {
      await this.apiService.delete(`/api/admin/users/${id}`).toPromise();
      this.displayMessage('Felhasználó törölve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Törlés sikertelen', 'error');
    }
  }

  // Email
  openEmailModal(user: User) {
    this.emailForm = {
      toEmail: user.email,
      toName: user.name,
      subject: '',
      message: ''
    };
    this.showEmailModal = true;
  }

  closeEmailModal() {
    this.showEmailModal = false;
    this.emailForm = {
      toEmail: '',
      toName: '',
      subject: '',
      message: ''
    };
  }

  async sendEmail() {
    try {
      await this.apiService.post('/api/admin/send-email', this.emailForm).toPromise();
      this.displayMessage('Email elküldve', 'success');
      this.closeEmailModal();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Email küldése sikertelen', 'error');
    }
  }

  // Rental Management
  async updateRentalStatus(id: number, status: string) {
    try {
      await this.apiService.put(`/api/admin/rentals/${id}/status`, { status }).toPromise();
      this.displayMessage('Bérlés státusza frissítve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Frissítés sikertelen', 'error');
    }
  }

  async deleteRental(id: number) {
    if (!confirm('Biztosan törölni szeretnéd ezt a bérlést?')) return;
    
    try {
      await this.apiService.delete(`/api/admin/rentals/${id}`).toPromise();
      this.displayMessage('Bérlés törölve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Törlés sikertelen', 'error');
    }
  }

  // Message Management
  async updateMessageStatus(id: number, status: string) {
    try {
      await this.apiService.put(`/api/admin/messages/${id}/status`, { status }).toPromise();
      this.displayMessage('Üzenet státusza frissítve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Frissítés sikertelen', 'error');
    }
  }

  async deleteMessage(id: number) {
    if (!confirm('Biztosan törölni szeretnéd ezt az üzenetet?')) return;
    
    try {
      await this.apiService.delete(`/api/admin/messages/${id}`).toPromise();
      this.displayMessage('Üzenet törölve', 'success');
      await this.loadDashboardData();
    } catch (error: any) {
      this.displayMessage(error.error?.message || 'Törlés sikertelen', 'error');
    }
  }

  // Utilities
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU').format(price);
  }

  displayMessage(text: string, type: 'success' | 'error') {
    this.messageText = text;
    this.messageType = type;
    this.showMessage = true;
    
    setTimeout(() => {
      this.showMessage = false;
    }, 3000);
  }
}
