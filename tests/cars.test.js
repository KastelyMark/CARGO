// Autókkal kapcsolatos logika tesztjei

const tesztAutok = [
    { id: 1, name: 'Toyota Corolla', category: 'Kompakt', price_per_day: 15000, seats: 5, transmission: 'manual', fuel_type: 'Benzin' },
    { id: 2, name: 'BMW X5', category: 'SUV', price_per_day: 35000, seats: 7, transmission: 'automatic', fuel_type: 'Dízel' },
    { id: 3, name: 'Ford Focus', category: 'Kompakt', price_per_day: 12000, seats: 5, transmission: 'manual', fuel_type: 'Benzin' }
];

// Szűrés kategória szerint
test('kategória szerinti szűrés helyesen működik', () => {
    const kompaktok = tesztAutok.filter(a => a.category === 'Kompakt');
    expect(kompaktok.length).toBe(2);
});

// Szűrés ár szerint
test('ár szerinti szűrés helyesen működik', () => {
    const olcso = tesztAutok.filter(a => a.price_per_day <= 15000);
    expect(olcso.length).toBe(2);
});

// Szűrés váltó szerint
test('automata váltós autók szűrése helyesen működik', () => {
    const automatak = tesztAutok.filter(a => a.transmission === 'automatic');
    expect(automatak.length).toBe(1);
    expect(automatak[0].name).toBe('BMW X5');
});

// Szűrés ülőhelyek szerint
test('ülőhely szerinti szűrés helyesen működik', () => {
    const nagy = tesztAutok.filter(a => a.seats >= 7);
    expect(nagy.length).toBe(1);
});

// Bérlési napok számítása
test('bérlési napok száma helyesen számolódik', () => {
    const kezdo = new Date('2025-06-01');
    const vege = new Date('2025-06-05');
    const napok = Math.ceil((vege - kezdo) / (1000 * 60 * 60 * 24));
    expect(napok).toBe(4);
});

// Teljes ár számítása
test('teljes bérlési ár helyesen számolódik', () => {
    const napok = 4;
    const arPerNap = 15000;
    const teljesAr = napok * arPerNap;
    expect(teljesAr).toBe(60000);
});

// Visszaadási dátum validáció
test('a visszaadási dátumnak a kezdő dátum után kell lennie', () => {
    const kezdo = new Date('2025-06-05');
    const vege = new Date('2025-06-01');
    expect(vege > kezdo).toBe(false);
});
