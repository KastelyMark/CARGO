const mysql = require('mysql2/promise');

// Database connection config
const dbName = process.env.DB_NAME || 'carl_rent';
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create database if it doesn't exist
async function createDatabaseIfNotExists() {
    const tempConfig = {
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password
    };
    
    const tempConnection = await mysql.createConnection(tempConfig);
    
    try {
        await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    } catch (error) {
        throw error;
    } finally {
        await tempConnection.end();
    }
}

let pool;

// Initialize database
async function initializeDatabase() {
    try {
        await createDatabaseIfNotExists();
        pool = mysql.createPool(dbConfig);
        
        const connection = await pool.getConnection();
        
        // Create tables
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                password VARCHAR(255) NOT NULL,
                verification_code VARCHAR(6) NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                verification_expires TIMESTAMP NULL,
                first_name VARCHAR(50) NULL,
                last_name VARCHAR(50) NULL,
                birth_date DATE NULL,
                address VARCHAR(200) NULL,
                city VARCHAR(50) NULL,
                zip_code VARCHAR(10) NULL,
                country VARCHAR(50) NULL,
                newsletter BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('new', 'read', 'replied') DEFAULT 'new'
            )
        `);
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS cars (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price_per_day DECIMAL(10,2) NOT NULL,
                image_url VARCHAR(500),
                features JSON,
                category ENUM('Gazdaságos', 'kompakt', 'Középkategória', 'Luxus', 'suv', 'sports') DEFAULT 'Gazdaságos',
                transmission ENUM('manual', 'automatic') DEFAULT 'automatic',
                fuel_type ENUM('Benzin', 'Diesel', 'Hybrid', 'Electric') DEFAULT 'Benzin',
                seats INT DEFAULT 5,
                is_available BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS rentals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                car_id INT,
                car_name VARCHAR(100) NOT NULL,
                car_price VARCHAR(50) NOT NULL,
                rental_date DATE NOT NULL,
                return_date DATE NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                customer_email VARCHAR(100) NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE SET NULL
            )
        `);
        
        await populateCarsTable(connection);
        connection.release();
    } catch (error) {
        throw error;
    }
}

function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initializeDatabase() first.');
    }
    return pool;
}

// Populate cars table with 57 cars with REAL car images
async function populateCarsTable(connection) {
    try {
        await connection.execute('DELETE FROM cars');

        const cars = [
            // ECONOMY (10 cars) - Real car images
            { name: 'Volkswagen Polo', description: 'Évjárat: 1996 Hengerűrtartalom: 1390 Teljesítmény: 60 LE Csomagtartó: 245 liter', price_per_day: 2000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/6/67/VW_Polo_front_20090329.jpg', category: 'Gazdaságos', transmission: 'manual', fuel_type: 'benzin', seats: 5 },
            { name: 'Peugeot 206', description: 'Évjárat: 2003 Hengerűrtartalom: 1360 Teljesítmény: 75 LE Csomagtartó: 245 liter', price_per_day: 3000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/2/21/2002_Peugeot_206_LX_1.4_Front.jpg', category: 'Gazdaságos', transmission: 'manual', fuel_type: 'benzin', seats: 5 },
            { name: 'Mini Cooper', description: 'Évjárat: 2002 Hengerűrtartalom: 1598 Teljesítmény: 174 LE Csomagtartó: 350 liter', price_per_day: 2500, image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Mini_One_%28R50%29_%E2%80%93_Frontansicht%2C_12._Juni_2011%2C_D%C3%BCsseldorf.jpg', category: 'Gazdaságos', transmission: 'manual', fuel_type: 'benzin', seats: 4 },
            { name: 'Alfa Romeo Giulietta', description: 'Évjárat: 2012 Hengerűrtartalom: 1368 Teljesítmény: 170 LE Csomagtartó: 350 liter', price_per_day: 4000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/7/76/2011_Alfa_Romeo_Giulietta_Veloce_JTDm-2_2.0_Front.jpg', category: 'Gazdaságos', transmission: 'manual', fuel_type: 'benzin', seats: 5 },
            { name: 'Seat Ibiza', description: 'Évjárat: 2005 Hengerűrtartalom: 1390 Teljesítmény: 75 LE Csomagtartó: 267 liter', price_per_day: 2500, image_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Seat_Ibiza_3-door_silver.jpg', category: 'Gazdaságos', transmission: 'manual', fuel_type: 'benzin', seats: 5 },
            
            
            // COMPACT (10 cars) - Real car images
            { name: 'Volvo V40', description: 'Évjárat: 2014 Hengerűrtartalom: 1969 Teljesítmény: 150 LE Csomagtartó: 335 liter', price_per_day: 10000, image_url: 'https://cdn.euroncap.com/media/6398/volvo_v40_2012_1uncrashed.jpg?mode=crop&width=359&height=235', category: 'kompakt', transmission: 'automatic', fuel_type: 'diesel', seats: 5 },
            { name: 'Toyota Corolla', description: 'Évjárat: 2019 Hengerűrtartalom: 1598 Teljesítmény: 132 LE Csomagtartó: 471 liter', price_per_day: 8000, image_url: 'https://www.autoaddikt.hu/kepek/2024-toyota-corolla-le-usa-florida-teszt-autoaddikt-20.jpg', category: 'kompakt', transmission: 'automatic', fuel_type: 'benzin', seats: 5 },
            { name: 'Volkswagen Golf 6', description: 'Évjárat: 2012 Hengerűrtartalom: 1598 Teljesítmény: 105 LE Csomagtartó: 350 liter', price_per_day: 4000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/VW_Golf_1.6_TDI_Style_%28VI%29_%E2%80%93_Frontansicht%2C_25._Februar_2012%2C_Ratingen.jpg/1200px-VW_Golf_1.6_TDI_Style_%28VI%29_%E2%80%93_Frontansicht%2C_25._Februar_2012%2C_Ratingen.jpg', category: 'kompakt', transmission: 'manual', fuel_type: 'diesel', seats: 5 },
            { name: 'Hyundai i30', description: 'Évjárat: 2014 Hengerűrtartalom: 1396 Teljesítmény: 99 LE Csomagtartó: 600 liter', price_per_day: 4500, image_url: 'https://kocsi-media.hu/948/hyundai-i30-cw-1-4-crdi-comfort-749539_547236_1xl.jpg', category: 'kompakt', transmission: 'automatic', fuel_type: 'benzin', seats: 5 },
            { name: 'Ford Focus', description: 'Évjárat: 2012 Hengerűrtartalom: 1560 Teljesítmény: 116 LE Csomagtartó: 476 liter', price_per_day: 4500, image_url: 'https://img.jofogas.hu/620x620aspect/Ford_Focus_1_6_Ti_Vct_Trend_Plus_Valos_KM_694492716379187.jpg', category: 'kompakt', transmission: 'manual', fuel_type: 'diesel', seats: 5 },
            { name: 'Kia Ceed', description: 'Évjárat: 2019 Hengerűrtartalom: 1353 Teljesítmény: 140 LE Csomagtartó: 395 liter', price_per_day: 6000, image_url: 'https://kocsi-media.hu/1105/kia-ceed-ceed-sw-1-5-t-gdi-gold-361195_571403_1xl.jpg', category: 'kompakt', transmission: 'manual', fuel_type: 'benzin', seats: 5 },
            
            // MIDSIZE (10 cars) - Real car images
            { name: 'Mercedes C-Class', description: 'Évjárat: 2024 Hengerűrtartalom: 1496 Teljesítmény: 170 LE Csomagtartó: 455 liter', price_per_day: 30000, image_url: 'https://www.iihs.org/cdn-cgi/image/width=636/api/ratings/model-year-images/3261/', category: 'Középkategória', transmission: 'automatic', fuel_type: 'benzin', seats: 5 },
            { name: 'Volkswagen Passat', description: 'Évjárat: 2016 Hengerűrtartalom: 1968 Teljesítmény: 150 LE Csomagtartó: 586 liter', price_per_day: 12000, image_url: 'https://upload.wikimedia.org/wikipedia/commons/9/91/VW_Passat_B8_Limousine_2.0_TDI_Highline.JPG', category: 'Középkategória', transmission: 'automatic', fuel_type: 'diesel', seats: 5 },
            { name: 'Skoda Octavia', description: 'Évjárat: 2016 Hengerűrtartalom: 1968 Teljesítmény: 150 LE Csomagtartó: 610 liter', price_per_day: 10000, image_url: 'https://img.jofogas.hu/620x620aspect/Skoda_Octavia_Combi_1_6_CR_TDI_Style_DSG_278192716805168.jpg', category: 'Középkategória', transmission: 'manual', fuel_type: 'diesel', seats: 5 },
            { name: 'Mazda 6', description: 'Évjárat: 2015 Hengerűrtartalom: 2191 Teljesítmény: 175 LE Csomagtartó: 480 liter', price_per_day: 11000, image_url: 'https://cms-assets.autoscout24.com/uaddx06iwzdz/19TLIpjwPxGgTRUfiGyFtm/d8887ab3bf2e09ad97da06bfb1c93f37/mazda-6-l-01.jpg?w=1100', category: 'Középkategória', transmission: 'automatic', fuel_type: 'diesel', seats: 5 },
            { name: 'Lexus IS', description: 'Évjárat: 2006 Hengerűrtartalom: 2231 Teljesítmény: 177 LE Csomagtartó: 378 liter', price_per_day: 7000, image_url: 'https://img.jofogas.hu/620x620aspect/Lexus_Is_220d_Sport_185582716768484.jpg', category: 'Középkategória', transmission: 'automatic', fuel_type: 'petrol', seats: 5 },
            { name: 'Volvo S60', description: 'Évjárat: 2023 Hengerűrtartalom: 1969 Teljesítmény: 250 LE Csomagtartó: 427 liter', price_per_day: 28000, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcRxYay1CYgG8aHLsmqDC1gDRq_o4NvKGjKA&s', category: 'Középkategória', transmission: 'automatic', fuel_type: 'benzin', seats: 5 },

            // LUXURY (10 cars) - Real car images
            { name: 'Audi A8', description: 'Évjárat: 2011 Hengerűrtartalom: 6299 Teljesítmény: 500 LE Csomagtartó: 510 liter', price_per_day: 80000, image_url: 'https://media.carsandbids.com/cdn-cgi/image/width=2080,quality=70/d9b636c2ec84ddc3bc7f2eb32861b39bdd5f9683/photos/KVVdj8NY-yKNHf0J5sU-(edit).jpg?t=171242254321', category: 'luxus', transmission: 'automatic', fuel_type: 'benzin', seats: 4 },
            { name: 'BMW 750i', description: 'Évjárat: 2018 Hengerűrtartalom: 4395 Teljesítmény: 449 LE Csomagtartó: 515 liter', price_per_day: 75000, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTlzmPqoZErEqk01A6DVNvc_6awbpo2PRCtOw&s', category: 'luxus', transmission: 'automatic', fuel_type: 'benzin', seats: 4 },
            { name: 'Mercedes S-Class', description: 'Évjárat: 2015 Hengerűrtartalom: 4663 Teljesítmény: 455 LE Csomagtartó: 530 liter', price_per_day: 80000, image_url: 'https://www.cnet.com/a/img/resize/5461c499ae8f28a8db50d3ed00e28d8ae33884e9/hub/2015/08/05/bb958551-4dc4-4101-8df5-e36c0538e7bd/2015mercedes-benzs550hybrid-005.jpg?auto=webp&width=768', category: 'luxus', transmission: 'automatic', fuel_type: 'benzin', seats: 4 },

            // SUV (10 cars) - Real car images
            { name: 'Ford Kuga', description: 'Évjárat: 2012 Hengerűrtartalom: 2521 Teljesítmény: 200 LE Csomagtartó: 410 liter', price_per_day: 18000, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhyZCmxpWr91g5RIC7t29sUuzO7EVxoaXwDw&s', category: 'suv', transmission: 'automatic', fuel_type: 'benzin', seats: 5 },
            { name: 'Hyundai Tucson', description: 'Évjárat: 2021 Hengerűrtartalom: 1598 Teljesítmény: 136 LE Csomagtartó: 513 liter', price_per_day: 20000, image_url: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTodrV_fE69_7WsZvep9oMNJ7awChgg9LqO4Q&s', category: 'suv', transmission: 'automatic', fuel_type: 'diesel', seats: 5 },
            { name: 'Kia Sportage', description: 'Évjárat: 2015 Hengerűrtartalom: 1995 Teljesítmény: 184 LE Csomagtartó: 564 liter', price_per_day: 11000, image_url: 'https://img.jofogas.hu/620x620aspect/KIA_Sportage_1_7_CRDi_Jubileum_Kamera_Navi_Bor_____960512707423063.jpg', category: 'suv', transmission: 'automatic', fuel_type: 'diesel', seats: 5 },
            { name: 'Volkswagen Touareg', description: 'Évjárat: 2018 Hengerűrtartalom: 2967 Teljesítmény: 286 LE Csomagtartó: 810 liter', price_per_day: 45000, image_url: 'https://cdn.joautok.hu/prod/postings/images/bdc9228f-1f24-4f8a-bb8e-32feba5d38be_0c959853ab745ca2406a5074061b036c7677999760d3a9e278912ead55f2df32.jpg', category: 'suv', transmission: 'automatic', fuel_type: 'diesel', seats: 7 },

            // SPORTS (10 cars) - Real car images
            { name: 'Porsche 718 Cayman', description: 'Évjárat: 2013 Hengerűrtartalom: 2706 Teljesítmény: 275 LE Csomagtartó: 425 liter', price_per_day: 85000, image_url: 'https://supercarsdrive.hu/cdn/shop/files/PorscheCayman__elmenyvezetes_berles_web_15_1_a04585c6-2f9b-4950-bf5a-8ece2bdb1657.png?v=1727514184&width=1445', category: 'sports', transmission: 'manual', fuel_type: 'benzin', seats: 2 },
            { name: 'BMW M4', description: 'Évjárat: 2022 Hengerűrtartalom: 2993 Teljesítmény: 510 LE Csomagtartó: 440 liter', price_per_day: 90000, image_url: 'https://images.prismic.io/exclusiveresorts/521030be-64d1-4525-a2d0-1fbab564218f_BMW+M4+001_ut2z6l-FullBleed_2880x1620.jpg?auto=compress,format&w=2560&q=70', category: 'sports', transmission: 'manual', fuel_type: 'benzin', seats: 4 },
            { name: 'Audi TT RS', description: 'Évjárat: 2009 Hengerűrtartalom: 2480 Teljesítmény: 340 LE Csomagtartó: 290 liter', price_per_day: 60000, image_url: 'https://www.edmunds.com/assets/m/audi/tt-rs/2012/oem/2012_audi_tt-rs_coupe_quattro_fq_oem_1_600.jpg', category: 'sports', transmission: 'automatic', fuel_type: 'benzin', seats: 2 },
            { name: 'Ford Mustang', description: 'Évjárat: 2025 Hengerűrtartalom: 5000 Teljesítmény: 460 LE Csomagtartó: 381 liter', price_per_day: 75000, image_url: 'https://exportimg.hasznaltautocdn.com/2048x1536/6053/21755053/10519920/watermark=0/51e5366e021734a6e5cf0e42022b084a4b6187ded03c51fda55ff5711e0152cc.jpg', category: 'sports', transmission: 'automatic', fuel_type: 'benzin', seats: 4 },
        ];

        for (const car of cars) {
            await connection.execute(`
                INSERT INTO cars (name, description, price_per_day, image_url, features, category, transmission, fuel_type, seats)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                car.name,
                car.description,
                car.price_per_day,
                car.image_url,
                JSON.stringify(['Klíma', 'Bluetooth', 'Parkolóradar', 'USB port']),
                car.category,
                car.transmission,
                car.fuel_type,
                car.seats
            ]);
        }

        console.log('✅ Cars table populated with 57 cars with REAL car images');
    } catch (error) {
        console.error('Error populating cars table:', error);
    }
}

module.exports = { getPool, initializeDatabase };
