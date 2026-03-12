const express = require('express');
const { getPool } = require('../utils/database');
const { sendEmail } = require('../utils/email');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.post('/', [
    body('name').isLength({ min: 2 }).withMessage('A névnek legalább 2 karakterből kell állnia'),
    body('email').isEmail().withMessage('Érvényes email szükséges'),
    body('message').isLength({ min: 10 }).withMessage('Az üzenetnek legalább 10 karakterből kell állnia')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: errors.array().map(err => err.msg).join(', ')
            });
        }

        const { name, email, message } = req.body;

        await getPool().execute(
            'INSERT INTO messages (name, email, message, status) VALUES (?, ?, ?, ?)',
            [name, email, message, 'new']
        );

        try {
            await sendContactNotification(name, email, message);
        } catch (emailError) {
            console.error('Email sending failed:', emailError);
        }

        res.json({
            success: true,
            message: 'Üzenet elküldve! Hamarosan felvesszük Önnel a kapcsolatot.'
        });

    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Az üzenet küldése sikertelen'
        });
    }
});

async function sendContactNotification(name, email, message) {
    const subject = "Új kapcsolatfelvételi üzenet - CarGO";
    const htmlMessage = `
        <html>
        <head>
            <title>Új kapcsolatfelvételi üzenet</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3498db; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; }
                .message-content { background: white; padding: 15px; border-left: 4px solid #3498db; margin: 15px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h2>Új kapcsolatfelvételi üzenet</h2>
                </div>
                <div class='content'>
                    <p><strong>Feladó:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Időpont:</strong> ${new Date().toLocaleString()}</p>
                    
                    <div class='message-content'>
                        <h3>Üzenet:</h3>
                        <p>${message.replace(/\n/g, '<br>')}</p>
                    </div>
                    
                    <p>Kérjük, válaszoljon az ügyfélnek a fenti email címen.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmail(process.env.ADMIN_EMAIL || 'admin@cargo.com', subject, htmlMessage);
}

module.exports = router;
