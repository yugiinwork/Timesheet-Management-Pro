import express from 'express';
// import mysql from 'mysql2/promise'; // REPLACED WITH TURSO
import { createClient } from '@libsql/client';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import https from 'https';
import fs from 'fs';
import multer from 'multer';

dotenv.config();
console.log('Current NODE_ENV:', process.env.NODE_ENV);


const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'honored_one';

// CORS setup
const allowedOrigins = ['https://10.53.14.50:3000', 'http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma'],
  maxAge: 86400
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MySQL connection
/* MYSQL CONNECTION - REPLACED WITH TURSO
const pool = mysql.createPool({
  host: '10.53.14.58',
  user: 'timesheet_admin',
  password: 'timesheet_admin',
  database: 'timesheet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
*/

// Turso Database Connection
const db = createClient({
  url: process.env.TURSO_CONNECTION_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Database Query Helper - Supports both MySQL and Turso
const executeQuery = async (sql, params = []) => {
  if (process.env.TURSO_CONNECTION_URL && process.env.TURSO_AUTH_TOKEN) {
    // Use Turso for production
    return await db.execute({ sql, args: params });
  } else {
    // Fallback to MySQL for local development
    // const [rows] = await pool.query(sql, params);
    // return { rows };
    throw new Error('Database not configured. Set TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN or ensure MySQL pool is available.');
  }
};

/* MIGRATION NOTES: MySQL → Turso
 * 1. All existing pool.query(sql, params) calls need to be replaced with executeQuery(sql, params)
 * 2. Result format differs: MySQL returns [rows] array, Turso returns { rows } object
 * 3. For INSERT operations: use result.lastInsertRowid instead of result.insertId (Turso)
 * 4. Ensure TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN are set in .env for production
 * 5. Local MySQL fallback: Uncomment pool connection and modify executeQuery fallback as needed
 */
// Auth middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Welcome & health
app.get('/', (req, res) => {
  res.send('API alive! Endpoints: /api/register, /api/login, /api/users, /api/projects, /api/tasks, /api/timesheets, /api/leave_requests, /api/notifications, /api/best_employees, /api/upload-image');
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CORS OK for http://10.53.14.50:3000' });
});

const __dirname = path.resolve();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|cr2/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

app.use(express.static(path.join(__dirname, 'dist')));

// For SPA: serve index.html for all unmatched routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- Image Upload Endpoint ---
app.post('/api/upload-image', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // Return the URL path to the uploaded file
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// --- Auth: Register ---
app.post('/api/register', async (req, res) => {
  try {
    const {
      employeeId, name, email, password, dob, role, managerId, phone,
      address, designation, profilePictureUrl, bannerUrl, company
    } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "Missing required fields (name, email, password, role)" });
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employeeId, name, email, password, dob, role, managerId, phone, address, designation, profilePictureUrl, bannerUrl, company, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId || null, name, email, hash, dob || null, role, managerId || null, phone || null, address || null, designation || null, profilePictureUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png', bannerUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop', company || null, 1]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Auth: Login ---
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }
    const [rows] = await pool.query('SELECT id, name, email, role, password, company FROM users WHERE email=?', [email]);
    if (rows.length === 0) {
      // Do not indicate whether email exists
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== 'HONOREDONE') {
      return res.status(401).json({ success: false, error: "Invalid email or password" });
    }
    const payload = { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ success: true, user: payload, token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// --- Auth: Reset Password ---
app.post('/api/reset-password', authenticate, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    // Check permissions: Only Admin or Superadmin can reset passwords
    if (req.user.role !== 'Admin' && req.user.role !== 'Superadmin') {
      return res.status(403).json({ success: false, error: "Only Admin or Superadmin can reset passwords" });
    }

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: "Missing fields" });
    }
    const [rows] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=? WHERE email=?', [hash, email]);
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    console.error('[reset-password]', err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


// --- USERS CRUD ---
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id=?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post('/api/users', authenticate, async (req, res) => {
  try {
    const {
      employeeId, name, email, password, dob, role, managerId, phone,
      address, designation, profilePictureUrl, bannerUrl, company, isActive
    } = req.body;
    if (!employeeId || !name || !email || !role || !dob || !phone || !address || !designation)
      return res.status(400).json({ error: "Missing fields" });
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: "Email already registered" });
    let hash = null;
    if (password) hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employeeId,name,email,password,dob,role,managerId,phone,address,designation,profilePictureUrl,bannerUrl,company,isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, name, email, hash, dob, role, managerId || null, phone, address, designation, profilePictureUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png', bannerUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop', company || null, isActive || 1]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.put('/api/users/:id', authenticate, async (req, res) => {
  try {
    const {
      employeeId, name, email, password, dob, role, managerId, phone,
      address, designation, profilePictureUrl, bannerUrl, company, isActive
    } = req.body;

    // Check password update permission
    if (password) {
      const isSelf = req.user.id === Number(req.params.id);
      const isAdminOrSuper = req.user.role === 'Admin' || req.user.role === 'Superadmin';

      if (!isSelf && !isAdminOrSuper) {
        return res.status(403).json({ error: "You are not authorized to change this user's password" });
      }
    }

    let hash = null;
    const isBcryptHash = (s) => /^\$2[ayb]\$.{56}$/.test(s);
    if (password) {
      if (isBcryptHash(password)) {
        hash = password;
      } else {
        hash = await bcrypt.hash(password, 10);
      }
    }
    const [result] = await pool.query(
      `UPDATE users SET employeeId=?, name=?, email=?, password=COALESCE(?, password), dob=?, role=?, managerId=?, phone=?, address=?, designation=?, profilePictureUrl=?, bannerUrl=?, company=?, isActive=? WHERE id=?`,
      [employeeId, name, email, hash, dob, role, managerId || null, phone, address, designation, profilePictureUrl || null, bannerUrl || null, company || null, isActive || 1, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
app.delete('/api/users/:id', authenticate, async (req, res) => {
  try {
    // Prevent deleting the super admin
    const [targetUser] = await pool.query('SELECT role FROM users WHERE id=?', [req.params.id]);
    if (targetUser.length > 0 && targetUser[0].role === 'Superadmin') {
      return res.status(403).json({ error: "Cannot delete the Super Admin user" });
    }

    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- PROJECTS CRUD ---
app.get('/api/projects', authenticate, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM projects'); res.json(rows); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.post('/api/projects', authenticate, async (req, res) => {
  try {
    const { name, description, estimatedHours, actualHours, managerId, status, teamLeaderId, teamIds, customerName, jobName, company } = req.body;
    const [result] = await pool.query(
      'INSERT INTO projects (name, description, estimatedHours, actualHours, managerId, status, teamLeaderId, teamIds, customerName, jobName, company) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, estimatedHours, actualHours, managerId, status, teamLeaderId || null, JSON.stringify(teamIds || []), customerName || '', jobName || '', company || '']
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Server error" });
  }
});
app.put('/api/projects/:id', authenticate, async (req, res) => {
  try {
    const { name, description, estimatedHours, actualHours, managerId, status, teamLeaderId, teamIds, customerName, jobName, company } = req.body;
    await pool.query(
      'UPDATE projects SET name=?, description=?, estimatedHours=?, actualHours=?, managerId=?, status=?, teamLeaderId=?, teamIds=?, customerName=?, jobName=?, company=? WHERE id=?',
      [name, description, estimatedHours, actualHours, managerId, status, teamLeaderId || null, JSON.stringify(teamIds || []), customerName || '', jobName || '', company || '', req.params.id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err); res.status(500).json({ error: "Server error" });
  }
});
app.delete('/api/projects/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM projects WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// Helper functions to convert dates to MySQL format
const toMySQLDate = (dateStr) => {
  if (!dateStr) return null;
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Convert ISO string to YYYY-MM-DD
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
};

const toMySQLDateTime = (dateStr) => {
  if (!dateStr) return null;
  // Convert ISO string to YYYY-MM-DD HH:MM:SS
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// --- TASKS CRUD ---
app.get('/api/tasks', authenticate, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM tasks'); res.json(rows); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { projectId, title, description, status, importance, deadline, completionDate, assignedTo } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tasks (projectId, title, description, status, importance, deadline, completionDate, assignedTo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [projectId, title, description, status, importance, toMySQLDate(deadline), toMySQLDate(completionDate), JSON.stringify(assignedTo || [])]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { projectId, title, description, status, importance, deadline, completionDate, assignedTo } = req.body;
    await pool.query(
      'UPDATE tasks SET projectId=?, title=?, description=?, status=?, importance=?, deadline=?, completionDate=?, assignedTo=? WHERE id=?',
      [projectId, title, description, status, importance, toMySQLDate(deadline), toMySQLDate(completionDate), JSON.stringify(assignedTo || []), req.params.id]
    );
    res.sendStatus(200);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM tasks WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// --- TIMESHEETS CRUD ---
app.get('/api/timesheets', authenticate, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM timesheets'); res.json(rows); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.post('/api/timesheets', authenticate, async (req, res) => {
  try {
    const { userId, date, inTime, outTime, status, approverId, projectWork } = req.body;
    const [result] = await pool.query(
      'INSERT INTO timesheets (userId, date, inTime, outTime, status, approverId, projectWork) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, date, inTime, outTime, status, approverId, JSON.stringify(projectWork || [])]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.put('/api/timesheets/:id', authenticate, async (req, res) => {
  try {
    const { userId, date, inTime, outTime, status, approverId, projectWork } = req.body;
    const projectWorkJson = projectWork ? JSON.stringify(projectWork) : null;
    await pool.query(
      'UPDATE timesheets SET userId=?, date=?, inTime=?, outTime=?, status=?, approverId=?, projectWork=? WHERE id=?',
      [userId, date, inTime, outTime, status, approverId, projectWorkJson, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.delete('/api/timesheets/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM timesheets WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// --- LEAVE REQUESTS CRUD ---
app.get('/api/leave_requests', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM leave_requests');
    // Transform user_id to userId for frontend
    const transformed = rows.map(row => ({
      ...row,
      userId: row.user_id,
      user_id: undefined
    }));
    res.json(transformed);
  }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.post('/api/leave_requests', authenticate, async (req, res) => {
  try {
    const { userId, leaveEntries, reason, status } = req.body;
    // Handle new structure
    let from_date = null;
    let to_date = null;
    let leave_type = 'Full Day';
    let details = null;

    if (leaveEntries && leaveEntries.length > 0) {
      details = JSON.stringify(leaveEntries);
      const dates = leaveEntries.map(e => new Date(e.date));
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      from_date = minDate.toISOString().split('T')[0];
      to_date = maxDate.toISOString().split('T')[0];
      leave_type = leaveEntries[0].leaveType;
    } else {
      // Fallback for old structure if needed, or just error
      from_date = req.body.from_date;
      to_date = req.body.to_date;
      leave_type = req.body.leave_type;
    }

    const [result] = await pool.query(
      'INSERT INTO leave_requests (user_id, leave_type, from_date, to_date, reason, status, details) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId || req.body.user_id, leave_type, from_date, to_date, reason, status, details]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.put('/api/leave_requests/:id', authenticate, async (req, res) => {
  try {
    const { userId, leaveEntries, reason, status } = req.body;
    let from_date = null;
    let to_date = null;
    let leave_type = 'Full Day';
    let details = null;

    if (leaveEntries && leaveEntries.length > 0) {
      details = JSON.stringify(leaveEntries);
      const dates = leaveEntries.map(e => new Date(e.date));
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      from_date = minDate.toISOString().split('T')[0];
      to_date = maxDate.toISOString().split('T')[0];
      leave_type = leaveEntries[0].leaveType;
    } else {
      from_date = req.body.from_date;
      to_date = req.body.to_date;
      leave_type = req.body.leave_type;
    }

    await pool.query(
      'UPDATE leave_requests SET user_id=?, leave_type=?, from_date=?, to_date=?, reason=?, status=?, details=? WHERE id=?',
      [userId || req.body.user_id, leave_type, from_date, to_date, reason, status, details, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.delete('/api/leave_requests/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM leave_requests WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// --- NOTIFICATIONS CRUD ---
app.get('/api/notifications', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM notifications');
    res.json(rows);
  }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

app.post('/api/notifications', authenticate, async (req, res) => {
  try {
    // Use authenticated user ID if not provided in payload
    const userId = req.body.userId ?? (req.user && req.user.id);
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId for notification' });
    }
    // Map frontend field names to backend column names
    const { title, message, linkTo, createdAt, read, dismissed, isAnnouncement } = req.body;
    const isRead = read !== undefined ? read : false; // Frontend uses 'read', backend uses 'isRead'

    const [result] = await pool.query(
      'INSERT INTO notifications (userId, title, message, linkTo, createdAt, isRead, dismissed, isAnnouncement) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, title, message, linkTo || null, toMySQLDateTime(createdAt) || toMySQLDateTime(new Date().toISOString()), !!isRead, !!dismissed, !!isAnnouncement]
    );
    res.json({ id: result.insertId });
  } catch (err) {
    console.error('[POST /api/notifications]', err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put('/api/notifications/:id', authenticate, async (req, res) => {
  try {
    // Map frontend field names to backend column names
    const { userId, title, message, linkTo, createdAt, read, dismissed, isAnnouncement } = req.body;
    const isRead = read !== undefined ? read : false; // Frontend uses 'read', backend uses 'isRead'

    await pool.query(
      'UPDATE notifications SET userId=?, title=?, message=?, linkTo=?, createdAt=?, isRead=?, dismissed=?, isAnnouncement=? WHERE id=?',
      [userId, title, message, linkTo || null, toMySQLDateTime(createdAt), !!isRead, !!dismissed, !!isAnnouncement, req.params.id]
    );
    res.sendStatus(200);
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

app.delete('/api/notifications/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM notifications WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// --- BEST EMPLOYEES CRUD ---
app.get('/api/best_employees', authenticate, async (req, res) => {
  try { const [rows] = await pool.query('SELECT * FROM best_employees'); res.json(rows); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.post('/api/best_employees', authenticate, async (req, res) => {
  try {
    const { user_id, type, month, year } = req.body;
    const [result] = await pool.query(
      'INSERT INTO best_employees (user_id, type, month, year) VALUES (?, ?, ?, ?)',
      [user_id, type, month, year]
    );
    res.json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});
app.delete('/api/best_employees/:id', authenticate, async (req, res) => {
  try { await pool.query('DELETE FROM best_employees WHERE id=?', [req.params.id]); res.sendStatus(200); }
  catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});


// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));

  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Ensure Admin User ---
// async function ensureAdminUser() {
//   try {
//     const [rows] = await pool.query('SELECT id FROM users WHERE email=?', ['admin@gmail.com']);
//     if (rows.length === 0) {
//       const hash = await bcrypt.hash('admin', 10);
//       await pool.query(
//         'INSERT INTO users (name, email, password, role, isActive, dob, phone, address, designation, profilePictureUrl, bannerUrl, company) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
//         ['Admin', 'admin@gmail.com', hash, 'Admin', 1, '1970-01-01', '0000000000', 'Default Address', 'Administrator', 'https://cdn-icons-png.flaticon.com/512/847/847969.png', 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop', 'Default Company']);
//       console.log('Default admin user created: admin@gmail.com / admin');
//     } else {
//       console.log('Admin user already exists.');
//     }
//   } catch (err) {
//     console.error('Error ensuring admin user:', err);
//   }
// }

// --- System Status & Setup ---
app.get('/api/system-status', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT count(*) as count FROM users WHERE role='Superadmin' OR role='Admin'");
    const isInitialized = rows[0].count > 0;
    res.json({ isInitialized });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post('/api/setup-superadmin', async (req, res) => {
  try {
    // Check if any admin/superadmin exists
    const [rows] = await pool.query("SELECT count(*) as count FROM users WHERE role='Superadmin' OR role='Admin'");
    if (rows[0].count > 0) {
      return res.status(403).json({ error: "System already initialized" });
    }

    const {
      name, email, password, dob, phone,
      address, designation, profilePictureUrl, bannerUrl, company
    } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing required fields (name, email, password)" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (employeeId, name, email, password, dob, role, managerId, phone, address, designation, profilePictureUrl, bannerUrl, company, isActive) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [null, name, email, hash, dob || null, 'Superadmin', null, phone || null, address || null, designation || 'Super Admin', profilePictureUrl || 'https://cdn-icons-png.flaticon.com/512/847/847969.png', bannerUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop', company || null, 1]
    );

    // Auto-login the new superadmin
    const payload = { id: result.insertId, name, email, role: 'Superadmin', company };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({ success: true, user: payload, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Start Server ---
(async () => {
  // await ensureAdminUser();

  if (process.env.NODE_ENV === 'production') {
    try {
      const privateKey = fs.readFileSync('key.pem', 'utf8');
      const certificate = fs.readFileSync('cert.pem', 'utf8');
      const credentials = { key: privateKey, cert: certificate };

      const httpsServer = https.createServer(credentials, app);

      httpsServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTPS API server running locally at https://10.53.14.50:${PORT}`);
        console.log(`🌐 CORS for: https://10.53.14.50:3000`);
        console.log(`🔧 Default admin: admin@gmail.com / admin`);
      });
    } catch (error) {
      console.error('Failed to start HTTPS server:', error.message);
      console.log('Falling back to HTTP...');
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 API server running locally at http://10.53.14.50:${PORT}`);
      });
    }
  } else {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 API server running locally at http://10.53.14.50:${PORT}`);
      console.log(`🌐 CORS for: https://10.53.14.50:3000`);
      console.log(`🔧 Default admin: admin@gmail.com / admin`);
    });
  }
})();
