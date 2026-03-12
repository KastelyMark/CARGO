const express = require('express');
const { getPool } = require('../utils/database');
const router = express.Router();


router.get('/', async (req, res) => {
    try {
    const { category, min_price, max_price, transmission, fuel_type, min_seats, max_seats, admin } = req.query;

    let query = admin === '1' ? 'SELECT * FROM cars' : 'SELECT * FROM cars WHERE is_available = TRUE';
        const params = [];
        
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }
        
        if (min_price) {
            query += ' AND price_per_day >= ?';
            params.push(parseInt(min_price));
        }
        
        if (max_price) {
            query += ' AND price_per_day <= ?';
            params.push(parseInt(max_price));
        }
        
        if (transmission) {
            query += ' AND transmission = ?';
            params.push(transmission);
        }
        
        if (fuel_type) {
            query += ' AND fuel_type = ?';
            params.push(fuel_type);
        }
        
        if (min_seats) {
            query += ' AND seats >= ?';
            params.push(parseInt(min_seats));
        }
        
        if (max_seats) {
            query += ' AND seats <= ?';
            params.push(parseInt(max_seats));
        }
        
        query += ' ORDER BY price_per_day ASC';

        const [cars] = await getPool().execute(query, params);

        const carsWithParsedFeatures = cars.map(car => ({
            ...car,
            features: JSON.parse(car.features || '[]'),
            price_per_day: car.price_per_day.toString()
        }));

        res.json({
            success: true,
            cars: carsWithParsedFeatures
        });

    } catch (error) {
        console.error('Get cars error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cars'
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const carId = req.params.id;
        
        const [cars] = await getPool().execute(
            'SELECT * FROM cars WHERE id = ? AND is_available = TRUE',
            [carId]
        );

        if (cars.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Car not found'
            });
        }

        const car = {
            ...cars[0],
            features: JSON.parse(cars[0].features || '[]'),
            price_per_day: cars[0].price_per_day.toString()
        };

        res.json({
            success: true,
            car: car
        });

    } catch (error) {
        console.error('Get car error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch car'
        });
    }
});

module.exports = router;
