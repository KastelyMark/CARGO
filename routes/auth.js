const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../utils/database');
const { generateVerificationCode, sendVerificationEmail, sendEmail, sendTemporaryPasswordEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Register endpoint
router.post('/register', [
    body('firstName').isLength({ min: 2 }).withMessage('A keresztnévnek legalább 2 karakterből kell állnia'),
    body('lastName').isLength({ min: 2 }).withMessage('A vezetéknévnek legalább 2 karakterből kell állnia'),
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('phone').isLength({ min: 10 }).withMessage('Érvényes telefonszám szükséges'),
    body('birthDate').isISO8601().withMessage('Érvényes születési dátum szükséges'),
    body('password').isLength({ min: 6 }).withMessage('A jelszónak legalább 6 karakterből kell állnia'),
    body('address').isLength({ min: 5 }).withMessage('Az címnek legalább 5 karakterből kell állnia'),
    body('city').isLength({ min: 2 }).withMessage('A városnak legalább 2 karakterből kell állnia'),
    body('zipCode').isLength({ min: 4 }).withMessage('Érvényes irányítószám szükséges'),
    body('country').isLength({ min: 2 }).withMessage('Ország megadása kötelező')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { 
            firstName, 
            lastName, 
            email, 
            phone, 
            birthDate, 
            password, 
            address, 
            city, 
            zipCode, 
            country,
            newsletter = false 
        } = req.body;

        // Check if email already exists
        const [existingUsers] = await getPool().execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Az email cím már regisztrálva van'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); 

        // Insert user
        const [result] = await getPool().execute(
            'INSERT INTO users (name, email, phone, password, verification_code, verification_expires, is_verified, first_name, last_name, birth_date, address, city, zip_code, country, newsletter) VALUES (?, ?, ?, ?, ?, ?, FALSE, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                `${firstName} ${lastName}`, 
                email, 
                phone, 
                hashedPassword, 
                verificationCode.toString(), 
                verificationExpires,
                firstName, 
                lastName, 
                birthDate, 
                address, 
                city, 
                zipCode, 
                country,
                newsletter
            ]
        );

        // Store email in session
        req.session.pendingVerificationEmail = email;

        // Send verification email
        await sendVerificationEmail(email, `${firstName} ${lastName}`, verificationCode);

        res.json({
            success: true,
            message: 'Sikeres regisztráció! Kérjük, ellenőrizze az email fiókját a hitelesítő kódért.',
            verification_required: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'A regisztráció sikertelen'
        });
    }
});

// Verify email endpoint
router.post('/verify', [
    body('code').isLength({ min: 6, max: 6 }).withMessage('A hitelesítő kódnak 6 számjegyből kell állnia').isNumeric().withMessage('A hitelesítő kód csak számokat tartalmazhat')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { code: verification_code } = req.body;
        const email = req.session.pendingVerificationEmail;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Nincs függőben lévő hitelesítés'
            });
        }

        // Get user
        const [users] = await getPool().execute(
            'SELECT id, name, email, verification_code, verification_expires, is_verified FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Felhasználó nem található'
            });
        }

        const user = users[0];

        if (user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'A fiók már hitelesítve van'
            });
        }

        if (!user.verification_code) {
            return res.status(400).json({
                success: false,
                message: 'Nincs aktív hitelesítési kód'
            });
        }

        if (user.verification_code !== verification_code.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen hitelesítési kód'
            });
        }

        if (new Date(user.verification_expires) < new Date()) {
            return res.status(400).json({
                success: false,
                message: 'A hitelesítési kód lejárt'
            });
        }

        // Verify user
        await getPool().execute(
            'UPDATE users SET is_verified = TRUE, verification_code = NULL, verification_expires = NULL WHERE id = ?',
            [user.id]
        );

        // Clear session
        delete req.session.pendingVerificationEmail;

        // Set user session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            message: 'Az email sikeresen hitelesítve!'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Hitelesítés sikertelen'
        });
    }
});

// Resend verification code
router.post('/resend-code', async (req, res) => {
    try {
        const email = req.session.pendingVerificationEmail;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Nincs függőben lévő hitelesítés'
            });
        }

        // Get user
        const [users] = await getPool().execute(
            'SELECT id, name FROM users WHERE email = ? AND is_verified = FALSE',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nincs nem-hitelesített felhasználó'
            });
        }

        const user = users[0];

        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

        // Update verification code
        await getPool().execute(
            'UPDATE users SET verification_code = ?, verification_expires = ? WHERE id = ?',
            [verificationCode.toString(), verificationExpires, user.id]
        );

        // Send verification email
        await sendVerificationEmail(email, user.name, verificationCode);

        res.json({
            success: true,
            message: 'Új hitelesítési kód elküldve!'
        });

    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'A kód újraküldése sikertelen'
        });
    }
});

// Login endpoint
router.post('/login', [
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('password').notEmpty().withMessage('Jelszó szükséges')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { email, password } = req.body;

        // Get user
        const [users] = await getPool().execute(
            'SELECT id, name, email, password, is_verified, temp_password_hash, force_password_reset FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen email vagy jelszó'
            });
        }

        const user = users[0];

        // Check if user is verified
        if (!user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'A fiók nincs hitelesítve. Kérjük, ellenőrizze az emailt a hitelesítő kódért.'
            });
        }

        // Allow login with either the real password or a temporary password
        let isValidPassword = await bcrypt.compare(password, user.password);
        let usedTemp = false;
        if (!isValidPassword && user.temp_password_hash) {
            const tempMatch = await bcrypt.compare(password, user.temp_password_hash);
            if (tempMatch) {
                isValidPassword = true;
                usedTemp = true;
            }
        }

        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen email vagy jelszó'
            });
        }

        // Set user session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            message: 'Sikeres bejelentkezés!',
            force_password_reset: !!usedTemp || !!user.force_password_reset,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Bejelentkezés sikertelen'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Kijelentkezés sikertelen'
            });
        }
        res.json({
            success: true,
            message: 'Sikeres kijelentkezés'
        });
    });
});

// Check login status
router.get('/status', (req, res) => {
    if (req.session.userId) {
        res.json({
            logged_in: true,
            user_name: req.session.userName,
            user_email: req.session.userEmail
        });
    } else {
        res.json({
            logged_in: false
        });
    }
});

module.exports = router;

// Forgot password: send temporary password if email exists
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email szükséges' });

        const [users] = await getPool().execute('SELECT id, name, email FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ success: false, message: 'Nem található felhasználó ezzel az email címmel' });

        const user = users[0];

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-10) + Math.floor(Math.random()*9000);
        const hashedTemp = await bcrypt.hash(tempPassword, 12);

        // Save temp hash and set force_password_reset flag
        await getPool().execute('UPDATE users SET temp_password_hash = ?, force_password_reset = 1 WHERE id = ?', [hashedTemp, user.id]);

    // Send styled email with temp password
    const sent = await sendTemporaryPasswordEmail(user.email, user.name, tempPassword);
    res.json({ success: true, message: sent ? 'Ideiglenes jelszó elküldve emailben' : 'Ideiglenes jelszó létrehozva (email küldése sikertelen), ellenőrizze a szerver logot.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Hiba történt' });
    }
});

// Reset password: set a new password (user must have force_password_reset = 1 or be logged in)
router.post('/reset-password', async (req, res) => {
    try {
        const { email, temp_password, new_password } = req.body;
        if (!email || !new_password) return res.status(400).json({ success: false, message: 'Email és új jelszó szükséges' });

        const [users] = await getPool().execute('SELECT id, temp_password_hash, force_password_reset FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(400).json({ success: false, message: 'Felhasználó nem található' });

        const user = users[0];

        // If user has force_password_reset, temp_password must match temp_password_hash
        if (user.force_password_reset) {
            if (!temp_password) return res.status(400).json({ success: false, message: 'Ideiglenes jelszó szükséges' });
            const match = await bcrypt.compare(temp_password, user.temp_password_hash || '');
            if (!match) return res.status(400).json({ success: false, message: 'Érvénytelen ideiglenes jelszó' });
        }

        // Hash and save new password, clear flags
        const newHash = await bcrypt.hash(new_password, 12);
        await getPool().execute('UPDATE users SET password = ?, temp_password_hash = NULL, force_password_reset = 0 WHERE id = ?', [newHash, user.id]);

        res.json({ success: true, message: 'Jelszó sikeresen frissítve' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Hiba történt' });
    }
});
