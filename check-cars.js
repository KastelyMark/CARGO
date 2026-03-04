const { initializeDatabase, getPool } = require('./utils/database');

(async () => {
    try {
        await initializeDatabase();
        const pool = getPool();
        
        const [cars] = await pool.execute('SELECT id, name FROM cars');
        
        console.log('\n=== Autók az adatbázisban ===');
        if (cars.length === 0) {
            console.log('NINCS EGYETLEN AUTÓ SEM AZ ADATBÁZISBAN!');
            console.log('\nKérlek, adj hozzá autókat az admin panelen keresztül:');
            console.log('http://localhost:4200/admin');
        } else {
            console.log(`Összesen ${cars.length} autó található:\n`);
            cars.forEach(car => {
                console.log(`ID: ${car.id} - ${car.name}`);
            });
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Hiba:', error);
        process.exit(1);
    }
})();
