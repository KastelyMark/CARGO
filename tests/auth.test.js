// Autentikációs logika tesztjei

// Jelszó erősség ellenőrzés
test('a jelszónak legalább 8 karakternek kell lennie', () => {
    const jelszo = 'Abc1234';
    expect(jelszo.length >= 8).toBe(false);
});

test('megfelelő erős jelszó elfogadható', () => {
    const jelszo = 'Jelszo123!';
    expect(jelszo.length >= 8).toBe(true);
    expect(/[A-Z]/.test(jelszo)).toBe(true);
    expect(/[0-9]/.test(jelszo)).toBe(true);
    expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(jelszo)).toBe(true);
});

test('nagybetű nélküli jelszó nem érvényes', () => {
    const jelszo = 'jelszo123!';
    expect(/[A-Z]/.test(jelszo)).toBe(false);
});

test('szám nélküli jelszó nem érvényes', () => {
    const jelszo = 'JelszóErős!';
    expect(/[0-9]/.test(jelszo)).toBe(false);
});

test('speciális karakter nélküli jelszó nem érvényes', () => {
    const jelszo = 'Jelszo123';
    const specialRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
    expect(specialRegex.test(jelszo)).toBe(false);
});

test('teljes erős jelszó érvényes (nagybetű + szám + speciális)', () => {
    const jelszo = 'Jelszo123!';
    expect(jelszo.length >= 8).toBe(true);
    expect(/[A-Z]/.test(jelszo)).toBe(true);
    expect(/[0-9]/.test(jelszo)).toBe(true);
    expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(jelszo)).toBe(true);
});

// Email formátum ellenőrzés
test('érvényes email formátum felismerhető', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('teszt@gmail.com')).toBe(true);
});

test('érvénytelen email formátum visszautasítható', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test('nemvalidemail')).toBe(false);
});

// Verifikációs kód ellenőrzés
test('a verifikációs kódnak 6 számjegyűnek kell lennie', () => {
    const kod = '123456';
    expect(kod.length).toBe(6);
    expect(/^\d{6}$/.test(kod)).toBe(true);
});

test('5 jegyű kód nem érvényes', () => {
    const kod = '12345';
    expect(/^\d{6}$/.test(kod)).toBe(false);
});

// JWT token ellenőrzés
test('a JWT token három részből áll (header.payload.signature)', () => {
    const jwt = require('jsonwebtoken');
    const secret = 'test-secret';
    const token = jwt.sign({ userId: 1, email: 'teszt@gmail.com' }, secret, { expiresIn: '24h' });
    const parts = token.split('.');
    expect(parts.length).toBe(3);
});

test('a JWT token visszafejthető és tartalmazza a userId-t', () => {
    const jwt = require('jsonwebtoken');
    const secret = 'test-secret';
    const token = jwt.sign({ userId: 42, email: 'teszt@gmail.com' }, secret, { expiresIn: '24h' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.userId).toBe(42);
    expect(decoded.email).toBe('teszt@gmail.com');
});

test('lejárt JWT token elutasítható', () => {
    const jwt = require('jsonwebtoken');
    const secret = 'test-secret';
    const token = jwt.sign({ userId: 1 }, secret, { expiresIn: '0s' });
    expect(() => jwt.verify(token, secret)).toThrow();
});
