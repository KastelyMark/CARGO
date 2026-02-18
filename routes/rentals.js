const express = require('express');
const { getPool } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({
            success: false,
            message: 'Hitelesítés szükséges'
        });
    }
    next();
};

// Create rental
router.post('/', requireAuth, [
    body('carId').isInt().withMessage('Érvényes autó azonosító szükséges'),
    body('carName').notEmpty().withMessage('Az autó neve kötelező'),
    body('carPrice').notEmpty().withMessage('Az autó ára kötelező'),
    body('rentalDate').isISO8601().withMessage('Érvényes bérleti kezdő dátum szükséges'),
    body('returnDate').isISO8601().withMessage('Érvényes visszaadási dátum szükséges'),
    body('customerName').isLength({ min: 2 }).withMessage('A vevő neve legalább 2 karakterből kell álljon'),
    body('customerEmail').isEmail().withMessage('Érvényes email szükséges')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { carId, carName, carPrice, rentalDate, returnDate, customerName, customerEmail } = req.body;

        // Validate dates
        const rental = new Date(rentalDate);
        const returnD = new Date(returnDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (rental < today) {
            return res.status(400).json({
                success: false,
                message: 'A bérleti kezdő dátum nem lehet a múltban'
            });
        }

        if (returnD <= rental) {
            return res.status(400).json({
                success: false,
                message: 'A visszaadási dátumnak a bérleti dátum utáninak kell lennie'
            });
        }

        // Create rental
        const [result] = await getPool().execute(
            'INSERT INTO rentals (user_id, car_id, car_name, car_price, rental_date, return_date, customer_name, customer_email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.session.userId, carId, carName, carPrice, rentalDate, returnDate, customerName, customerEmail, 'pending']
        );

        // Send confirmation email to customer
        await sendRentalConfirmation(customerEmail, customerName, carName, carPrice, rentalDate, returnDate);

        // Send notification email to admin
        await sendRentalNotification(customerName, customerEmail, carName, carPrice, rentalDate, returnDate);

        res.json({
            success: true,
            message: 'A bérlés iránti kérelem sikeresen elküldve! Hamarosan felvesszük Önnel a kapcsolatot a megerősítéshez.'
        });

    } catch (error) {
        console.error('Rental creation error:', error);
        res.status(500).json({
            success: false,
            message: 'A bérlés létrehozása sikertelen'
        });
    }
});

// Get user rentals
router.get('/', requireAuth, async (req, res) => {
    try {
        const [rentals] = await getPool().execute(
            'SELECT * FROM rentals WHERE user_id = ? ORDER BY created_at DESC',
            [req.session.userId]
        );

        res.json({
            success: true,
            rentals: rentals
        });

    } catch (error) {
        console.error('Get rentals error:', error);
        res.status(500).json({
            success: false,
            message: 'A bérlések lekérése sikertelen'
        });
    }
});

// Helper function to send rental confirmation email
async function sendRentalConfirmation(email, name, carName, carPrice, rentalDate, returnDate) {
    const subject = "Bérlés igénylés megerősítése - CarGO";
    const message = `
        <html>
        <head>
            <title>Bérlés igénylés megerősítése</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .rental-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #3498db; }
                .highlight { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>A bérlés igénylése beérkezett</h1>
                    <p>Köszönjük, hogy minket választott!</p>
                </div>
                <div class='content'>
                    <h2>Kedves ${name},</h2>
                    <p>Megkaptuk a bérlés iránti kérelmét! Hamarosan felvesszük Önnel a kapcsolatot a részletek egyeztetéséhez.</p>
                    
                    <div class='rental-details'>
                        <h3>Bérlés részletei:</h3>
                        <p><strong>Autó:</strong> ${carName}</p>
                        <p><strong>Ár:</strong> ${carPrice}</p>
                        <p><strong>Bérlés kezdete:</strong> ${new Date(rentalDate).toLocaleDateString()}</p>
                        <p><strong>Visszaadás:</strong> ${new Date(returnDate).toLocaleDateString()}</p>
                    </div>
                    
                    <div class='highlight'>
                        <h3>Next Steps:</h3>
                        <ul>
                            <li>24 órán belül felvesszük Önnel a kapcsolatot</li>
                                <li>Egyeztetjük a bérlési feltételeket</li>
                                <li>Elküldjük a szerződést</li>
                                <li>Egyeztetjük az átvétel időpontját</li>
                        </ul>
                    </div>
                    
                    <p>Ha sürgős kérdése van, hívjon minket a <strong>+36 1 234 5678</strong> telefonszámon!</p>
                    
                    <p>Üdvözlettel,<br>
                    A CarGO csapata</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(email, subject, message);
}

// Helper function to send rental notification email to admin
async function sendRentalNotification(name, email, carName, carPrice, rentalDate, returnDate) {
    const subject = "Új bérlés igénylés - CarGO";
    const message = `
        <html>
        <head>
            <title>Új bérlés igénylés</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .rental-details { background: white; padding: 15px; border-left: 4px solid #e74c3c; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Új bérlés érkezett</h2>
                </div>
                <div class='content'>
                    <p><strong>Ügyfél:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Időpont:</strong> ${new Date().toLocaleString()}</p>
                    
                    <div class='rental-details'>
                        <h3>Bérlés részletei:</h3>
                        <p><strong>Autó:</strong> ${carName}</p>
                        <p><strong>Ár:</strong> ${carPrice}</p>
                        <p><strong>Bérlés kezdete:</strong> ${new Date(rentalDate).toLocaleDateString()}</p>
                        <p><strong>Visszaadás:</strong> ${new Date(returnDate).toLocaleDateString()}</p>
                    </div>
                    
                    <p>Kérjük, vegyék fel a kapcsolatot az ügyféllel a fenti email címen.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(process.env.ADMIN_EMAIL || 'admin@cargo.com', subject, message);
}

module.exports = router;
