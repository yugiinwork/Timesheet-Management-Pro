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

async function fixSchema() {
    try {
        console.log('Fixing database schema...\n');

        // 1. Fix timesheets table
        console.log('Fixing timesheets table...');
        try {
            await pool.query("ALTER TABLE timesheets MODIFY COLUMN inTime TIME NULL");
            console.log('✓ timesheets.inTime now allows NULL');
        } catch (err) {
            console.log('  inTime:', err.message);
        }

        try {
            await pool.query("ALTER TABLE timesheets MODIFY COLUMN outTime TIME NULL");
            console.log('✓ timesheets.outTime now allows NULL');
        } catch (err) {
            console.log('  outTime:', err.message);
        }

        try {
            await pool.query("ALTER TABLE timesheets MODIFY COLUMN status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending'");
            console.log('✓ timesheets.status now has DEFAULT Pending');
        } catch (err) {
            console.log('  status:', err.message);
        }

        // 2. Fix leave_requests table
        console.log('\nFixing leave_requests table...');
        try {
            await pool.query("ALTER TABLE leave_requests MODIFY COLUMN leave_type ENUM('Full Day', 'Half Day') NOT NULL");
            console.log('✓ leave_requests.leave_type is now ENUM');
        } catch (err) {
            console.log('  leave_type:', err.message);
        }

        try {
            await pool.query("ALTER TABLE leave_requests MODIFY COLUMN status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending'");
            console.log('✓ leave_requests.status is now ENUM with DEFAULT');
        } catch (err) {
            console.log('  status:', err.message);
        }

        try {
            await pool.query("ALTER TABLE leave_requests MODIFY COLUMN user_id INT NOT NULL");
            console.log('✓ leave_requests.user_id is now NOT NULL');
        } catch (err) {
            console.log('  user_id:', err.message);
        }

        // 3. Fix best_employees table
        console.log('\nFixing best_employees table...');
        try {
            await pool.query("ALTER TABLE best_employees MODIFY COLUMN type ENUM('MONTH', 'YEAR') NOT NULL");
            console.log('✓ best_employees.type is now ENUM');
        } catch (err) {
            console.log('  type:', err.message);
        }

        try {
            await pool.query("ALTER TABLE best_employees MODIFY COLUMN user_id INT NOT NULL");
            console.log('✓ best_employees.user_id is now NOT NULL');
        } catch (err) {
            console.log('  user_id:', err.message);
        }

        console.log('\n✅ Schema fixes complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixSchema();
