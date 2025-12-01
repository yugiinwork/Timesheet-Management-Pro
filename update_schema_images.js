import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: '10.53.14.50',
    user: 'timesheet_admin',
    password: 'timesheet_admin',
    database: 'timesheet',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function updateSchema() {
    try {
        console.log('Updating schema for profilePictureUrl and bannerUrl...');

        // Update profilePictureUrl to LONGTEXT
        await pool.query('ALTER TABLE users MODIFY COLUMN profilePictureUrl LONGTEXT');
        console.log('Updated profilePictureUrl to LONGTEXT');

        // Update bannerUrl to LONGTEXT
        await pool.query('ALTER TABLE users MODIFY COLUMN bannerUrl LONGTEXT');
        console.log('Updated bannerUrl to LONGTEXT');

        console.log('Schema update complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
