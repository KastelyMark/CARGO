const express = require('express');
const path = require('path');
const router = express.Router();

// Static page routes
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

router.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'register.html'));
});

router.get('/verify', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});

router.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

router.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

router.get('/cars', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'cars.html'));
});

// Catch-all route for SPA
router.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = router;
