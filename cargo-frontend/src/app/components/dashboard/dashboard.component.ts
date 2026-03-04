import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ApiService, User, Car, Rental } from '../../services/api.service';
import { RentalModalComponent } from '../rental-modal/rental-modal.component';

interface DashboardStats {
  totalCars: number;
  availableCars: number;
  activeRentals: number;
  totalUsers: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, RentalModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  stats: DashboardStats = {
    totalCars: 0,
    availableCars: 0,
    activeRentals: 0,
    totalUsers: 0
  };
  recentRentals: Rental[] = [];
  popularCars: Car[] = [];
  isLoading = true;
  error = '';
  
  // Rental modal
  showRentalModal = false;
  preselectedCarId?: number;
  preselectedCarName?: string;
  preselectedCarPrice?: number;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    console.log('Dashboard component initializing...');
    
    this.apiService.currentUser$.subscribe(user => {
      console.log('Dashboard: Current user changed to', user);
      this.currentUser = user;
      
      if (!user && isPlatformBrowser(this.platformId)) {
        console.log('Dashboard: No user found, redirecting to login');
        this.router.navigate(['/login']);
      } else if (user && isPlatformBrowser(this.platformId)) {
        console.log('Dashboard: User found, loading dashboard data');
        this.loadDashboardData();
        
        // Check for car preselection from URL
        this.route.queryParams.subscribe(params => {
          if (params['carId']) {
            this.preselectedCarId = parseInt(params['carId']);
            this.preselectedCarName = params['carName'];
            this.preselectedCarPrice = parseFloat(params['carPrice']);
            setTimeout(() => {
              this.openRentalModal();
            }, 500);
          }
        });
      }
    });
    
    // Csak browser-ben töltjük be az adatokat
    if (isPlatformBrowser(this.platformId)) {
      // Ellenőrizzük, hogy van-e már user
      const currentUser = this.apiService.getCurrentUser();
      console.log('Dashboard: Initial current user check', currentUser);
      
      if (currentUser) {
        setTimeout(() => {
          this.loadDashboardData();
        }, 100);
      }
    }
  }

  openRentalModal() {
    this.showRentalModal = true;
  }

  closeRentalModal() {
    this.showRentalModal = false;
    this.preselectedCarId = undefined;
    this.preselectedCarName = undefined;
    this.preselectedCarPrice = undefined;
  }

  onRentalCreated() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    // Csak browser-ben futtatjuk
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      this.isLoading = true;
      
      // Load cars
      const carsResponse = await this.apiService.getCars().toPromise();
      if (carsResponse?.success) {
        const cars = carsResponse.cars;
        this.stats.totalCars = cars.length;
        this.stats.availableCars = cars.filter(car => car.status === 'available').length;
        this.popularCars = cars.slice(0, 3); // Top 3 cars
      }

      // Load rentals
      try {
        const rentalsResponse = await this.apiService.getRentals().toPromise();
        if (rentalsResponse?.success) {
          this.recentRentals = rentalsResponse.rentals.slice(0, 5); // Last 5 rentals
          this.stats.activeRentals = rentalsResponse.rentals.filter(rental => 
            rental.status === 'active' || rental.status === 'confirmed'
          ).length;
        }
      } catch (rentalError) {
        console.log('Could not load rentals:', rentalError);
      }

      // Load admin stats if user is admin
      if (this.currentUser?.role === 'admin') {
        try {
          const adminStats = await this.apiService.get('/api/admin/stats').toPromise();
          if (adminStats?.success) {
            this.stats = { ...this.stats, ...adminStats.stats };
          }
        } catch (adminError) {
          console.log('Could not load admin stats:', adminError);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.error = 'Hiba történt az adatok betöltése során.';
    } finally {
      this.isLoading = false;
    }
  }

  logout() {
    this.apiService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Force logout even if API call fails
        this.router.navigate(['/login']);
      }
    });
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available': return 'badge-success';
      case 'rented': return 'badge-warning';
      case 'maintenance': return 'badge-danger';
      case 'active': return 'badge-primary';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'available': return 'Elérhető';
      case 'rented': return 'Kiadva';
      case 'maintenance': return 'Karbantartás';
      case 'active': return 'Aktív';
      case 'completed': return 'Befejezett';
      case 'cancelled': return 'Törölve';
      default: return status;
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('hu-HU');
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU').format(price) + ' Ft';
  }
}
