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

async function updateAdminCompany() {
    try {
        const [result] = await pool.query(
            "UPDATE users SET company = 'Default Company' WHERE email = 'admin@gmail.com'"
        );
        console.log('✅ Admin user company updated successfully!');
        console.log(`Rows affected: ${result.affectedRows}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error updating admin user:', err);
        process.exit(1);
    }
}

updateAdminCompany();
