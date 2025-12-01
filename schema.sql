-- Create Database
CREATE DATABASE IF NOT EXISTS timesheet;
USE timesheet;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  dob DATE,
  role ENUM('Employee', 'Manager', 'Admin', 'Team Leader', 'Superadmin') NOT NULL,
  managerId INT,
  phone VARCHAR(20),
  address TEXT,
  designation VARCHAR(255),
  profilePictureUrl LONGTEXT DEFAULT 'https://cdn-icons-png.flaticon.com/512/847/847969.png',
  bannerUrl LONGTEXT DEFAULT 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop',
  company VARCHAR(255),
  isActive BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (managerId) REFERENCES users(id) ON DELETE SET NULL
);

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimatedHours INT DEFAULT 0,
  actualHours INT DEFAULT 0,
  managerId INT,
  status ENUM('Not Started', 'In Progress', 'On Hold', 'Completed') DEFAULT 'Not Started',
  teamLeaderId INT,
  teamIds JSON, -- Stores array of user IDs as JSON
  customerName VARCHAR(255),
  jobName VARCHAR(255),
  company VARCHAR(255),
  FOREIGN KEY (managerId) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (teamLeaderId) REFERENCES users(id) ON DELETE SET NULL
);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status ENUM('To Do', 'In Progress', 'Done') DEFAULT 'To Do',
  importance ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
  deadline DATE,
  completionDate DATE,
  assignedTo JSON,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

-- Timesheets Table
CREATE TABLE IF NOT EXISTS timesheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  date DATE NOT NULL,
  inTime TIME,
  outTime TIME,
  projectWork JSON,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approverId INT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approverId) REFERENCES users(id) ON DELETE SET NULL
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  leave_type ENUM('Full Day', 'Half Day') NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  approverId INT,
  details JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approverId) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  linkTo VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  isRead BOOLEAN DEFAULT FALSE,
  dismissed BOOLEAN DEFAULT FALSE,
  isAnnouncement BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Best Employees Table
CREATE TABLE IF NOT EXISTS best_employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('MONTH', 'YEAR') NOT NULL,
  month VARCHAR(20),
  year INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
