// Migration script to add total_days and total_price to existing rentals
const { getPool, initializeDatabase } = require('./utils/database');

async function migrateRentals() {
    try {
        console.log('Starting rental migration...');
        
        await initializeDatabase();
        const pool = getPool();
        
        // Check if columns exist, if not add them
        try {
            await pool.execute(`
                ALTER TABLE rentals 
                ADD COLUMN IF NOT EXISTS total_days INT NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) NOT NULL DEFAULT 0
            `);
            console.log('✓ Columns added successfully');
        } catch (error) {
            // Try alternative syntax for older MySQL versions
            try {
                await pool.execute(`ALTER TABLE rentals ADD COLUMN total_days INT NOT NULL DEFAULT 1`);
            } catch (e) {
                console.log('total_days column may already exist');
            }
            
            try {
                await pool.execute(`ALTER TABLE rentals ADD COLUMN total_price DECIMAL(10,2) NOT NULL DEFAULT 0`);
            } catch (e) {
                console.log('total_price column may already exist');
            }
        }
        
        // Update existing rentals with calculated values
        const [rentals] = await pool.execute('SELECT * FROM rentals WHERE total_days = 0 OR total_price = 0');
        
        console.log(`Found ${rentals.length} rentals to update`);
        
        for (const rental of rentals) {
            const rentalDate = new Date(rental.rental_date);
            const returnDate = new Date(rental.return_date);
            const diffTime = returnDate - rentalDate;
            const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Extract numeric price from car_price string
            const priceMatch = rental.car_price.match(/[\d,]+/);
            const pricePerDay = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
            const totalPrice = totalDays * pricePerDay;
            
            await pool.execute(
                'UPDATE rentals SET total_days = ?, total_price = ? WHERE id = ?',
                [totalDays, totalPrice, rental.id]
            );
            
            console.log(`✓ Updated rental #${rental.id}: ${totalDays} days, ${totalPrice} Ft`);
        }
        
        console.log('✓ Migration completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateRentals();
