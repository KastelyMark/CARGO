const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth');
const rentalsRoutes = require('./rentals');
const adminRoutes = require('./admin');
const contactRoutes = require('./contact');
const carsRoutes = require('./cars');

// Mount all API routes
router.use('/auth', authRoutes);
router.use('/rentals', rentalsRoutes);
router.use('/admin', adminRoutes);
router.use('/contact', contactRoutes);
router.use('/cars', carsRoutes);

module.exports = router;
