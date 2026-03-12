import { Component, OnInit, Output, EventEmitter, Input, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Car } from '../../services/api.service';

@Component({
  selector: 'app-rental-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rental-modal.component.html',
  styleUrls: ['./rental-modal.component.css']
})
export class RentalModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() preselectedCarId?: number;
  @Input() preselectedCarName?: string;
  @Input() preselectedCarPrice?: number;
  @Output() close = new EventEmitter<void>();
  @Output() rentalCreated = new EventEmitter<void>();

  selectedCar: Car | null = null;
  rentalDate: string = '';
  returnDate: string = '';
  customerName: string = '';
  customerEmail: string = '';
  
  totalDays: number = 0;
  totalPrice: number = 0;
  showSummary: boolean = false;
  
  isLoading = false;
  error = '';

  constructor(
    private apiService: ApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.setMinDates();
      
      const currentUser = this.apiService.getCurrentUser();
      if (currentUser) {
        this.customerName = currentUser.name;
        this.customerEmail = currentUser.email;
      }
      
      if (this.preselectedCarId) {
        this.loadSelectedCar();
      }
    }
  }

  async loadSelectedCar() {
    try {
      const response = await this.apiService.getCars().toPromise();
      if (response && response.success) {
        const car = response.cars.find(c => c.id === this.preselectedCarId);
        if (car) {
          this.selectedCar = car;
          this.calculatePrice();
        }
      }
    } catch (error) {
      console.error('Error loading car:', error);
    }
  }

  setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    this.rentalDate = today;
    this.returnDate = today;
  }

  onDateChange() {
    this.calculatePrice();
  }

  calculatePrice() {
    if (!this.selectedCar || !this.rentalDate || !this.returnDate) {
      this.showSummary = false;
      return;
    }

    const startDate = new Date(this.rentalDate);
    const endDate = new Date(this.returnDate);
    
    if (endDate <= startDate) {
      this.showSummary = false;
      return;
    }

    const diffTime = endDate.getTime() - startDate.getTime();
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.totalPrice = this.totalDays * this.selectedCar.price_per_day;
    this.showSummary = true;
  }

  async onSubmit() {
    if (!this.selectedCar || !this.rentalDate || !this.returnDate || !this.customerName || !this.customerEmail) {
      this.error = 'Kérjük, töltsd ki az összes mezőt!';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const rentalData = {
        carId: this.selectedCar.id,
        carName: this.selectedCar.name,
        carPrice: this.selectedCar.price_per_day,
        rentalDate: this.rentalDate,
        returnDate: this.returnDate,
        customerName: this.customerName,
        customerEmail: this.customerEmail
      };

      const response = await this.apiService.createRental(rentalData).toPromise();

      if (response && response.success) {
        alert('Bérlési kérelem sikeresen elküldve! Hamarosan felvesszük Önnel a kapcsolatot.');
        this.rentalCreated.emit();
        this.closeModal();
      } else {
        this.error = response.message || 'Hiba történt a bérlés létrehozása során.';
      }
    } catch (error: any) {
      this.error = error.error?.message || 'Hiba történt a bérlés létrehozása során.';
    } finally {
      this.isLoading = false;
    }
  }

  closeModal() {
    this.close.emit();
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU').format(price) + ' Ft';
  }
}
