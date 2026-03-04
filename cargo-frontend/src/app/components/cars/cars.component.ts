import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Car } from '../../services/api.service';
import { NavbarComponent } from '../shared/navbar/navbar.component';

@Component({
  selector: 'app-cars',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './cars.component.html',
  styleUrls: ['./cars.component.css']
})
export class CarsComponent implements OnInit {
  cars: Car[] = [];
  filteredCars: Car[] = [];
  isLoading = true;
  hasError = false;
  
  filters = {
    category: '',
    price: '',
    transmission: '',
    fuel: '',
    seats: ''
  };

  showMessage = false;
  messageText = '';
  messageType = '';

  constructor(
    private apiService: ApiService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Only load cars in browser
    if (isPlatformBrowser(this.platformId)) {
      this.loadCars();
    }
  }

  async loadCars() {
    try {
      this.isLoading = true;
      this.hasError = false;
      
      const response = await this.apiService.getCars().toPromise();
      
      if (response && response.success) {
        this.cars = response.cars;
        this.filteredCars = [...this.cars];
      } else {
        this.hasError = true;
      }
    } catch (error) {
      console.error('Error loading cars:', error);
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  applyFilters() {
    this.filteredCars = this.cars.filter(car => {
      // Category filter
      if (this.filters.category && car.category !== this.filters.category) {
        return false;
      }

      // Price filter
      if (this.filters.price) {
        const [min, max] = this.filters.price.split('-').map(Number);
        if (car.price_per_day < min || (max && car.price_per_day > max)) {
          return false;
        }
      }

      // Transmission filter
      if (this.filters.transmission && car.transmission !== this.filters.transmission) {
        return false;
      }

      // Fuel filter
      if (this.filters.fuel && car.fuel_type !== this.filters.fuel) {
        return false;
      }

      // Seats filter
      if (this.filters.seats && car.seats.toString() !== this.filters.seats) {
        return false;
      }

      return true;
    });
  }

  clearAllFilters() {
    this.filters = {
      category: '',
      price: '',
      transmission: '',
      fuel: '',
      seats: ''
    };
    this.filteredCars = [...this.cars];
  }

  getFilterCountText(): string {
    const count = this.filteredCars.length;
    return `${count} autó található`;
  }

  getCategoryClass(category: string): string {
    return category.toLowerCase().replace(/\s+/g, '');
  }

  getTransmissionText(transmission: string): string {
    return transmission === 'automatic' ? 'Automata' : 'Manuális';
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU').format(price);
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
    event.target.nextElementSibling.style.display = 'flex';
  }

  showRentalModal(car: Car) {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if user is logged in by checking the API service
    const currentUser = this.apiService.getCurrentUser();
    const token = localStorage.getItem('token');
    
    console.log('Rental button clicked');
    console.log('Current user:', currentUser);
    console.log('Token exists:', !!token);
    
    if (!currentUser || !token) {
      // Save car info for after login
      sessionStorage.setItem('pendingRental', JSON.stringify({
        carId: car.id,
        carName: car.name,
        carPrice: car.price_per_day
      }));
      
      this.showInfoMessage('A bérléshez be kell jelentkezned!');
      
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
      return;
    }
    
    // User is logged in, redirect to dashboard with car info
    console.log('User is logged in, redirecting to dashboard with car info');
    this.router.navigate(['/dashboard'], {
      queryParams: {
        carId: car.id,
        carName: car.name,
        carPrice: car.price_per_day
      }
    });
  }

  private showInfoMessage(message: string) {
    this.messageText = message;
    this.messageType = 'info';
    this.showMessage = true;
    setTimeout(() => this.showMessage = false, 5000);
  }
}