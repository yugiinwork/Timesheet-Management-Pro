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

async function checkSchema() {
    try {
        console.log('Checking database schema...\n');

        // Check all tables
        const tables = ['users', 'projects', 'tasks', 'timesheets', 'leave_requests', 'notifications', 'best_employees'];

        for (const table of tables) {
            console.log(`\n=== ${table.toUpperCase()} ===`);
            const [columns] = await pool.query(`DESCRIBE ${table}`);
            console.table(columns.map(col => ({
                Field: col.Field,
                Type: col.Type,
                Null: col.Null,
                Key: col.Key,
                Default: col.Default
            })));
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkSchema();
