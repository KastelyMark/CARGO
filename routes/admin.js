const express = require('express');
const { getPool } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';


router.post('/login', [
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

        const { password } = req.body;

        if (password === ADMIN_PASSWORD) {
            req.session.adminLoggedIn = true;
            res.json({
                success: true,
                message: 'Admin bejelentkezés sikeres'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Érvénytelen jelszó'
            });
        }

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Admin bejelentkezés sikertelen'
        });
    }
});


router.post('/logout', (req, res) => {
    req.session.adminLoggedIn = false;
    res.json({
        success: true,
        message: 'Admin sikeresen kijelentkezett'
    });
});

router.get('/status', (req, res) => {
    res.json({
        logged_in: !!req.session.adminLoggedIn
    });
});

const requireAdmin = (req, res, next) => {
    if (!req.session.adminLoggedIn) {
        return res.status(401).json({
            success: false,
            message: 'Admin jogosultság szükséges'
        });
    }
    next();
};


const uploadDir = path.join(__dirname, '..', 'uploads', 'cars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `${Date.now()}-${Math.round(Math.random()*1e9)}${ext}`;
        cb(null, name);
    }
});

const imageFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Csak képfájlok engedélyezettek'), false);
    }
    cb(null, true);
};

const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });


router.post('/cars', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price_per_day, category, transmission, fuel_type, seats } = req.body;
        let imageUrl = null;

        if (req.file) {
           
            imageUrl = `/uploads/cars/${req.file.filename}`;
        }

        const features = JSON.stringify([]);

        await getPool().execute(`
            INSERT INTO cars (name, description, price_per_day, image_url, features, category, transmission, fuel_type, seats)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, description, price_per_day || 0, imageUrl, features, category || 'Gazdaságos', transmission || 'automatic', fuel_type || 'Benzin', seats || 5]);

        res.json({ success: true, message: 'Autó sikeresen létrehozva' });
    } catch (error) {
        console.error('Create car error:', error);
        res.status(500).json({ success: false, message: 'Autó létrehozása sikertelen' });
    }
});


router.delete('/cars/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await getPool().execute('SELECT image_url FROM cars WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Autó nem található' });
        }

        const imageUrl = rows[0].image_url;

        await getPool().execute('DELETE FROM cars WHERE id = ?', [id]);

      
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', imageUrl.replace('/uploads/', 'uploads/'));
            fs.unlink(filePath, (err) => {
                if (err) console.warn('Failed to delete image file:', err.message);
            });
        }

        res.json({ success: true, message: 'Autó törölve' });
    } catch (error) {
        console.error('Delete car error:', error);
        res.status(500).json({ success: false, message: 'Autó törlése sikertelen' });
    }
});


router.get('/cars/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await getPool().execute('SELECT * FROM cars WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Autó nem található' });
        }
        res.json({ success: true, car: rows[0] });
    } catch (error) {
        console.error('Get car error:', error);
        res.status(500).json({ success: false, message: 'Autó lekérése sikertelen' });
    }
});


router.put('/cars/:id', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price_per_day, category, transmission, fuel_type, seats } = req.body;

    
        const [existingRows] = await getPool().execute('SELECT image_url FROM cars WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Car not found' });
        }
        const currentImageUrl = existingRows[0].image_url;

        const fields = [];
        const params = [];

        const addField = (key, value) => {
            if (typeof value !== 'undefined' && value !== null && value !== '') {
                fields.push(`${key} = ?`);
                params.push(value);
            }
        };

        addField('name', name);
        addField('description', description);
        addField('price_per_day', price_per_day);
        addField('category', category);
        addField('transmission', transmission);
        addField('fuel_type', fuel_type);
        addField('seats', seats);

        
        if (req.file) {
            const newImageUrl = `/uploads/cars/${req.file.filename}`;
            addField('image_url', newImageUrl);
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'Nincs frissítendő mező' });
        }

        params.push(id);
        await getPool().execute(`UPDATE cars SET ${fields.join(', ')} WHERE id = ?`, params);

       
        if (req.file && currentImageUrl && currentImageUrl.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '..', currentImageUrl.replace('/uploads/', 'uploads/'));
            fs.unlink(oldPath, (err) => {
                if (err) console.warn('Failed to delete previous image file:', err.message);
            });
        }

        res.json({ success: true, message: 'Autó frissítve' });
    } catch (error) {
        console.error('Update car error:', error);
        res.status(500).json({ success: false, message: 'Autó frissítése sikertelen' });
    }
});


router.get('/stats', requireAdmin, async (req, res) => {
    try {
     
        const [usersResult] = await getPool().execute('SELECT COUNT(*) as total FROM users');
        
       
        const [registeredUsersResult] = await getPool().execute('SELECT COUNT(*) as total FROM users WHERE is_verified = 1');
        
      
        const [messagesResult] = await getPool().execute('SELECT COUNT(*) as total FROM messages');
        
        const [newMessagesResult] = await getPool().execute('SELECT COUNT(*) as total FROM messages WHERE status = "new"');
      
        const [rentalsResult] = await getPool().execute('SELECT COUNT(*) as total FROM rentals');
    
        const [pendingRentalsResult] = await getPool().execute('SELECT COUNT(*) as total FROM rentals WHERE status = "pending"');
        
     
        const [carsResult] = await getPool().execute('SELECT COUNT(*) as total FROM cars');

        res.json({
            success: true,
            stats: {
                users: usersResult[0].total,
                registeredUsers: registeredUsersResult[0].total,
                messages: messagesResult[0].total,
                newMessages: newMessagesResult[0].total,
                rentals: rentalsResult[0].total,
                pendingRentals: pendingRentalsResult[0].total,
                cars: carsResult[0].total
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Statisztikák lekérése sikertelen'
        });
    }
});

// Get recent messages
router.get('/messages', requireAdmin, async (req, res) => {
    try {
        const [messages] = await getPool().execute(
            'SELECT * FROM messages ORDER BY created_at DESC LIMIT 10'
        );

        res.json({
            success: true,
            messages: messages
        });

    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Üzenetek lekérése sikertelen'
        });
    }
});


router.get('/users', requireAdmin, async (req, res) => {
    try {
        const { all, status } = req.query;
        let query = 'SELECT * FROM users';
        const params = [];

        if (status === 'registered') {
            query += ' WHERE is_verified = 1';
        } else if (status === 'unverified') {
            query += ' WHERE is_verified = 0';
        }

        query += ' ORDER BY created_at DESC';

        if (!all) {
            query += ' LIMIT 50';
        }

        const [users] = await getPool().execute(query, params);

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Felhasználók lekérése sikertelen'
        });
    }
});

router.put('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const allowed = ['name', 'email', 'phone', 'first_name', 'last_name', 'is_verified', 'address', 'city', 'zip_code', 'country'];
        const fields = [];
        const params = [];

        if (req.body.password && req.body.password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            fields.push('password = ?');
            params.push(hashedPassword);
        }

        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                fields.push(`${key} = ?`);
                params.push(req.body[key]);
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'Nincs frissítendő mező' });
        }

        params.push(id);

        await getPool().execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

        res.json({ success: true, message: 'Felhasználó frissítve' });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ success: false, message: 'Felhasználó frissítése sikertelen' });
    }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await getPool().execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true, message: 'Felhasználó törölve' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ success: false, message: 'Felhasználó törlése sikertelen' });
    }
});

router.get('/users/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await getPool().execute('SELECT id, name, email, phone, is_verified, created_at, first_name, last_name, address, city, zip_code, country FROM users WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Felhasználó nem található' });
        res.json({ success: true, user: rows[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

router.get('/rentals', requireAdmin, async (req, res) => {
    try {
        const [rentals] = await getPool().execute(
            'SELECT * FROM rentals ORDER BY created_at DESC LIMIT 10'
        );

        res.json({
            success: true,
            rentals: rentals
        });

    } catch (error) {
        console.error('Get rentals error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch rentals'
        });
    }
});

router.put('/messages/:id/status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await getPool().execute(
            'UPDATE messages SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Message status updated'
        });

    } catch (error) {
        console.error('Update message status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update message status'
        });
    }
});

router.delete('/messages/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await getPool().execute('DELETE FROM messages WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Message deleted'
        });

    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

router.put('/rentals/:id/status', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await getPool().execute(
            'UPDATE rentals SET status = ? WHERE id = ?',
            [status, id]
        );

        res.json({
            success: true,
            message: 'Rental status updated'
        });

    } catch (error) {
        console.error('Update rental status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update rental status'
        });
    }
});

router.delete('/rentals/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        await getPool().execute('DELETE FROM rentals WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Rental deleted'
        });

    } catch (error) {
        console.error('Delete rental error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete rental'
        });
    }
});

router.post('/send-email', requireAdmin, [
    body('toEmail').isEmail().withMessage('Érvényes email szükséges'),
    body('toName').notEmpty().withMessage('Név szükséges'),
    body('subject').notEmpty().withMessage('Tárgy szükséges'),
    body('message').notEmpty().withMessage('Üzenet szükséges')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { toEmail, toName, subject, message } = req.body;

        const htmlMessage = `
            <html>
            <head>
                <title>${subject}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .message-content { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>CarGO</h1>
                        <p>Üzenet az adminisztrátortól</p>
                    </div>
                    <div class='content'>
                        <h2>Kedves ${toName},</h2>
                        
                        <div class='message-content'>
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        
                        <p>Ha bármilyen kérdése van, kérjük, lépjen velünk kapcsolatba!</p>
                        
                        <p>Üdvözlettel,<br>
                        A CarGO csapata</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await sendEmail(toEmail, subject, htmlMessage);

        res.json({
            success: true,
            message: 'Email sikeresen elküldve'
        });

    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({
            success: false,
            message: 'Email küldése sikertelen'
        });
    }
});

module.exports = router;
