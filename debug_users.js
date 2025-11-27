
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

(async () => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, managerId FROM users');
        console.log('--- USERS ---');
        console.table(users);

        const [projects] = await pool.query('SELECT id, name, managerId, teamLeaderId, teamIds FROM projects');
        console.log('--- PROJECTS ---');
        console.log(JSON.stringify(projects, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
})();
