export enum Role {
  EMPLOYEE = 'Employee',
  MANAGER = 'Manager',
  ADMIN = 'Admin',
  TEAM_LEADER = 'Team Leader',
  SUPERADMIN = 'Superadmin',
}

export enum Status {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  managerId?: number;
  // New Fields
  password?: string; // In a real app, this would be a hash
  employeeId: string;
  dob: string;
  phone: string;
  address: string;
  designation: string;
  profilePictureUrl?: string; // base64 or URL
  bannerUrl?: string; // base64 or URL
  company?: string;
}

export interface WorkEntry {
  description: string;
  hours: number;
}

export interface ProjectWork {
  projectId: number;
  workEntries: WorkEntry[];
}

export interface Timesheet {
  id: number;
  userId: number;
  date: string;
  inTime: string;
  outTime: string;
  projectWork: ProjectWork[];
  status: Status;
  approverId?: number;
}

export type LeaveType = 'Full Day' | 'Half Day';
export type HalfDaySession = 'First Half' | 'Second Half';

export interface LeaveEntry {
  date: string;
  leaveType: LeaveType;
  halfDaySession?: HalfDaySession;
}

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveEntries: LeaveEntry[];
  reason: string;
  status: Status;
  approverId?: number;
}

export enum ProjectStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  ON_HOLD = 'On Hold',
  COMPLETED = 'Completed',
}

export interface Project {
  id: number;
  name: string;
  description: string;
  managerId: number;
  teamLeaderId?: number;
  teamIds: number[];
  customerName: string;
  jobName: string;
  estimatedHours: number;
  actualHours: number;
  company: string;
  status: ProjectStatus;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done';
export enum TaskImportance {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  assignedTo: number[];
  status: TaskStatus;
  importance: TaskImportance;
  deadline?: string;
  completionDate?: string;
}

export type View = 'DASHBOARD' | 'PROFILE' | 'TIMESHEETS' | 'LEAVE' | 'TEAM_TIMESHEETS' | 'TEAM_LEAVE' | 'PROJECTS' | 'USERS' | 'TASKS' | 'EMPLOYEE_DETAIL';

// For persistent, user-specific notifications
export interface Notification {
  id: number;
  userId: number; // The user who should receive the notification
  title: string;
  message: string;
  read: boolean;
  linkTo?: View;
  createdAt: string; // ISO string
  dismissed: boolean;
  isAnnouncement?: boolean;
}

// For ephemeral, on-screen toasts
export interface ToastNotification {
  id: number;
  message: string;
  title?: string;
}
