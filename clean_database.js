import mysql from 'mysql2/promise';

const cleanDatabase = async () => {
    const connection = await mysql.createConnection({
        host: '10.53.14.50',
        user: 'timesheet_admin',
        password: 'timesheet_admin',
        database: 'timesheet'
    });

    try {
        console.log('🗑️  Starting database cleanup...\n');

        // Delete all best employees records
        const [bestEmpResult] = await connection.query('DELETE FROM best_employees');
        console.log(`✅ Deleted ${bestEmpResult.affectedRows} best employee records`);

        // Delete all notifications
        const [notifResult] = await connection.query('DELETE FROM notifications');
        console.log(`✅ Deleted ${notifResult.affectedRows} notifications`);

        // Delete all tasks
        const [tasksResult] = await connection.query('DELETE FROM tasks');
        console.log(`✅ Deleted ${tasksResult.affectedRows} tasks`);

        // Delete all projects
        const [projectsResult] = await connection.query('DELETE FROM projects');
        console.log(`✅ Deleted ${projectsResult.affectedRows} projects`);

        // Delete all leave requests
        const [leaveResult] = await connection.query('DELETE FROM leave_requests');
        console.log(`✅ Deleted ${leaveResult.affectedRows} leave requests`);

        // Delete all timesheets
        const [timesheetsResult] = await connection.query('DELETE FROM timesheets');
        console.log(`✅ Deleted ${timesheetsResult.affectedRows} timesheets`);

        // Clear managerId references for users that will be deleted
        await connection.query("UPDATE users SET managerId = NULL WHERE email != 'admin@gmail.com'");
        console.log(`✅ Cleared manager references`);

        // Delete all users except admin@gmail.com
        const [usersResult] = await connection.query("DELETE FROM users WHERE email != 'admin@gmail.com'");
        console.log(`✅ Deleted ${usersResult.affectedRows} users (kept admin@gmail.com)`);

        console.log('\n📊 Verifying remaining data:');

        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        console.log(`   Users: ${users[0].count}`);

        const [projects] = await connection.query('SELECT COUNT(*) as count FROM projects');
        console.log(`   Projects: ${projects[0].count}`);

        const [tasks] = await connection.query('SELECT COUNT(*) as count FROM tasks');
        console.log(`   Tasks: ${tasks[0].count}`);

        const [timesheets] = await connection.query('SELECT COUNT(*) as count FROM timesheets');
        console.log(`   Timesheets: ${timesheets[0].count}`);

        const [leaves] = await connection.query('SELECT COUNT(*) as count FROM leave_requests');
        console.log(`   Leave Requests: ${leaves[0].count}`);

        const [notifs] = await connection.query('SELECT COUNT(*) as count FROM notifications');
        console.log(`   Notifications: ${notifs[0].count}`);

        console.log('\n✨ Database cleanup completed successfully!');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await connection.end();
    }
};

cleanDatabase();
