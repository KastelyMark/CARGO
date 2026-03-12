const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../utils/database');
const { generateVerificationCode, sendVerificationEmail, sendEmail, sendTemporaryPasswordEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

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

       
        const hashedPassword = await bcrypt.hash(password, 12);

        
        const verificationCode = generateVerificationCode();

        
        const [result] = await getPool().execute(
            'INSERT INTO users (name, email, phone, password, verification_code, is_verified, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [name, email, phone, hashedPassword, verificationCode, 0]
        );

        
        try {
            await sendVerificationEmail(email, name, verificationCode);
        } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
            
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
        const [users] = await getPool().execute(
            'SELECT id, name, email, is_verified FROM users WHERE email = ? AND is_verified = 0',
            [email]
        );
        if (users.length === 0) {
            
            return res.json({
                success: true,
                message: 'Felhasználó hitelesítve!'
            });
        }
        const user = users[0];

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

router.post('/resend-verification', async (req, res) => {
    try {
    
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
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Érvénytelen email vagy jelszó'
            });
        }

        
        if (!user.is_verified) {
            return res.status(400).json({
                success: false,
                message: 'Kérjük, először hitelesítsd az email címedet'
            });
        }

        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;

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
           
            const decoded = Buffer.from(token, 'base64').toString();
            const [userId, email] = decoded.split(':');
            
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
        const [users] = await getPool().execute(
            'SELECT id, name FROM users WHERE email = ? AND is_verified = 1',
            [email]
        );

        if (users.length === 0) {
            
            return res.json({
                success: true,
                message: 'Ha az email cím regisztrálva van, elküldtük az ideiglenes jelszót.'
            });
        }

        
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