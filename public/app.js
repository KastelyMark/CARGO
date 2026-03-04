
const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

let currentUser = null;
let isAdmin = false;
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Check if user is logged in
    await checkLoginStatus();
    
    // Initialize page-specific functionality
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initializeIndexPage();
            break;
        case 'login':
            initializeLoginPage();
            break;
        case 'register':
            initializeRegisterPage();
            break;
        case 'verify':
            initializeVerifyPage();
            break;
        case 'dashboard':
            initializeDashboardPage();
            break;
        case 'admin':
            initializeAdminPage();
            break;
        case 'cars':
            initializeCarsPage();
            break;
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    // Remove .html extension if present
    const cleanPath = path.replace(/\.html$/, '');
    
    if (cleanPath.includes('/login')) return 'login';
    if (cleanPath.includes('/register')) return 'register';
    if (cleanPath.includes('/verify')) return 'verify';
    if (cleanPath.includes('/dashboard')) return 'dashboard';
    if (cleanPath.includes('/admin')) return 'admin';
    if (cleanPath.includes('/cars')) return 'cars';
    return 'index';
}

// Check login status
async function checkLoginStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.logged_in) {
            currentUser = {
                name: data.user_name,
                email: data.user_email
            };
            updateNavigation();
        }
    } catch (error) {
        console.error('Error checking login status:', error);
    }
}

// Update navigation based on login status
function updateNavigation() {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const userInfo = document.getElementById('userInfo');
    
    if (currentUser) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (userInfo) {
            userInfo.textContent = `Üdvözöljük, ${currentUser.name}!`;
            userInfo.style.display = 'inline-block';
        }
    }
}

// Hide all top-level site children except the selector (e.g., '#adminPanel')
const _siteHiddenState = new Map();
function hideSiteContentExcept(selector) {
    try {
        const root = document.body;
        const keep = document.querySelector(selector);
        Array.from(root.children).forEach(child => {
            if (child === keep) return;
            // store previous inline display to restore later
            _siteHiddenState.set(child, child.style.display || '');
            child.style.display = 'none';
        });
    } catch (err) {
        console.error('hideSiteContentExcept error:', err);
    }
}

function restoreSiteContent() {
    try {
        _siteHiddenState.forEach((display, node) => {
            if (node && node.style) node.style.display = display;
        });
        _siteHiddenState.clear();
    } catch (err) {
        console.error('restoreSiteContent error:', err);
    }
}

// Initialize index page
function initializeIndexPage() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true
        });
    }

    // Initialize about/map if present
    if (document.getElementById('aboutMap')) {
        initializeAboutMap();
    }
    
    // Registration form is now handled on the dedicated register page
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContact);
    }
}

// Initialize Leaflet map in the About section
function initializeAboutMap() {
    try {
        // Centered on Budapest by default
        const lat = 47.4979;
        const lng = 19.0402;

        const map = L.map('aboutMap', { scrollWheelZoom: false }).setView([lat, lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        L.marker([lat, lng]).addTo(map).bindPopup('Cégünk közelében').openPopup();
    } catch (err) {
        console.error('Hiba a térkép inicializálásakor:', err);
    }
}

// Initialize cars page
function initializeCarsPage() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
    
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true
        });
    }
    
    // Load cars
    loadCars();
}

// Handle registration
async function handleRegistration(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate passwords match
    if (data.password !== data.confirm_password) {
        showMessage('A jelszavak nem egyeznek!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.verification_required) {
                window.location.href = 'verify';
            } else {
                showMessage('Sikeres regisztráció!', 'success');
                e.target.reset();
            }
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Hiba történt a regisztráció során!', 'error');
    }
}

// Handle contact form
async function handleContact(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Üzenet sikeresen elküldve!', 'success');
            e.target.reset();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Contact error:', error);
        showMessage('Hiba történt az üzenet küldése során!', 'error');
    }
}

// Initialize login page
function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const forgotBtn = document.getElementById('forgotPasswordBtn');
    const forgotModal = document.getElementById('forgotPasswordModal');
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotBtn && forgotModal) {
        forgotBtn.addEventListener('click', () => { forgotModal.style.display = 'block'; });
        // wire close buttons inside modal
        const close = forgotModal.querySelector('.close'); if (close) close.onclick = () => forgotModal.style.display = 'none';
    }
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            const data = { email: document.getElementById('fpEmail').value };
            try {
                const resp = await fetch(`${API_BASE}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                const res = await resp.json();
                        if (res.success) {
                            // show success inside modal
                            const body = forgotModal.querySelector('.modal-body');
                            if (body) {
                                body.innerHTML = `
                                    <div class="fp-success">
                                        <h3>Sikeresen elküldve</h3>
                                        <p>${res.message || 'Az ideiglenes jelszót elküldtük az email címre.'}</p>
                                        <div style="margin-top:12px; text-align:center;">
                                            <button class="btn btn-primary" id="fpCloseBtn">Bezárás</button>
                                            <a class="btn btn-secondary" href="/login" style="margin-left:8px;">Bejelentkezés</a>
                                        </div>
                                    </div>
                                `;
                                const closeBtn2 = document.getElementById('fpCloseBtn');
                                if (closeBtn2) closeBtn2.onclick = () => { forgotModal.style.display = 'none'; };
                            }
                        } else {
                            showMessage(res.message || 'Hiba', 'error');
                        }
            } catch (err) {
                console.error('Forgot password error:', err);
                showMessage('Hiba történt', 'error');
            }
        };
    }

    // Change password modal
    const changeModal = document.getElementById('changePasswordModal');
    const changeForm = document.getElementById('changePasswordForm');
    if (changeModal) { const close = changeModal.querySelector('.close'); if (close) close.onclick = () => changeModal.style.display = 'none'; }
    if (changeForm) {
        changeForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                email: document.getElementById('cpEmail').value,
                temp_password: document.getElementById('cpTemp').value,
                new_password: document.getElementById('cpNew').value
            };
            try {
                const resp = await fetch(`${API_BASE}/auth/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const res = await resp.json();
                if (res.success) {
                    showMessage(res.message || 'Jelszó frissítve', 'success');
                    changeModal.style.display = 'none';
                } else {
                    showMessage(res.message || 'Hiba', 'error');
                }
            } catch (err) {
                console.error('Change password error:', err);
                showMessage('Hiba történt', 'error');
            }
        };
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Sikeres bejelentkezés!', 'success');
            // If the server indicates a forced password reset, show change-password modal
            if (result.force_password_reset) {
                const changeModal = document.getElementById('changePasswordModal');
                if (changeModal) {
                    // prefill email and open modal
                    const cpEmail = document.getElementById('cpEmail');
                    if (cpEmail) cpEmail.value = data.email || '';
                    changeModal.style.display = 'block';
                }
                showMessage('Ideiglenes jelszóval bejelentkezett. Kérjük adjon meg egy új jelszót.', 'info');
                return;
            }
            setTimeout(() => {
                window.location.href = 'dashboard';
            }, 1000);
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Hiba történt a bejelentkezés során!', 'error');
    }
}

// Initialize verify page
function initializeVerifyPage() {
    const verifyForm = document.getElementById('verifyForm');
    const resendBtn = document.getElementById('resendBtn');
    
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerification);
        
        // Auto-focus on verification code input
        const codeInput = document.getElementById('verification_code');
        if (codeInput) {
            // Check if verification code is in URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const codeFromUrl = urlParams.get('verification_code');
            
            if (codeFromUrl && codeFromUrl.length === 6) {
                codeInput.value = codeFromUrl;
                // Auto-submit if code is pre-filled
                setTimeout(() => {
                    verifyForm.dispatchEvent(new Event('submit'));
                }, 500);
            } else {
                codeInput.focus();
            }
            
            // Only allow numbers
            codeInput.addEventListener('input', function(e) {
                this.value = this.value.replace(/[^0-9]/g, '');
                
                // Auto-submit when 6 digits are entered
                if (this.value.length === 6) {
                    verifyForm.submit();
                }
            });
        }
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendCode);
        startCountdown();
    }
}

// Handle verification
async function handleVerification(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success modal
            showVerificationSuccessModal();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showMessage('Hiba történt a hitelesítés során!', 'error');
    }
}

// Handle resend code
async function handleResendCode() {
    try {
        const response = await fetch(`${API_BASE}/auth/resend-verification`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Új hitelesítő kód elküldve!', 'success');
            startCountdown();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Resend error:', error);
        showMessage('Hiba történt az újraküldés során!', 'error');
    }
}

// Start countdown for resend button
function startCountdown() {
    const resendBtn = document.getElementById('resendBtn');
    const countdownSpan = document.getElementById('countdown');
    
    if (!resendBtn || !countdownSpan) return;
    
    let countdown = 60;
    resendBtn.disabled = true;
    
    const timer = setInterval(() => {
        countdown--;
        countdownSpan.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(timer);
            resendBtn.disabled = false;
            resendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Új kód küldése';
        }
    }, 1000);
}

// Initialize dashboard page
function initializeDashboardPage() {
    // Check if user is logged in
    if (!currentUser) {
        window.location.href = 'login';
        return;
    }
    
    // Load user data
    loadDashboardData();
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Rental modal
    setupRentalModal();
    
    const urlParams = new URLSearchParams(window.location.search);
    const carName = urlParams.get('car');
    const carPrice = urlParams.get('price');
    
    if (carName && carPrice) {
        setTimeout(() => {
            showRentalModal(carName, carPrice);
        }, 1000);
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load user rentals
        const response = await fetch(`${API_BASE}/rentals`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayRentals(result.rentals);
            updateStats(result.rentals);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Display rentals
function displayRentals(rentals) {
    const container = document.getElementById('rentalsContainer');
    if (!container) return;
    
    if (rentals.length === 0) {
        container.innerHTML = '<p class="text-center">Még nincsenek bérléseid.</p>';
        return;
    }
    
    container.innerHTML = rentals.map(rental => {
        // Calculate days if not stored
        const rentalDate = new Date(rental.rental_date);
        const returnDate = new Date(rental.return_date);
        const diffTime = returnDate - rentalDate;
        const totalDays = rental.total_days || Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Format total price
        const totalPrice = rental.total_price ? 
            parseFloat(rental.total_price).toLocaleString('hu-HU') : 
            'N/A';
        
        return `
            <div class="rental-item">
                <h4>${rental.car_name}</h4>
                <div class="rental-details">
                    <p><strong>Napi díj:</strong> ${rental.car_price}</p>
                    <p><strong>Bérlési időszak:</strong> ${totalDays} nap</p>
                    <p><strong>Bérlés kezdete:</strong> ${new Date(rental.rental_date).toLocaleDateString('hu-HU')}</p>
                    <p><strong>Visszahozatal:</strong> ${new Date(rental.return_date).toLocaleDateString('hu-HU')}</p>
                    <p><strong>Teljes bérleti díj:</strong> <span style="color: var(--primary); font-weight: 700; font-size: 1.2em;">${totalPrice} Ft</span></p>
                    <p><strong>Státusz:</strong> <span class="rental-status status-${rental.status}">${getStatusText(rental.status)}</span></p>
                </div>
            </div>
        `;
    }).join('');
}

// Update stats
function updateStats(rentals) {
    const totalRentals = document.getElementById('totalRentals');
    const pendingRentals = document.getElementById('pendingRentals');
    const completedRentals = document.getElementById('completedRentals');
    
    if (totalRentals) totalRentals.textContent = rentals.length;
    if (pendingRentals) pendingRentals.textContent = rentals.filter(r => r.status === 'pending').length;
    if (completedRentals) completedRentals.textContent = rentals.filter(r => r.status === 'completed').length;
}

// Get status text
function getStatusText(status) {
    const statusMap = {
        'pending': 'Függőben',
        'confirmed': 'Megerősítve',
        'completed': 'Befejezve',
        'cancelled': 'Lemondva'
    };
    return statusMap[status] || status;
}

// Setup rental modal
function setupRentalModal() {
    const modal = document.getElementById('rentalModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Rental form
    const rentalForm = document.getElementById('rentalForm');
    if (rentalForm) {
        rentalForm.addEventListener('submit', handleRentalSubmission);
        
        // Add event listeners for date changes to calculate price
        const rentalDateInput = document.getElementById('rentalDate');
        const returnDateInput = document.getElementById('returnDate');
        
        if (rentalDateInput) {
            rentalDateInput.addEventListener('change', calculateRentalPrice);
        }
        if (returnDateInput) {
            returnDateInput.addEventListener('change', calculateRentalPrice);
        }
    }
}

// Show rental modal
async function showRentalModal(carName = '', carPrice = '') {
    if (!currentUser) {
        // Redirect to login with car info
        const carInfo = encodeURIComponent(JSON.stringify({ name: carName, price: carPrice }));
        sessionStorage.setItem('pendingRental', carInfo);
        showMessage('A bérléshez be kell jelentkezned!', 'info');
        setTimeout(() => {
            window.location.href = '/login';
        }, 1500);
        return;
    }
    
    const modal = document.getElementById('rentalModal');
    if (!modal) {
        // If no modal on current page, redirect to dashboard with car info
        window.location.href = `/dashboard?car=${encodeURIComponent(carName)}&price=${encodeURIComponent(carPrice)}`;
        return;
    }
    
    // Load cars from database
    await loadCarsForRental();
    
    const carSelect = document.getElementById('carSelect');
    const carPriceInput = document.getElementById('carPrice');
    const customerNameInput = document.getElementById('customerName');
    const customerEmailInput = document.getElementById('customerEmail');
    
    // Pre-fill car information if provided
    if (carName && carSelect) {
        // Find the option that matches the car name
        const option = Array.from(carSelect.options).find(opt => opt.textContent.includes(carName));
        if (option) {
            carSelect.value = option.value;
            updateCarPrice();
            calculateRentalPrice();
        }
    }
    
    if (customerNameInput) customerNameInput.value = currentUser.name;
    if (customerEmailInput) customerEmailInput.value = currentUser.email;
    
    const today = new Date().toISOString().split('T')[0];
    const rentalDateInput = document.getElementById('rentalDate');
    const returnDateInput = document.getElementById('returnDate');
    
    if (rentalDateInput) rentalDateInput.min = today;
    if (returnDateInput) returnDateInput.min = today;
    
    modal.style.display = 'block';
}

// Handle rental submission
async function handleRentalSubmission(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Validate dates
    const rentalDate = new Date(data.rentalDate);
    const returnDate = new Date(data.returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (rentalDate < today) {
        showMessage('A bérlés dátuma nem lehet a múltban!', 'error');
        return;
    }
    
    if (returnDate <= rentalDate) {
        showMessage('A visszahozatal dátuma a bérlés dátuma után kell legyen!', 'error');
        return;
    }
    
    try {
        // Get selected car info
        const carSelect = document.getElementById('carSelect');
        const selectedOption = carSelect.options[carSelect.selectedIndex];
        const carName = selectedOption ? selectedOption.textContent.split(' - ')[0] : data.carName;
        const carPrice = selectedOption ? selectedOption.dataset.price : data.carPrice;
        
        const rentalData = {
            carId: data.carId,
            carName: carName,
            carPrice: carPrice,
            rentalDate: data.rentalDate,
            returnDate: data.returnDate,
            customerName: data.customerName,
            customerEmail: data.customerEmail
        };
        
        const response = await fetch(`${API_BASE}/rentals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rentalData),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Bérlési kérelem sikeresen elküldve!', 'success');
            document.getElementById('rentalModal').style.display = 'none';
            e.target.reset();
            loadDashboardData(); // Refresh data
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Rental submission error:', error);
        showMessage('Hiba történt a bérlés elküldése során!', 'error');
    }
}

// Initialize admin page
function initializeAdminPage() {
    // Check admin login status
    checkAdminStatus();
    
    // Admin login form
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    
    // Admin logout button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }
    
    // Email modal
    setupEmailModal();

    // Car upload form
    const carUploadForm = document.getElementById('carUploadForm');
    if (carUploadForm) {
        carUploadForm.addEventListener('submit', handleCarUpload);
    }

    setupAdminNavigation();

    // mobile hamburger toggle
    const adminHamburger = document.getElementById('adminHamburger');
    const adminTopbar = document.querySelector('.admin-topbar');
    const adminNavbar = document.querySelector('.admin-navbar');
    const adminOverlay = document.getElementById('adminOverlay');
    if (adminHamburger) {
        adminHamburger.addEventListener('click', () => {
            // on mobile toggle both navbar panel and show overlay
            const mobile = window.innerWidth <= 900;
            if (mobile) {
                if (adminNavbar) {
                    adminNavbar.classList.toggle('open');
                    // On mobile, show all navbar items when menu is open
                    const navbarLinks = adminNavbar.querySelectorAll('.admin-nav-link');
                    if (adminNavbar.classList.contains('open')) {
                        navbarLinks.forEach(link => {
                            link.style.display = 'block';
                        });
                    }
                }
                if (adminOverlay) adminOverlay.style.display = (adminOverlay.style.display === 'block') ? 'none' : 'block';
            }
        });
    }
    // ensure nav links close sidebar on mobile after click
    const navLinks = document.querySelectorAll('.admin-nav-list .admin-nav-link, .admin-navbar .admin-nav-link');
    navLinks.forEach(l => l.addEventListener('click', () => {
        const mobile = window.innerWidth <= 900;
        if (adminNavbar && mobile) adminNavbar.classList.remove('open');
        if (adminOverlay && mobile) adminOverlay.style.display = 'none';
    }));
    // overlay click closes mobile panels
    if (adminOverlay) {
        adminOverlay.addEventListener('click', () => {
            if (adminNavbar) adminNavbar.classList.remove('open');
            adminOverlay.style.display = 'none';
        });
    }
    // show topbar when on small screens
    function updateAdminTopbar() {
        if (adminTopbar) adminTopbar.style.display = window.innerWidth <= 900 ? 'flex' : 'none';
    }
    updateAdminTopbar();
    window.addEventListener('resize', updateAdminTopbar);
}

function setupAdminNavigation() {
    const links = document.querySelectorAll('.admin-nav-list .admin-nav-link, .admin-navbar .admin-nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            // set active class
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            showAdminSection(section, { scroll: true });
        });
    });
}

function showAdminSection(sectionId, opts = { scroll: false }) {
    // Hide all admin sections first
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(s => {
        s.style.display = 'none';
    });
    
    // Show only the target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
    }

    // Update all navigation links (sidebar and navbar) - set active state
    const allNavLinks = document.querySelectorAll('.admin-nav-list .admin-nav-link, .admin-navbar-list .admin-nav-link');
    allNavLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    // Load data for section
    switch (sectionId) {
        case 'dashboardSection':
            loadAdminData();
            break;
        case 'messagesSection':
            loadAdminData(); // messages loaded as part of admin data
            break;
        case 'usersSection':
            // default to show only registered users when opening
            loadAdminUsers('registered');
            break;
        case 'rentalsSection':
            loadAdminData(); // rentals loaded as part of admin data
            break;
        case 'carsSection':
            loadAdminCars();
            break;
    }

    // If users section, ensure filter buttons are wired and active state maintained
    if (sectionId === 'usersSection') {
        const filters = document.querySelectorAll('.admin-user-filter');
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const status = btn.dataset.status;
                loadAdminUsers(status);
            });
        });
        // ensure one is active (registered default)
        const activeFilter = document.querySelector('.admin-user-filter.active') || document.querySelector('.admin-user-filter[data-status="registered"]');
        if (activeFilter) {
            filters.forEach(b => b.classList.remove('active'));
            activeFilter.classList.add('active');
        }
    }

    // Scroll only if requested (user clicked)
    if (opts && opts.scroll) {
        setTimeout(() => {
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
}

// Check admin status
async function checkAdminStatus() {
    try {
        const response = await fetch(`${API_BASE}/admin/status`, {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.logged_in) {
            isAdmin = true;
            showAdminPanel();
            loadAdminData();
            loadAdminCars();
            loadAdminUsers();
        } else {
            showAdminLogin();
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        showAdminLogin();
    }
}

// Show admin login
function showAdminLogin() {
    const loginModal = document.getElementById('adminLoginModal');
    const adminPanel = document.getElementById('adminPanel');
    
    if (loginModal) loginModal.style.display = 'block';
    if (adminPanel) adminPanel.style.display = 'none';
    // restore other site content when admin login is shown
    restoreSiteContent();
}

// Show admin panel
function showAdminPanel() {
    const loginModal = document.getElementById('adminLoginModal');
    const adminPanel = document.getElementById('adminPanel');
    
    // hide other site content so only admin panel is visible
    hideSiteContentExcept('#adminPanel');

    if (loginModal) loginModal.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';

    // Show dashboard by default - this will hide all other sections and show only dashboard
    showAdminSection('dashboardSection', { scroll: false });
    
    // Hide the "Admin Dashboard" heading if it exists
    const adminHeading = document.querySelector('#adminPanel .admin-content .container h1');
    if (adminHeading && adminHeading.textContent.trim() === 'Admin Dashboard') {
        adminHeading.style.display = 'none';
    }
    
    // ensure page stays at the top when admin opens
    try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch (e) {}
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            isAdmin = true;
            showAdminPanel();
            loadAdminData();
            loadAdminCars();
            loadAdminUsers();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showMessage('Hiba történt a bejelentkezés során!', 'error');
    }
}

// Handle admin logout
async function handleAdminLogout() {
    try {
        const response = await fetch(`${API_BASE}/admin/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            isAdmin = false;
            showAdminLogin();
        restoreSiteContent();
        }
    } catch (error) {
        console.error('Admin logout error:', error);
    }
}

// Load admin data
async function loadAdminData() {
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE}/admin/stats`, {
            credentials: 'include'
        });
        const statsResult = await statsResponse.json();
        
        if (statsResult.success) {
            updateAdminStats(statsResult.stats);
        }
        
        // Load messages
        const messagesResponse = await fetch(`${API_BASE}/admin/messages`, {
            credentials: 'include'
        });
        const messagesResult = await messagesResponse.json();
        
        if (messagesResult.success) {
            displayMessages(messagesResult.messages);
        }
        
        // Load users
        const usersResponse = await fetch(`${API_BASE}/admin/users`, {
            credentials: 'include'
        });
        const usersResult = await usersResponse.json();
        
        if (usersResult.success) {
            displayUsers(usersResult.users);
        }
        
        // Load rentals
        const rentalsResponse = await fetch(`${API_BASE}/admin/rentals`, {
            credentials: 'include'
        });
        const rentalsResult = await rentalsResponse.json();
        
        if (rentalsResult.success) {
            displayAdminRentals(rentalsResult.rentals);
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

    // Load all cars for admin (including unavailable)
    async function loadAdminCars() {
        try {
            const response = await fetch(`${API_BASE}/cars?admin=1`);
            const data = await response.json();
            if (data.success) {
                const tbody = document.getElementById('adminCarsTable');
                if (!tbody) return;
                if (data.cars.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nincsenek autók</td></tr>';
                    return;
                }

                tbody.innerHTML = data.cars.map(car => `
                    <tr>
                        <td>${car.id}</td>
                        <td>${car.image_url ? `<img src="${car.image_url}" alt="${car.name}" style="width:80px;height:auto">` : '—'}</td>
                        <td>${car.name}</td>
                        <td>${parseInt(car.price_per_day).toLocaleString()} Ft/nap</td>
                        <td>${car.category}</td>
                        <td>
                            <button class="btn btn-primary" onclick="openEditCarModal(${car.id})">Szerkesztés</button>
                            <button class="btn btn-secondary" onclick="deleteCar(${car.id})">Törlés</button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading admin cars:', error);
        }
    }

    // Open edit car modal
    async function openEditCarModal(id) {
        try {
            const resp = await fetch(`${API_BASE}/admin/cars/${id}`, { credentials: 'include' });
            const result = await resp.json();
            if (!result.success) return showMessage(result.message || 'Autó betöltése sikertelen', 'error');

            const car = result.car;
            const modal = document.getElementById('editCarModal');
            if (!modal) return;

            document.getElementById('editCarId').value = car.id;
            document.getElementById('editCarName').value = car.name || '';
            document.getElementById('editCarDescription').value = car.description || '';
            document.getElementById('editCarPrice').value = car.price_per_day || '';
            document.getElementById('editCarCategory').value = car.category || 'Gazdaságos';
            document.getElementById('editCarTransmission').value = car.transmission || 'automatic';
            document.getElementById('editCarFuel').value = car.fuel_type || 'Benzin';
            document.getElementById('editCarSeats').value = car.seats || 5;
            const imgPreview = document.getElementById('editCarImagePreview');
            if (imgPreview) imgPreview.src = car.image_url || '';

            modal.style.display = 'block';

            const close = modal.querySelector('.close');
            if (close) close.onclick = () => { modal.style.display = 'none'; };
        } catch (e) {
            console.error('Open edit car modal error:', e);
            showMessage('Autó betöltése sikertelen', 'error');
        }
    }

    // Handle edit car submit (multipart)
    async function handleEditCarSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('editCarId').value;
        const formEl = document.getElementById('editCarForm');
        const formData = new FormData(formEl);

        try {
            const response = await fetch(`${API_BASE}/admin/cars/${id}`, {
                method: 'PUT',
                body: formData,
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                showMessage('Autó frissítve', 'success');
                document.getElementById('editCarModal').style.display = 'none';
                await loadAdminCars();
            } else {
                showMessage(result.message || 'Hiba a mentés során', 'error');
            }
        } catch (error) {
            console.error('Update car error:', error);
            showMessage('Hiba a mentés során', 'error');
        }
    }

    // Handle car upload (multipart form)
    async function handleCarUpload(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch(`${API_BASE}/admin/cars`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                showMessage('Autó sikeresen feltöltve!', 'success');
                form.reset();
                loadAdminCars();
            } else {
                showMessage(result.message || 'Hiba az autó feltöltése során', 'error');
            }
        } catch (error) {
            console.error('Car upload error:', error);
            showMessage('Hiba az autó feltöltése során', 'error');
        }
    }

    // Delete car
    async function deleteCar(id) {
        if (!confirm('Biztosan törölni szeretnéd ezt az autót?')) return;
        try {
            const response = await fetch(`${API_BASE}/admin/cars/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                showMessage('Autó törölve!', 'success');
                loadAdminCars();
            } else {
                showMessage(result.message || 'Hiba a törlés során', 'error');
            }
        } catch (error) {
            console.error('Delete car error:', error);
            showMessage('Hiba a törlés során', 'error');
        }
    }

// Update admin stats
function updateAdminStats(stats) {
    // Update each stat element if it exists
    const totalUsersEl = document.getElementById('totalUsers');
    if (totalUsersEl && stats.registeredUsers !== undefined) {
        totalUsersEl.textContent = stats.registeredUsers || 0;
    }
    
    const totalMessagesEl = document.getElementById('totalMessages');
    if (totalMessagesEl && stats.messages !== undefined) {
        totalMessagesEl.textContent = stats.messages || 0;
    }
    
    const newMessagesEl = document.getElementById('newMessages');
    if (newMessagesEl && stats.newMessages !== undefined) {
        newMessagesEl.textContent = stats.newMessages || 0;
    }
    
    const totalRentalsEl = document.getElementById('totalRentals');
    if (totalRentalsEl && stats.rentals !== undefined) {
        totalRentalsEl.textContent = stats.rentals || 0;
    }
    
    const pendingRentalsEl = document.getElementById('pendingRentals');
    if (pendingRentalsEl && stats.pendingRentals !== undefined) {
        pendingRentalsEl.textContent = stats.pendingRentals || 0;
    }
    
    const totalCarsEl = document.getElementById('totalCars');
    if (totalCarsEl && stats.cars !== undefined) {
        totalCarsEl.textContent = stats.cars || 0;
    }
}

// Display messages
function displayMessages(messages) {
    const tbody = document.getElementById('messagesTable');
    if (!tbody) return;
    
    if (messages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nincsenek üzenetek</td></tr>';
        return;
    }
    
    tbody.innerHTML = messages.map(message => `
        <tr>
            <td>${message.name}</td>
            <td>${message.email}</td>
            <td>${message.message.substring(0, 50)}${message.message.length > 50 ? '...' : ''}</td>
            <td>${new Date(message.created_at).toLocaleDateString()}</td>
            <td><span class="rental-status status-${message.status}">${getStatusText(message.status)}</span></td>
            <td>
                <button class="btn btn-primary" onclick="updateMessageStatus(${message.id}, 'read')">Olvasott</button>
                <button class="btn btn-secondary" onclick="deleteMessage(${message.id})">Törlés</button>
            </td>
        </tr>
    `).join('');
}

// Display users
function displayUsers(users) {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nincsenek felhasználók</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td><span class="rental-status ${user.is_verified ? 'status-confirmed' : 'status-pending'}">${user.is_verified ? 'Igen' : 'Nem'}</span></td>
        </tr>
    `).join('');
}

// Display admin rentals
function displayAdminRentals(rentals) {
    const tbody = document.getElementById('rentalsTable');
    if (!tbody) return;
    
    if (rentals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Nincsenek bérlések</td></tr>';
        return;
    }
    
    tbody.innerHTML = rentals.map(rental => {
        // Determine which buttons to show based on status
        const status = rental.status || 'pending';
        const buttons = [];
        
        // Show confirm button only for pending status
        if (status === 'pending') {
            buttons.push(`<button class="btn btn-primary btn-sm" onclick="updateRentalStatus(${rental.id}, 'confirmed')">Megerősít</button>`);
        }
        
        // Show complete button for pending or confirmed status
        if (status === 'pending' || status === 'confirmed') {
            buttons.push(`<button class="btn btn-success btn-sm" onclick="updateRentalStatus(${rental.id}, 'completed')">Befejez</button>`);
        }
        
        // Always show delete button
        buttons.push(`<button class="btn btn-danger btn-sm" onclick="deleteRental(${rental.id})">Törlés</button>`);
        
        return `
        <tr>
            <td>${rental.car_name || 'N/A'}</td>
            <td>${rental.car_price ? rental.car_price + ' Ft' : 'N/A'}</td>
            <td>${rental.rental_date ? new Date(rental.rental_date).toLocaleDateString('hu-HU') : 'N/A'}</td>
            <td>${rental.return_date ? new Date(rental.return_date).toLocaleDateString('hu-HU') : 'N/A'}</td>
            <td>${rental.customer_name || 'N/A'}</td>
            <td><a href="#" class="email-link" onclick="openEmailModal('${rental.customer_email || ''}', '${rental.customer_name || ''}')">${rental.customer_email || 'N/A'}</a></td>
            <td><span class="rental-status status-${status}">${getStatusText(status)}</span></td>
            <td>
                <div class="admin-table-actions">
                    ${buttons.join('')}
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

// Setup email modal
function setupEmailModal() {
    const modal = document.getElementById('emailModal');
    const closeBtn = document.querySelector('#emailModal .close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Email form
    const emailForm = document.getElementById('emailForm');
    if (emailForm) {
        emailForm.addEventListener('submit', handleEmailSend);
    }
}

// Load users (admin) with optional status filter: 'registered'|'unverified'|'all'
async function loadAdminUsers(status = 'registered') {
    try {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    qs.set('all', '1');
    const response = await fetch(`${API_BASE}/admin/users?` + qs.toString(), { credentials: 'include' });
        const result = await response.json();
        if (result.success) {
            const tbody = document.getElementById('usersTable');
            if (!tbody) return;
            if (result.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nincsenek felhasználók</td></tr>';
                return;
            }

            tbody.innerHTML = result.users.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td><span class="rental-status ${user.is_verified ? 'status-confirmed' : 'status-pending'}">${user.is_verified ? 'Igen' : 'Nem'}</span></td>
                    <td>
                        <button class="btn btn-primary" onclick="openEditUserModal(${user.id})">Szerkesztés</button>
                        <button class="btn btn-secondary" onclick="deleteUserByAdmin(${user.id})">Törlés</button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

// Open edit user modal
async function openEditUserModal(id) {
    try {
    const response = await fetch(`${API_BASE}/admin/users/${id}`, { credentials: 'include' });
        const result = await response.json();
        if (!result.success) return;

        const user = result.user;
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editPhone').value = user.phone || '';
        document.getElementById('editVerified').value = user.is_verified ? '1' : '0';
        // Clear password field when opening modal
        document.getElementById('editPassword').value = '';

        const modal = document.getElementById('editUserModal');
        modal.style.display = 'block';

        // Wire close
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';

        // Wire form submit
        const form = document.getElementById('editUserForm');
        form.onsubmit = handleEditUserSubmit;
    } catch (error) {
        console.error('Error opening edit user modal:', error);
    }
}

// Handle edit user submit
async function handleEditUserSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const password = document.getElementById('editPassword').value;
    
    const payload = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        is_verified: document.getElementById('editVerified').value === '1' ? 1 : 0
    };
    
    // Only include password if it's not empty
    if (password && password.trim() !== '') {
        payload.password = password;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            showMessage('Felhasználó frissítve', 'success');
            document.getElementById('editUserModal').style.display = 'none';
            // Clear password field
            document.getElementById('editPassword').value = '';
            loadAdminUsers();
        } else {
            showMessage(result.message || 'Hiba a mentés során', 'error');
        }
    } catch (error) {
        console.error('Error updating user:', error);
        showMessage('Hiba a mentés során', 'error');
    }
}

// Delete user
async function deleteUserByAdmin(id) {
    if (!confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) return;
    try {
        const response = await fetch(`${API_BASE}/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
        const result = await response.json();
        if (result.success) {
            showMessage('Felhasználó törölve', 'success');
            loadAdminUsers();
        } else {
            showMessage(result.message || 'Hiba a törlés során', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage('Hiba a törlés során', 'error');
    }
}

// Open email modal
function openEmailModal(email, name) {
    const modal = document.getElementById('emailModal');
    const toEmailInput = document.getElementById('toEmail');
    const toNameInput = document.getElementById('toName');
    
    if (toEmailInput) toEmailInput.value = email;
    if (toNameInput) toNameInput.value = name;
    
    modal.style.display = 'block';
}

// Handle email send
async function handleEmailSend(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${API_BASE}/admin/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Email sikeresen elküldve!', 'success');
            document.getElementById('emailModal').style.display = 'none';
            e.target.reset();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Email send error:', error);
        showMessage('Hiba történt az email küldése során!', 'error');
    }
}

// Admin functions
async function updateMessageStatus(id, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/messages/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Üzenet státusza frissítve!', 'success');
            loadAdminData();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Update message status error:', error);
        showMessage('Hiba történt a frissítés során!', 'error');
    }
}

async function deleteMessage(id) {
    if (!confirm('Biztosan törölni szeretnéd ezt az üzenetet?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/messages/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Üzenet törölve!', 'success');
            loadAdminData();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Delete message error:', error);
        showMessage('Hiba történt a törlés során!', 'error');
    }
}

async function updateRentalStatus(id, status) {
    try {
        const response = await fetch(`${API_BASE}/admin/rentals/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Bérlés státusza frissítve!', 'success');
            loadAdminData();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Update rental status error:', error);
        showMessage('Hiba történt a frissítés során!', 'error');
    }
}

async function deleteRental(id) {
    if (!confirm('Biztosan törölni szeretnéd ezt a bérlést?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/rentals/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showMessage('Bérlés törölve!', 'success');
            loadAdminData();
        } else {
            showMessage(result.message, 'error');
        }
    } catch (error) {
        console.error('Delete rental error:', error);
        showMessage('Hiba történt a törlés során!', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        const response = await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentUser = null;
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Insert message
    const container = document.querySelector('.auth-form') || document.querySelector('.register-form') || document.querySelector('.contact-form') || document.querySelector('.rental-form') || document.querySelector('.email-form') || document.body;
    
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
}

// Global variable to store all cars
let allCars = [];

// Load cars from API
async function loadCars() {
    try {
        const response = await fetch(`${API_BASE}/cars`);
        const data = await response.json();
        
        if (data.success) {
            allCars = data.cars;
            displayCars(allCars);
            initializeFilters();itializeFilters();
        } else {
            throw new Error(data.message || 'Failed to load cars');
        }
    } catch (error) {
        console.error('Error loading cars:', error);
        document.getElementById('carsGrid').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Hiba az autók betöltése során. Kérjük, próbálja újra később.</p>
            </div>
        `;
    }
}

// Display cars in the grid
function displayCars(cars) {
    const carsGrid = document.getElementById('carsGrid');
    
    if (!cars || cars.length === 0) {
        carsGrid.innerHTML = `
            <div class="no-cars-message">
                <i class="fas fa-car"></i>
                <p>Jelenleg nincsenek elérhető autók.</p>
            </div>
        `;
        return;
    }
    
    carsGrid.innerHTML = cars.map((car, index) => `
        <div class="car-card" data-aos="fade-up" data-aos-delay="${index * 100}">
            <div class="car-image">
                ${car.image_url ? 
                    `<img src="${car.image_url}" alt="${car.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="fallback-icon" style="display:none;"><i class="fas fa-car"></i></div>` :
                    `<div class="fallback-icon"><i class="fas fa-car"></i></div>`
                }
            </div>
            <div class="car-info">
                <div class="car-category ${car.category}">${car.category}</div>
                <h3>${car.name}</h3>
                <p>${car.description}</p>
                <div class="car-features">
                    <span><i class="fas fa-users"></i> ${car.seats} fő</span>
                    <span><i class="fas fa-cog"></i> ${car.transmission === 'automatic' ? 'Automata' : 'Manuális'}</span>
                    <span><i class="fas fa-gas-pump"></i> ${car.fuel_type}</span>
                </div>
                <div class="car-price">${parseInt(car.price_per_day).toLocaleString()} Ft/nap</div>
                <button class="btn btn-primary" onclick="showRentalModal('${car.name}', '${parseInt(car.price_per_day).toLocaleString()} Ft/nap')">Bérlés</button>
            </div>
        </div>
    `).join('');
    
    // Re-initialize AOS for new elements
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Initialize filter functionality
function initializeFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    // Add event listeners to all filter selects
    filterSelects.forEach(select => {
        select.addEventListener('change', applyFilters);
    });
    
    // Add event listener to clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
    
    // Initial filter count update
    updateFilterCount(allCars.length);
}

// Apply filters to cars
function applyFilters() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const priceFilter = document.getElementById('priceFilter').value;
    const transmissionFilter = document.getElementById('transmissionFilter').value;
    const fuelFilter = document.getElementById('fuelFilter').value;
    const seatsFilter = document.getElementById('seatsFilter').value;
    
    let filteredCars = allCars.filter(car => {
        // Category filter
        if (categoryFilter && car.category !== categoryFilter) {
            return false;
        }
        
        // Price filter
        if (priceFilter) {
            const [minPrice, maxPrice] = priceFilter.split('-').map(Number);
            const carPrice = parseInt(car.price_per_day);
            if (carPrice < minPrice || carPrice > maxPrice) {
                return false;
            }
        }
        
        // Transmission filter
        if (transmissionFilter && car.transmission !== transmissionFilter) {
            return false;
        }
        
        // Fuel type filter
        if (fuelFilter && car.fuel_type !== fuelFilter) {
            return false;
        }
        
        // Seats filter
        if (seatsFilter) {
            const requiredSeats = parseInt(seatsFilter);
            const carSeats = parseInt(car.seats);
            
            if (seatsFilter === '7') {
                // For 7+, check if seats is 7 or more
                if (carSeats < 7) {
                    return false;
                }
            } else {
                // For exact matches (2, 4, 5)
                if (carSeats !== requiredSeats) {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    displayCars(filteredCars);
    updateFilterCount(filteredCars.length);
}

// Clear all filters
function clearAllFilters() {
    const filterSelects = document.querySelectorAll('.filter-select');
    
    filterSelects.forEach(select => {
        select.value = '';
    });
    
    displayCars(allCars);
    updateFilterCount(allCars.length);
}

// Update filter count display
function updateFilterCount(count) {
    const filterCountElement = document.getElementById('filterCount');
    if (filterCountElement) {
        if (count === 0) {
            filterCountElement.textContent = 'Nincs találat';
        } else if (count === 1) {
            filterCountElement.textContent = '1 autó található';
        } else {
            filterCountElement.textContent = `${count} autó található`;
        }
    }
}

// Initialize register page
function initializeRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegistration);

        // Initialize form functionality
        initializeFormValidation();
        initializePasswordStrength();
        initializePasswordToggle();
    }
}

// Initialize form validation
function initializeFormValidation() {
    const inputs = document.querySelectorAll('.register-form input[required]');
    
    inputs.forEach(input => {
        // Real-time validation
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
        
        // Add floating label effect
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
    });
    
    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', formatPhoneNumber);
    }
    
    // Password confirmation
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    
    if (passwordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            validatePasswordMatch();
        });
    }
}

// Validate individual field
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    const fieldName = field.name;
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error
    clearFieldError(e);
    
    switch (fieldName) {
        case 'name':
            if (value.length < 2) {
                isValid = false;
                errorMessage = 'A név legalább 2 karakter hosszú legyen';
            }
            break;
            
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Kérjük, adjon meg egy érvényes email címet';
            }
            break;
            
        case 'phone':
            const phoneRegex = /^(\+36|06)[\d\s-]{8,}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = 'Kérjük, adjon meg egy érvényes telefonszámot';
            }
            break;
            
        case 'password':
            if (value.length < 6) {
                isValid = false;
                errorMessage = 'A jelszó legalább 6 karakter hosszú legyen';
            }
            break;
            
        case 'confirm_password':
            const password = document.getElementById('password').value;
            if (value !== password) {
                isValid = false;
                errorMessage = 'A jelszavak nem egyeznek';
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    } else {
        showFieldSuccess(field);
    }
    
    return isValid;
}

// Clear field error
function clearFieldError(e) {
    const field = e.target;
    const errorElement = field.parentElement.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
    field.classList.remove('error');
    field.classList.remove('success');
}

// Show field error
function showFieldError(field, message) {
    field.classList.add('error');
    field.classList.remove('success');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    field.parentElement.appendChild(errorElement);
}

// Show field success
function showFieldSuccess(field) {
    field.classList.add('success');
    field.classList.remove('error');
}

// Initialize password strength checker
function initializePasswordStrength() {
    const passwordInput = document.getElementById('password');
    const strengthFill = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthFill && strengthText) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = calculatePasswordStrength(password);
            
            updatePasswordStrength(strength, strengthFill, strengthText);
        });
    }
}

// Calculate password strength
function calculatePasswordStrength(password) {
    let score = 0;
    let feedback = '';
    
    // Length check
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score <= 2) {
        feedback = 'Gyenge';
    } else if (score <= 4) {
        feedback = 'Közepes';
    } else if (score <= 5) {
        feedback = 'Jó';
    } else {
        feedback = 'Erős';
    }
    
    return { score, feedback, percentage: (score / 6) * 100 };
}

// Update password strength display
function updatePasswordStrength(strength, strengthFill, strengthText) {
    const percentage = strength.percentage;
    
    // Update fill
    strengthFill.style.width = `${percentage}%`;
    strengthFill.className = 'strength-fill';
    
    // Update class based on strength
    if (percentage <= 25) {
        strengthFill.classList.add('weak');
    } else if (percentage <= 50) {
        strengthFill.classList.add('fair');
    } else if (percentage <= 75) {
        strengthFill.classList.add('good');
    } else {
        strengthFill.classList.add('strong');
    }
    
    // Update text
    strengthText.textContent = `Jelszó erőssége: ${strength.feedback}`;
}

// Format phone number
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.startsWith('06')) {
        value = '+36' + value.substring(2);
    } else if (value.startsWith('36')) {
        value = '+' + value;
    } else if (!value.startsWith('+')) {
        value = '+36' + value;
    }
    
    // Format: +36 XX XXX XXXX
    if (value.length > 3) {
        value = value.substring(0, 3) + ' ' + value.substring(3);
    }
    if (value.length > 6) {
        value = value.substring(0, 6) + ' ' + value.substring(6);
    }
    if (value.length > 10) {
        value = value.substring(0, 10) + ' ' + value.substring(10);
    }
    
    e.target.value = value;
}

// Validate password match
function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    
    if (confirmPassword && password !== confirmPassword) {
        showFieldError(document.getElementById('confirm_password'), 'A jelszavak nem egyeznek');
        return false;
    } else if (confirmPassword && password === confirmPassword) {
        showFieldSuccess(document.getElementById('confirm_password'));
        return true;
    }
    
    return true;
}

// Initialize form animations
function initializeFormAnimations() {
    // Stagger form section animations
    const formSections = document.querySelectorAll('.form-section');
    formSections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.2}s`;
        section.classList.add('animate-in');
    });
    
    // Progress indicator animation
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach((step, index) => {
        setTimeout(() => {
            step.classList.add('animate-in');
        }, index * 200);
    });
}

// Enhanced registration handler
async function handleRegistration(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.register-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');
    
    // Show loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
    
    // Validate all fields
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        const fieldEvent = { target: input };
        if (!validateField(fieldEvent)) {
            isValid = false;
        }
    });
    
    // Check terms acceptance
    const termsCheckbox = document.getElementById('terms');
    if (!termsCheckbox.checked) {
        showMessage('Kérjük, fogadja el a felhasználási feltételeket', 'error');
        isValid = false;
    }
    
    if (!isValid) {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
        return;
    }
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success modal
            showSuccessModal();
        } else {
            showMessage(result.message || 'Regisztráció sikertelen', 'error');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('Hiba történt a regisztráció során', 'error');
    } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
        
        // Update progress indicator
        updateProgressIndicator(2);
        
        // Start countdown
        startCountdown(3);
    }
}

// Start countdown timer
function startCountdown(seconds) {
    const countdownElement = document.getElementById('countdown');
    let remaining = seconds;
    
    const timer = setInterval(() => {
        remaining--;
        if (countdownElement) {
            countdownElement.textContent = remaining;
        }
        
        if (remaining <= 0) {
            clearInterval(timer);
            window.location.href = '/verify';
        }
    }, 1000);
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
        window.location.href = '/verify';
    }
}

// Update progress indicator
function updateProgressIndicator(step) {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLine = document.querySelector('.progress-line');
    
    progressSteps.forEach((stepElement, index) => {
        if (index < step) {
            stepElement.classList.add('active');
        } else {
            stepElement.classList.remove('active');
        }
    });
    
    // Animate progress line
    if (step > 1) {
        progressLine.style.background = 'linear-gradient(135deg, #3498db, #2980b9)';
        progressLine.style.boxShadow = '0 2px 10px rgba(52, 152, 219, 0.3)';
    }
}

// Show verification success modal
function showVerificationSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
        
        // Update progress indicator
        updateProgressIndicator(3);
        
        // Start countdown
        startSuccessCountdown(3);
    }
}

// Start success countdown timer
function startSuccessCountdown(seconds) {
    const countdownElement = document.getElementById('successCountdown');
    let remaining = seconds;
    
    const timer = setInterval(() => {
        remaining--;
        if (countdownElement) {
            countdownElement.textContent = remaining;
        }
        
        if (remaining <= 0) {
            clearInterval(timer);
            window.location.href = '/';
        }
    }, 1000);
}

// Close verification success modal
function closeVerificationSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
        window.location.href = '/';
    }
}

// Make functions globally available
window.closeSuccessModal = closeSuccessModal;
window.closeVerificationSuccessModal = closeVerificationSuccessModal;

// Initialize password toggle functionality
function initializePasswordToggle() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Initialize password toggle on page load
document.addEventListener('DOMContentLoaded', function() {
    initializePasswordToggle();
});

// Handle registration form submission
async function handleRegistration(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('.register-btn');
    const formData = new FormData(form);
    
    // Show loading state
    submitBtn.classList.add('loading');
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                birthDate: formData.get('birthDate'),
                password: formData.get('password'),
                address: formData.get('address'),
                city: formData.get('city'),
                zipCode: formData.get('zipCode'),
                country: formData.get('country'),
                newsletter: formData.get('newsletter') === 'on'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessModal();
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Hiba a regisztráció során: ' + error.message);
    } finally {
        submitBtn.classList.remove('loading');
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
        // Direct redirect after 2 seconds without countdown
        setTimeout(() => {
            window.location.href = '/verify';
        }, 2000);
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('show');
    }
    window.location.href = '/verify';
}

// Initialize verify page
function initializeVerifyPage() {
    const verifyForm = document.getElementById('verifyForm');
    const resendBtn = document.getElementById('resendBtn');
    
    if (verifyForm) {
        verifyForm.addEventListener('submit', handleVerification);
        initializeCodeInputs();
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendCode);
    }
}

// Initialize code inputs
function initializeCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-input');
    
    codeInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Move to next input
            if (value && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
            
            // Update filled state
            if (value) {
                e.target.classList.add('filled');
            } else {
                e.target.classList.remove('filled');
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Move to previous input on backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            
            pastedData.split('').forEach((digit, i) => {
                if (codeInputs[i]) {
                    codeInputs[i].value = digit;
                    codeInputs[i].classList.add('filled');
                }
            });
            
            // Focus last filled input or last input
            const lastFilledIndex = Math.min(pastedData.length - 1, codeInputs.length - 1);
            codeInputs[lastFilledIndex].focus();
        });
    });
}

// Handle verification
async function handleVerification(e) {
    e.preventDefault();
    
    const codeInputs = document.querySelectorAll('.code-input');
    let code = '';
    
    // Get code from individual inputs
    if (codeInputs.length > 0) {
        code = Array.from(codeInputs).map(input => input.value).join('');
    } else {
        // Fallback to single input
        const singleInput = document.getElementById('verification_code');
        if (singleInput) {
            code = singleInput.value;
        }
    }
    
    const submitBtn = e.target.querySelector('.verify-btn');
    
    if (code.length !== 6) {
        showMessage('Kérjük, adj meg egy 6 számjegyű kódot', 'error');
        return;
    }
    
    // Show loading state
    submitBtn.classList.add('loading');
    
    try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ verification_code: code }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showVerificationSuccessModal();
        } else {
            showMessage(result.message || 'Hitelesítés sikertelen', 'error');
            
            // Clear inputs
            if (codeInputs.length > 0) {
                codeInputs.forEach(input => {
                    input.value = '';
                    input.classList.remove('filled');
                });
                codeInputs[0].focus();
            }
        }
    } catch (error) {
        console.error('Verification error:', error);
        showMessage('Hiba a hitelesítés során', 'error');
        
        // Clear inputs
        if (codeInputs.length > 0) {
            codeInputs.forEach(input => {
                input.value = '';
                input.classList.remove('filled');
            });
            codeInputs[0].focus();
        }
    } finally {
        submitBtn.classList.remove('loading');
    }
}

// Handle resend code
async function handleResendCode() {
    const resendBtn = document.getElementById('resendBtn');
    const countdownDiv = document.getElementById('countdown');
    const countdownTimer = document.getElementById('countdownTimer');
    
    // Disable button and start countdown
    resendBtn.disabled = true;
    countdownDiv.style.display = 'block';
    
    let remaining = 60;
    countdownTimer.textContent = remaining;
    
    const timer = setInterval(() => {
        remaining--;
        countdownTimer.textContent = remaining;
        
        if (remaining <= 0) {
            clearInterval(timer);
            resendBtn.disabled = false;
            countdownDiv.style.display = 'none';
        }
    }, 1000);
    
    try {
        const response = await fetch(`${API_BASE}/auth/resend-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Új verifikációs kód elküldve az email címedre');
        } else {
            throw new Error(data.message || 'Failed to resend code');
        }
    } catch (error) {
        console.error('Resend error:', error);
        alert('Hiba a kód újraküldése során: ' + error.message);
        
        // Reset button state
        clearInterval(timer);
        resendBtn.disabled = false;
        countdownDiv.style.display = 'none';
    }
}

// Show verification success modal
function showVerificationSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('show');
    }
}

// Redirect to login
function redirectToLogin() {
    window.location.href = '/login';
}

// Make functions globally available
window.showRentalModal = showRentalModal;
window.openEmailModal = openEmailModal;
window.updateMessageStatus = updateMessageStatus;
window.deleteMessage = deleteMessage;
window.updateRentalStatus = updateRentalStatus;
window.deleteRental = deleteRental;
window.closeModal = closeModal;
window.redirectToLogin = redirectToLogin;
window.openEditCarModal = openEditCarModal;
window.handleEditCarSubmit = handleEditCarSubmit;
window.deleteCar = deleteCar;
window.openEditUserModal = openEditUserModal;
window.deleteUserByAdmin = deleteUserByAdmin;

// Load cars for rental dropdown
async function loadCarsForRental() {
    try {
        const response = await fetch(`${API_BASE}/cars`);
        const data = await response.json();
        
        if (data.success) {
            const carSelect = document.getElementById('carSelect');
            if (carSelect) {
                // Clear existing options except the first one
                carSelect.innerHTML = '<option value="">Válassz autót...</option>';
                
                // Add cars from database
                data.cars.forEach(car => {
                    const option = document.createElement('option');
                    option.value = car.id;
                    option.textContent = `${car.name} - ${parseInt(car.price_per_day).toLocaleString()} Ft/nap`;
                    option.dataset.price = car.price_per_day;
                    carSelect.appendChild(option);
                });
                
                // Add event listener for car selection
                carSelect.addEventListener('change', updateCarPrice);
            }
        } else {
            throw new Error(data.message || 'Failed to load cars');
        }
    } catch (error) {
        console.error('Error loading cars for rental:', error);
        showMessage('Hiba az autók betöltése során', 'error');
    }
}

// Update car price when car is selected
function updateCarPrice() {
    const carSelect = document.getElementById('carSelect');
    const carPriceInput = document.getElementById('carPrice');
    
    if (carSelect && carPriceInput) {
        const selectedOption = carSelect.options[carSelect.selectedIndex];
        if (selectedOption && selectedOption.dataset.price) {
            carPriceInput.value = `${parseInt(selectedOption.dataset.price).toLocaleString()} Ft/nap`;
        } else {
            carPriceInput.value = '';
        }
    }
    
    // Calculate total price when car is selected
    calculateRentalPrice();
}

// Calculate rental price based on dates and car price
function calculateRentalPrice() {
    const carSelect = document.getElementById('carSelect');
    const rentalDateInput = document.getElementById('rentalDate');
    const returnDateInput = document.getElementById('returnDate');
    const rentalSummary = document.getElementById('rentalSummary');
    const totalDaysElement = document.getElementById('totalDays');
    const totalPriceElement = document.getElementById('totalPrice');
    
    if (!carSelect || !rentalDateInput || !returnDateInput || !rentalSummary) {
        return;
    }
    
    const selectedOption = carSelect.options[carSelect.selectedIndex];
    const rentalDate = rentalDateInput.value;
    const returnDate = returnDateInput.value;
    
    // Check if all required fields are filled
    if (!selectedOption || !selectedOption.dataset.price || !rentalDate || !returnDate) {
        rentalSummary.style.display = 'none';
        return;
    }
    
    // Calculate days
    const startDate = new Date(rentalDate);
    const endDate = new Date(returnDate);
    const diffTime = endDate - startDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) {
        rentalSummary.style.display = 'none';
        return;
    }
    
    // Calculate total price
    const pricePerDay = parseFloat(selectedOption.dataset.price);
    const totalPrice = diffDays * pricePerDay;
    
    // Update display
    totalDaysElement.textContent = `${diffDays} nap`;
    totalPriceElement.textContent = `${totalPrice.toLocaleString('hu-HU')} Ft`;
    rentalSummary.style.display = 'block';
}
