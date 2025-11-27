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

async function migrate() {
    try {
        console.log('Starting migration...');

        // 1. Best Employees: Modify month column
        try {
            await pool.query("ALTER TABLE best_employees MODIFY COLUMN month VARCHAR(20)");
            console.log('Modified best_employees.month to VARCHAR(20)');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.log('Error modifying best_employees.month (might already be correct):', err.message);
        }

        // 2. Projects: Add missing columns
        const projectCols = [
            "ADD COLUMN teamLeaderId INT",
            "ADD COLUMN teamIds JSON",
            "ADD COLUMN customerName VARCHAR(255)",
            "ADD COLUMN jobName VARCHAR(255)",
            "ADD COLUMN company VARCHAR(255)"
        ];
        for (const col of projectCols) {
            try {
                await pool.query(`ALTER TABLE projects ${col}`);
                console.log(`Added column to projects: ${col}`);
            } catch (err) {
                if (err.code !== 'ER_DUP_FIELDNAME') console.log(`Error adding column to projects (${col}):`, err.message);
            }
        }

        // 3. Tasks: Add missing columns
        const taskCols = [
            "ADD COLUMN importance ENUM('Low', 'Medium', 'High') DEFAULT 'Medium'",
            "ADD COLUMN deadline DATE",
            "ADD COLUMN completionDate DATE",
            "ADD COLUMN assignedTo JSON"
        ];
        for (const col of taskCols) {
            try {
                await pool.query(`ALTER TABLE tasks ${col}`);
                console.log(`Added column to tasks: ${col}`);
            } catch (err) {
                if (err.code !== 'ER_DUP_FIELDNAME') console.log(`Error adding column to tasks (${col}):`, err.message);
            }
        }

        // 4. Users: Add defaults (Modify columns)
        try {
            await pool.query("ALTER TABLE users MODIFY COLUMN profilePictureUrl TEXT DEFAULT 'https://cdn-icons-png.flaticon.com/512/847/847969.png'");
            await pool.query("ALTER TABLE users MODIFY COLUMN bannerUrl TEXT DEFAULT 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop'");
            console.log('Modified users profilePictureUrl and bannerUrl defaults');
        } catch (err) {
            console.log('Error modifying users defaults:', err.message);
        }

        // 5. Leave Requests: Add details and approverId columns
        try {
            await pool.query("ALTER TABLE leave_requests ADD COLUMN details JSON");
            console.log('Added column to leave_requests: details');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.log('Error adding column to leave_requests (details):', err.message);
        }

        try {
            await pool.query("ALTER TABLE leave_requests ADD COLUMN approverId INT");
            console.log('Added column to leave_requests: approverId');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.log('Error adding column to leave_requests (approverId):', err.message);
        }

        // 6. Timesheets: Add projectWork column
        try {
            await pool.query("ALTER TABLE timesheets ADD COLUMN projectWork JSON");
            console.log('Added column to timesheets: projectWork');
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') console.log('Error adding column to timesheets (projectWork):', err.message);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
