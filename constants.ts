import { Role, User, Timesheet, LeaveRequest, Project, Task, Notification } from './types';

export const USERS: User[] = [
  { 
    id: 6, 
    name: 'Admin User', 
    email: 'admin@gmail.com', 
    role: Role.ADMIN, 
    password: 'admin', 
    employeeId: 'A001', 
    dob: '1970-01-01', 
    phone: '999-999-9999', 
    address: '1 Admin Way, System City', 
    designation: 'Head Administrator', 
    profilePictureUrl: 'https://i.pravatar.cc/150?img=6',
    company: 'Timesheet Pro Inc.'
  },
];

export const TIMESHEETS: Timesheet[] = [];

export const LEAVE_REQUESTS: LeaveRequest[] = [];

export const PROJECTS: Project[] = [];

export const TASKS: Task[] = [];

export const NOTIFICATIONS: Notification[] = [];