const express = require('express');
const router = express.Router();


const authRoutes = require('./auth');
const rentalsRoutes = require('./rentals');
const adminRoutes = require('./admin');
const contactRoutes = require('./contact');
const carsRoutes = require('./cars');

router.use('/auth', authRoutes);
router.use('/rentals', rentalsRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/cars', carsRoutes);

module.exports = router;
