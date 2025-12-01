import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: '10.53.14.50',
    user: 'timesheet_admin',
    password: 'timesheet_admin',
    database: 'timesheet',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function updateRoleEnum() {
    try {
        console.log('Updating users table role ENUM...');
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('Employee', 'Manager', 'Admin', 'Team Leader', 'Superadmin') NOT NULL");
        console.log('✅ Role ENUM updated successfully to include Superadmin');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating role ENUM:', err);
        process.exit(1);
    }
}

updateRoleEnum();
