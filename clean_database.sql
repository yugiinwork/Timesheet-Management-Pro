-- Clean Database Script
-- This script deletes all data except the super admin (admin@gmail.com)

-- Delete all best employees records
DELETE FROM best_employees;

-- Delete all notifications
DELETE FROM notifications;

-- Delete all tasks
DELETE FROM tasks;

-- Delete all projects
DELETE FROM projects;

-- Delete all leave requests
DELETE FROM leave_requests;

-- Delete all timesheets
DELETE FROM timesheets;

-- Delete all users except admin@gmail.com
DELETE FROM users WHERE email != 'admin@gmail.com';

-- Verify remaining data
SELECT 'Users remaining:' as info, COUNT(*) as count FROM users;
SELECT 'Projects remaining:' as info, COUNT(*) as count FROM projects;
SELECT 'Tasks remaining:' as info, COUNT(*) as count FROM tasks;
SELECT 'Timesheets remaining:' as info, COUNT(*) as count FROM timesheets;
SELECT 'Leave requests remaining:' as info, COUNT(*) as count FROM leave_requests;
SELECT 'Notifications remaining:' as info, COUNT(*) as count FROM notifications;
SELECT 'Best employees remaining:' as info, COUNT(*) as count FROM best_employees;
