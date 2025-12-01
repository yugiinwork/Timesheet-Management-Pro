import mysql from 'mysql2/promise';

const resetSystem = async () => {
    const connection = await mysql.createConnection({
        host: '10.53.14.50',
        user: 'timesheet_admin',
        password: 'timesheet_admin',
        database: 'timesheet'
    });

    try {
        console.log('🗑️  Resetting system to fresh state...\n');

        // Delete all dependent tables first
        await connection.query('DELETE FROM best_employees');
        await connection.query('DELETE FROM notifications');
        await connection.query('DELETE FROM tasks');
        await connection.query('DELETE FROM projects'); // Projects reference users (manager, team leader)
        await connection.query('DELETE FROM leave_requests');
        await connection.query('DELETE FROM timesheets');

        // Clear self-references in users table (managerId) to avoid foreign key constraints
        await connection.query("UPDATE users SET managerId = NULL");

        // Delete ALL users
        const [usersResult] = await connection.query("DELETE FROM users");
        console.log(`✅ Deleted ${usersResult.affectedRows} users (including admin)`);

        console.log('\n✨ System reset complete! Ready for first-time setup.');
    } catch (error) {
        console.error('❌ Error during reset:', error);
    } finally {
        await connection.end();
    }
};

resetSystem();
