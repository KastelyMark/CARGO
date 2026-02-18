const nodemailer = require('nodemailer');

// ============================================
// EMAIL KONFIGURÁCIÓ - RACKHOST SMTP
// ============================================
const EMAIL_CONFIG = {
    // Rackhost SMTP beállítások
    SMTP_HOST: 'smtp.rackhost.hu',
    SMTP_PORT: 465,
    SMTP_SECURE: true, // true for port 465
    SMTP_USER: 'cargo@kemenesklima.hu',
    SMTP_PASS: 'cargo2026'
};

// Utility functions for email
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create SMTP transporter
const createTransporter = () => {
    // Rackhost SMTP konfiguráció (valódi email küldéshez)
    const transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.SMTP_HOST,
        port: EMAIL_CONFIG.SMTP_PORT,
        secure: EMAIL_CONFIG.SMTP_SECURE, // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            pass: process.env.SMTP_PASS || EMAIL_CONFIG.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    
    return transporter;
};

// Fallback transporter (ha nincs SMTP konfigurálva)
const createFallbackTransporter = () => {
    return {
        sendMail: async (options) => {
            console.log('📧 EMAIL (SMTP nincs konfigurálva):');
            console.log(`   Címzett: ${options.to}`);
            console.log(`   Tárgy: ${options.subject}`);
            console.log(`   Üzenet: ${options.text || options.html}`);
            console.log('   ---');
            return { messageId: 'fallback-' + Date.now() };
        }
    };
};

const sendVerificationEmail = async (email, name, verificationCode) => {
    try {
        // Rackhost SMTP szerver használata
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            to: email,
            subject: 'Email Hitelesítés - CarGO',
            html: `
                <html>
                <head>
                    <title>Email Hitelesítés</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .code-box { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0; font-size: 2rem; font-weight: bold; letter-spacing: 5px; }
                        .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 0.9em; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h1>🚗 CarGO</h1>
                            <p>Email Hitelesítés</p>
                        </div>
                        <div class='content'>
                            <h2>Kedves ${name}!</h2>
                            <p>Köszönjük, hogy regisztráltál a CarGO oldalán!</p>
                            <p>A fiókod aktiválásához használd a következő hitelesítő kódot:</p>
                            
                            <div class='code-box'>
                                ${verificationCode}
                            </div>
                            
                            <p><strong>Fontos információk:</strong></p>
                            <ul>
                                <li>A kód 15 percig érvényes</li>
                                <li>Csak egyszer használható</li>
                                <li>Ha nem kérted, hagyd figyelmen kívül ezt az emailt</li>
                            </ul>
                            
                            <p>Ha bármilyen kérdésed van, vedd fel velünk a kapcsolatot!</p>
                            
                            <div class='footer'>
                                <p>Üdvözlettel,<br>CarGO Csapata</p>
                                <p>📧 info@cargo.com | 📞 +36 1 234 5678</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        const result = await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        return false;
    }
};

const sendTemporaryPasswordEmail = async (email, name, tempPassword) => {
    try {
        const transporter = createTransporter();
        const html = `
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <style>
                    body { font-family: Poppins, Arial, sans-serif; background: #f4f6f8; margin:0; padding:0; }
                    .email-container { max-width:640px; margin:20px auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08); }
                    .header { background: linear-gradient(135deg,#667eea,#764ba2); padding:24px; color:#fff; text-align:center; }
                    .header h1 { margin:0; font-size:20px; }
                    .content { padding:24px; color:#333; }
                    .code { display:block; margin: 18px auto; padding:18px 22px; background:#0f1724; color:#fff; font-size:20px; font-weight:700; text-align:center; border-radius:8px; width:fit-content; }
                    .footer { padding:18px 24px; font-size:13px; color:#7b7f88; text-align:center; }
                    .btn { display:inline-block; background:#667eea; color:white; padding:10px 16px; border-radius:8px; text-decoration:none; margin-top:12px; }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">
                        <h1>CarGO — Ideiglenes jelszó</h1>
                    </div>
                    <div class="content">
                        <p>Kedves ${name || 'Felhasználó'},</p>
                        <p>Kérésedre ideiglenes jelszót állítottunk be a fiókodhoz. Ezzel a jelszóval be tudsz jelentkezni, de a rendszer meg fogja kérni, hogy állíts be egy új jelszót.</p>
                        <div class="code">${tempPassword}</div>
                        <p>Biztonsági okokból ezt a jelszót minél előbb cseréld le a fiók beállításaiban.</p>
                        <p style="text-align:center;"><a class="btn" href="${process.env.SITE_BASE || 'http://localhost:5000'}/login">Bejelentkezés</a></p>
                    </div>
                    <div class="footer">Ha nem Te kérted ezt a jelszó visszaállítást, kérjük vedd fel velünk a kapcsolatot.</div>
                </div>
            </body>
            </html>
        `;

        const text = `Kedves ${name || 'Felhasználó'}\n\nIdeiglenes jelszó: ${tempPassword}\n\nJelentkezz be és állíts be új jelszót.`;

        const mailOptions = {
            from: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            to: email,
            subject: 'Ideiglenes jelszó - CarGO',
            text: text,
            html: html
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (err) {
        console.error('sendTemporaryPasswordEmail error:', err);
        // fallback log
        console.log(`Temporary password for ${email}: ${tempPassword}`);
        return false;
    }
};

const sendEmail = async (to, subject, message) => {
    try {
        // Rackhost SMTP szerver használata
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            to: to,
            subject: subject,
            html: message
        };
        
        const result = await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        return false;
    }
};

module.exports = { generateVerificationCode, sendVerificationEmail, sendEmail, sendTemporaryPasswordEmail };
