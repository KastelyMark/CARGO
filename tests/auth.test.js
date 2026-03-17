// Autentikációs logika tesztjei

// Jelszó hossz ellenőrzés
test('a jelszónak legalább 6 karakternek kell lennie', () => {
    const jelszo = 'abc';
    expect(jelszo.length >= 6).toBe(false);
});

test('megfelelő hosszú jelszó elfogadható', () => {
    const jelszo = 'Jelszo123';
    expect(jelszo.length >= 6).toBe(true);
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

// Token generálás ellenőrzés
test('a token base64 formátumban generálódik', () => {
    const userId = 1;
    const email = 'teszt@gmail.com';
    const token = Buffer.from(`${userId}:${email}:${Date.now()}`).toString('base64');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
});

test('a token visszafejthető és tartalmazza az emailt', () => {
    const email = 'teszt@gmail.com';
    const token = Buffer.from(`1:${email}:12345`).toString('base64');
    const decoded = Buffer.from(token, 'base64').toString();
    expect(decoded).toContain(email);
});
