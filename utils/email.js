const nodemailer = require('nodemailer');

// EMAIL KONFIGURÁCIÓ - RACKHOST SMTP

const EMAIL_CONFIG = {
    // Rackhost SMTP beállítások
    SMTP_HOST: 'smtp.rackhost.hu',
    SMTP_PORT: 465,
    SMTP_SECURE: true, // true for port 465
    SMTP_USER: 'cargo@kemenesklima.hu',
    SMTP_PASS: 'cargo2026'
};


const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


const createTransporter = () => {
    // Rackhost SMTP konfiguráció (valódi email küldéshez)
    const transporter = nodemailer.createTransport({
        host: EMAIL_CONFIG.SMTP_HOST,
        port: EMAIL_CONFIG.SMTP_PORT,
        secure: EMAIL_CONFIG.SMTP_SECURE,
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
        
        console.log(`Temporary password for ${email}: ${tempPassword}`);
        return false;
    }
};

const sendEmail = async (to, subject, message) => {
    try {
        
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

// Bérlési visszaigazoló email küldése
const sendRentalConfirmationEmail = async (email, name, carName, carPrice, rentalDate, returnDate, totalDays, totalPrice) => {
    try {
        const transporter = createTransporter();
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; padding: 20px; }
                    .email-wrapper { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
                    .header h1 { font-size: 28px; margin-bottom: 10px; font-weight: 700; }
                    .header p { font-size: 16px; opacity: 0.95; }
                    .logo { width: 60px; height: 60px; background: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px; font-size: 30px; }
                    .content { padding: 40px 30px; }
                    .greeting { font-size: 18px; color: #2c3e50; margin-bottom: 20px; font-weight: 600; }
                    .message { font-size: 15px; color: #555; line-height: 1.8; margin-bottom: 30px; }
                    .rental-card { background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 5px solid #667eea; }
                    .rental-card h3 { color: #2c3e50; font-size: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
                    .rental-info { display: grid; gap: 15px; }
                    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.08); }
                    .info-row:last-child { border-bottom: none; }
                    .info-label { color: #6c757d; font-size: 14px; font-weight: 500; }
                    .info-value { color: #2c3e50; font-size: 15px; font-weight: 600; }
                    .price-highlight { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; }
                    .price-highlight .label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
                    .price-highlight .amount { font-size: 36px; font-weight: 700; }
                    .next-steps { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0; }
                    .next-steps h4 { color: #856404; margin-bottom: 15px; font-size: 16px; }
                    .next-steps ul { list-style: none; padding: 0; }
                    .next-steps li { color: #856404; padding: 8px 0; padding-left: 25px; position: relative; font-size: 14px; }
                    .next-steps li:before { content: '✓'; position: absolute; left: 0; color: #ffc107; font-weight: bold; }
                    .contact-box { background: #e7f3ff; padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; }
                    .contact-box p { color: #004085; margin: 8px 0; font-size: 14px; }
                    .contact-box strong { font-size: 16px; }
                    .footer { background: #2c3e50; color: white; padding: 30px; text-align: center; }
                    .footer p { margin: 8px 0; font-size: 14px; opacity: 0.9; }
                    .social-links { margin-top: 20px; }
                    .social-links a { display: inline-block; margin: 0 10px; color: white; text-decoration: none; font-size: 20px; }
                    @media (max-width: 600px) {
                        .email-wrapper { border-radius: 0; }
                        .content { padding: 25px 20px; }
                        .price-highlight .amount { font-size: 28px; }
                    }
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <div class="logo">🚗</div>
                        <h1>CARGO</h1>
                        <p>Bérlési visszaigazolás</p>
                    </div>
                    
                    <div class="content">
                        <p class="greeting">Kedves ${name}!</p>
                        
                        <p class="message">
                            Köszönjük, hogy a CARGO autóbérlő szolgáltatását választotta! 
                            Örömmel értesítjük, hogy bérlési kérelmét sikeresen fogadtuk.
                        </p>
                        
                        <div class="rental-card">
                            <h3>📋 Bérlés részletei</h3>
                            <div class="rental-info">
                                <div class="info-row">
                                    <span class="info-label">🚙 Autó</span>
                                    <span class="info-value">${carName}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">📅 Bérlés kezdete</span>
                                    <span class="info-value">${new Date(rentalDate).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">📅 Visszaadás</span>
                                    <span class="info-value">${new Date(returnDate).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">⏱️ Bérlési időszak</span>
                                    <span class="info-value">${totalDays} nap</span>
                                </div>
                                <div class="info-row">
                                    <span class="info-label">💰 Napi díj</span>
                                    <span class="info-value">${new Intl.NumberFormat('hu-HU').format(carPrice)} Ft</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="price-highlight">
                            <div class="label">Teljes bérleti díj</div>
                            <div class="amount">${new Intl.NumberFormat('hu-HU').format(totalPrice)} Ft</div>
                        </div>
                        
                        <div class="next-steps">
                            <h4>⚡ Következő lépések</h4>
                            <ul>
                                <li>Munkatársunk 24 órán belül felveszi Önnel a kapcsolatot</li>
                                <li>Egyeztetjük a bérlési feltételeket és a fizetési módot</li>
                                <li>Email-ben elküldjük a bérlési szerződést</li>
                                <li>Megbeszéljük az autó átvételének pontos időpontját és helyét</li>
                            </ul>
                        </div>
                        
                        <div class="contact-box">
                            <p><strong>Sürgős kérdése van?</strong></p>
                            <p>📞 Telefonszám: <strong>+36 1 234 5678</strong></p>
                            <p>📧 Email: <strong>info@cargo.hu</strong></p>
                            <p>🕐 Hétfő-Péntek: 8:00-18:00, Szombat: 9:00-14:00</p>
                        </div>
                        
                        <p class="message" style="margin-top: 30px;">
                            Várjuk szeretettel, és kellemes utazást kívánunk!
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>CARGO Autóbérlés</strong></p>
                        <p>1234 Budapest, Példa utca 12.</p>
                        <p>info@cargo.hu | +36 1 234 5678</p>
                        <div class="social-links">
                            <a href="#">📘</a>
                            <a href="#">📷</a>
                            <a href="#">🐦</a>
                        </div>
                        <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                            © ${new Date().getFullYear()} CARGO. Minden jog fenntartva.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            to: email,
            subject: '🚗 Bérlési visszaigazolás - CARGO',
            html: html
        };
        
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('sendRentalConfirmationEmail error:', error);
        return false;
    }
};

// Admin értesítő email bérlésről
const sendRentalNotificationEmail = async (customerName, customerEmail, carName, carPrice, rentalDate, returnDate, totalDays, totalPrice) => {
    try {
        const transporter = createTransporter();
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
                    .header { background: #dc3545; color: white; padding: 25px; text-align: center; }
                    .content { padding: 30px; }
                    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .details p { margin: 10px 0; }
                    .highlight { background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
                    .footer { background: #2c3e50; color: white; padding: 20px; text-align: center; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔔 Új bérlési igény érkezett!</h2>
                    </div>
                    <div class="content">
                        <div class="alert">
                            <strong>⚠️ Azonnali intézkedés szükséges!</strong><br>
                            Új ügyfél bérlési kérelmet nyújtott be. Kérjük, 24 órán belül vegye fel a kapcsolatot!
                        </div>
                        
                        <h3>👤 Ügyfél adatai</h3>
                        <div class="details">
                            <p><strong>Név:</strong> ${customerName}</p>
                            <p><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
                            <p><strong>Igénylés időpontja:</strong> ${new Date().toLocaleString('hu-HU')}</p>
                        </div>
                        
                        <h3>🚗 Bérlés részletei</h3>
                        <div class="details">
                            <p><strong>Autó:</strong> ${carName}</p>
                            <p><strong>Bérlés kezdete:</strong> ${new Date(rentalDate).toLocaleDateString('hu-HU')}</p>
                            <p><strong>Visszaadás:</strong> ${new Date(returnDate).toLocaleDateString('hu-HU')}</p>
                            <p><strong>Időtartam:</strong> ${totalDays} nap</p>
                            <p><strong>Napi díj:</strong> ${new Intl.NumberFormat('hu-HU').format(carPrice)} Ft</p>
                        </div>
                        
                        <div class="highlight">
                            <h3 style="margin: 0 0 10px 0;">💰 Teljes bérleti díj</h3>
                            <p style="font-size: 28px; font-weight: bold; color: #dc3545; margin: 0;">
                                ${new Intl.NumberFormat('hu-HU').format(totalPrice)} Ft
                            </p>
                        </div>
                        
                        <p style="margin-top: 25px;">
                            <strong>Teendők:</strong><br>
                            1. Vegye fel a kapcsolatot az ügyféllel<br>
                            2. Egyeztesse a bérlési feltételeket<br>
                            3. Küldje el a szerződést<br>
                            4. Rögzítse az átvétel időpontját
                        </p>
                    </div>
                    <div class="footer">
                        CARGO Admin Rendszer - Automatikus értesítés
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const mailOptions = {
            from: process.env.SMTP_USER || EMAIL_CONFIG.SMTP_USER,
            to: process.env.ADMIN_EMAIL || 'admin@cargo.hu',
            subject: '🔔 Új bérlési igény - CARGO Admin',
            html: html
        };
        
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('sendRentalNotificationEmail error:', error);
        return false;
    }
};

module.exports = { 
    generateVerificationCode, 
    sendVerificationEmail, 
    sendEmail, 
    sendTemporaryPasswordEmail,
    sendRentalConfirmationEmail,
    sendRentalNotificationEmail
};
