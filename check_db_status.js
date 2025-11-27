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

async function checkDatabase() {
    try {
        console.log('Checking database content...');

        const tables = ['users', 'projects', 'tasks', 'timesheets', 'leave_requests', 'notifications'];

        for (const table of tables) {
            const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            const count = countResult[0].count;

            console.log(`\n--- ${table.toUpperCase()} (${count} records) ---`);

            if (count > 0) {
                const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 1`);
                console.log('Latest entry:', rows[0]);
            } else {
                console.log('No records found.');
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('Error checking database:', err);
        process.exit(1);
    }
}

checkDatabase();
