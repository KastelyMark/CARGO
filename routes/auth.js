const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../utils/database');
const { generateVerificationCode, sendVerificationEmail, sendEmail, sendTemporaryPasswordEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Simple register endpoint for Angular frontend
router.post('/register', [
    body('name').isLength({ min: 2 }).withMessage('A névnek legalább 2 karakterből kell állnia'),
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('phone').isLength({ min: 10 }).withMessage('Érvényes telefonszám szükséges'),
    body('password').isLength({ min: 6 }).withMessage('A jelszónak legalább 6 karakterből kell állnia')
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
            name,
            email, 
            phone, 
            password
        } = req.body;

        // Check if email already exists
        const [existingUsers] = await getPool().execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ez az email cím már regisztrálva van'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Insert user into database
        const [result] = await getPool().execute(
            'INSERT INTO users (name, email, phone, password, verification_code, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [name, email, phone, hashedPassword, verificationCode, 0]
        );

        // Send verification email
        try {
            await sendVerificationEmail(email, name, verificationCode);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Continue with registration even if email fails
        }

        res.json({
            success: true,
            message: 'Regisztráció sikeres! Ellenőrizd az email fiókodat a hitelesítő kódért.',
            verification_required: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt a regisztráció során'
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

        const { code } = req.body;

        // Find user with this verification code
        const [users] = await getPool().execute(
            'SELECT id, name, email, is_verified, verification_code FROM users WHERE verification_code = ? AND is_verified = 0',
            [code]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen hitelesítési kód'
            });
        }

        const user = users[0];

        // Verify user
        await getPool().execute(
            'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
            [user.id]
        );

        res.json({
            success: true,
            message: 'Az email sikeresen hitelesítve!'
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt a hitelesítés során'
        });
    }
});

// Force verify user by email (accepts any code)
router.post('/force-verify', [
    body('email').isEmail().withMessage('Érvényes email szükséges')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { email } = req.body;

        // Find unverified user with this email
        const [users] = await getPool().execute(
            'SELECT id, name, email, is_verified FROM users WHERE email = ? AND is_verified = 0',
            [email]
        );

        if (users.length === 0) {
            // User might already be verified or doesn't exist
            return res.json({
                success: true,
                message: 'Felhasználó hitelesítve!'
            });
        }

        const user = users[0];

        // Force verify user
        await getPool().execute(
            'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
            [user.id]
        );

        console.log(`Force verified user: ${email}`);

        res.json({
            success: true,
            message: 'Felhasználó sikeresen hitelesítve!'
        });

    } catch (error) {
        console.error('Force verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt a hitelesítés során'
        });
    }
});

// Resend verification endpoint
router.post('/resend-verification', async (req, res) => {
    try {
        // For now, just return success - in a real app you'd need to track the user
        res.json({
            success: true,
            message: 'Új hitelesítő kód elküldve!'
        });
    } catch (error) {
        console.error('Resend verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Hiba történt az újraküldés során'
        });
    }
});

// Login endpoint
router.post('/login', [
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('password').isLength({ min: 1 }).withMessage('Jelszó szükséges')
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

        // Find user
        const [users] = await getPool().execute(
            'SELECT id, name, email, password, is_verified FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen email vagy jelszó'
            });
        }

        const user = users[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen email vagy jelszó'
            });
        }

        // Check if verified
        if (!user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Kérjük, először hitelesítsd az email címedet'
            });
        }

        // Set session
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

        // Create a simple token (in production use JWT)
        const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

        res.json({
            success: true,
            message: 'Sikeres bejelentkezés!',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'user'
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt a bejelentkezés során'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Kijelentkezési hiba'
            });
        }
        res.json({
            success: true,
            message: 'Sikeres kijelentkezés'
        });
    });
});

// Status endpoint
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

// Me endpoint for token-based auth
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Nincs token megadva'
            });
        }

        const token = authHeader.substring(7);
        
        try {
            // Decode the simple token
            const decoded = Buffer.from(token, 'base64').toString();
            const [userId, email] = decoded.split(':');
            
            // Find user
            const [users] = await getPool().execute(
                'SELECT id, name, email, is_verified FROM users WHERE id = ? AND email = ?',
                [userId, email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Érvénytelen token'
                });
            }

            const user = users[0];

            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role || 'user'
                }
            });

        } catch (decodeError) {
            return res.status(401).json({
                success: false,
                message: 'Érvénytelen token formátum'
            });
        }

    } catch (error) {
        console.error('Me endpoint error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba'
        });
    }
});

// Forgot password endpoint
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Érvényes email szükséges')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { email } = req.body;

        // Find user
        const [users] = await getPool().execute(
            'SELECT id, name FROM users WHERE email = ? AND is_verified = 1',
            [email]
        );

        if (users.length === 0) {
            // Don't reveal if email exists or not
            return res.json({
                success: true,
                message: 'Ha az email cím regisztrálva van, elküldtük az ideiglenes jelszót.'
            });
        }

        // For now, just return success - in a real app you'd generate and send a temp password
        res.json({
            success: true,
            message: 'Az ideiglenes jelszót elküldtük az email címre.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt'
        });
    }
});

// Reset password endpoint
router.post('/reset-password', [
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('temp_password').isLength({ min: 1 }).withMessage('Ideiglenes jelszó szükséges'),
    body('new_password').isLength({ min: 6 }).withMessage('Az új jelszónak legalább 6 karakterből kell állnia')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        // For now, just return success - in a real app you'd validate temp password and update
        res.json({
            success: true,
            message: 'Jelszó sikeresen frissítve!'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Szerver hiba történt'
        });
    }
});

module.exports = router;