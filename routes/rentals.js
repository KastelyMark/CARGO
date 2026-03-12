const express = require('express');
const { getPool } = require('../utils/database');
const { sendRentalConfirmationEmail, sendRentalNotificationEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

const requireAuth = async (req, res, next) => {
    if (req.session.userId) {
        req.userId = req.session.userId;
        return next();
    }
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        try {
            const decoded = Buffer.from(token, 'base64').toString();
            const [userId, email] = decoded.split(':');
            
            const [users] = await getPool().execute(
                'SELECT id FROM users WHERE id = ? AND email = ?',
                [userId, email]
            );
            
            if (users.length > 0) {
                req.userId = parseInt(userId);
                return next();
            }
        } catch (error) {
            console.error('Token decode error:', error);
        }
    }
    
    return res.status(401).json({
        success: false,
        message: 'Hitelesítés szükséges'
    });
};

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

        const totalDays = Math.ceil((returnD - rental) / (1000 * 60 * 60 * 24));
        const totalPrice = totalDays * parseFloat(carPrice);

        await getPool().execute(
            'INSERT INTO rentals (user_id, car_id, car_name, car_price, rental_date, return_date, customer_name, customer_email, total_days, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.userId, carId, carName, carPrice, rentalDate, returnDate, customerName, customerEmail, totalDays, totalPrice, 'pending']
        );

        await sendRentalConfirmationEmail(customerEmail, customerName, carName, carPrice, rentalDate, returnDate, totalDays, totalPrice);
        await sendRentalNotificationEmail(customerName, customerEmail, carName, carPrice, rentalDate, returnDate, totalDays, totalPrice);

        res.json({
            success: true,
            message: 'A bérlés iránti kérelem sikeresen elküldve! Hamarosan felvesszük Önnel a kapcsolatot a megerősítéshez.',
            rental: {
                totalDays,
                totalPrice
            }
        });

    } catch (error) {
        console.error('Rental creation error:', error);
        res.status(500).json({
            success: false,
            message: 'A bérlés létrehozása sikertelen'
        });
    }
});

router.get('/', requireAuth, async (req, res) => {
    try {
        const [rentals] = await getPool().execute(
            'SELECT * FROM rentals WHERE user_id = ? ORDER BY created_at DESC',
            [req.userId]
        );

        const formattedRentals = rentals.map(rental => ({
            ...rental,
            rental_date: rental.rental_date ? new Date(rental.rental_date).toISOString().split('T')[0] : null,
            return_date: rental.return_date ? new Date(rental.return_date).toISOString().split('T')[0] : null,
            total_price: parseFloat(rental.total_price)
        }));

        res.json({
            success: true,
            rentals: formattedRentals
        });

    } catch (error) {
        console.error('Get rentals error:', error);
        res.status(500).json({
            success: false,
            message: 'A bérlések lekérése sikertelen'
        });
    }
});

module.exports = router;
