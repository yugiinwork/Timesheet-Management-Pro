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

async function checkData() {
    try {
        console.log('Checking timesheets...');
        const [timesheets] = await pool.query('SELECT id, userId, date, status FROM timesheets ORDER BY date DESC LIMIT 10');
        console.log('\nRecent Timesheets:');
        console.table(timesheets);

        console.log('\nChecking leave requests...');
        const [leaves] = await pool.query('SELECT id, user_id, from_date, to_date, status FROM leave_requests ORDER BY from_date DESC LIMIT 10');
        console.log('\nRecent Leave Requests:');
        console.table(leaves);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkData();
