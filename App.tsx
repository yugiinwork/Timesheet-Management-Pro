import React, { useState, useMemo, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User, Role, Timesheet, LeaveRequest, Project, Status, Task, ToastNotification, View, WorkEntry, ProjectWork, LeaveEntry } from './types';
import type { Notification } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProfilePage } from './components/ProfilePage';
import { TimesheetPage } from './components/TimesheetPage';
import { LeaveRequestPage } from './components/LeaveRequestPage';
import { ManagerReviewPage } from './components/ManagerReviewPage';
import { ProjectManagementPage } from './components/ProjectManagementPage';
import { UserManagementPage } from './components/UserManagementPage';
import { TasksPage } from './components/TasksPage';
import { SetBestEmployeeModal } from './components/SetBestEmployeeModal';
import { DashboardPage } from './components/DashboardPage';
import { NotificationToast } from './components/NotificationToast';
import { NotificationCenter } from './components/NotificationCenter';

import { SetBestEmployeeOfYearModal } from './components/SetBestEmployeeOfYearModal';
import { EmployeeDetailPage } from './components/EmployeeDetailPage';
import { SuperAdminSetup } from './components/SuperAdminSetup';

// Declare XLSX for the linter since it's loaded from a script tag.
declare var XLSX: any;


// CORRECTION: Change this to the backend server's port (3001)const BASE_URL = 'http://10.53.14.50:3000/api'; // OLD
const BASE_URL = '/api'; // NEW (Change 3000 to 3001)

// Helper for auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
};

// Helper function to normalize date to YYYY-MM-DD format
const normalizeDateToYYYYMMDD = (dateStr: string): string => {
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    // Convert to YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // If parsing fails, return the original string (validation should catch this)
  return dateStr;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('DASHBOARD');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  // UI State
  const [isBestEmployeeModalOpen, setIsBestEmployeeModalOpen] = useState(false);
  const [isBestEmployeeOfYearModalOpen, setIsBestEmployeeOfYearModalOpen] = useState(false);
  const [toastNotifications, setToastNotifications] = useState<ToastNotification[]>([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [loading, setLoading] = useState(true);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [viewedEmployeeId, setViewedEmployeeId] = useState<number | null>(null);
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean | null>(null);

  // Global State
  const [appData, setAppData] = useState({
    users: [],
    timesheets: [],
    leaveRequests: [],
    projects: [],
    tasks: [],
    notifications: [],
    bestEmployeeIds: [],
    bestEmployeeOfYearIds: [],
  });

  // Ref to track previous notifications for window alerts
  const prevNotificationsRef = useRef<Notification[]>([]);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    dob: '',
    phone: '',
    address: '',
    designation: '',
    managerId: '',
    company: '',
  });

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);

  }, [theme]);

  // Check system initialization status
  useEffect(() => {
    fetch('/api/system-status')
      .then(res => res.json())
      .then(data => setIsSystemInitialized(data.isInitialized))
      .catch(err => {
        console.error("Failed to check system status", err);
        // If check fails, assume initialized to allow login (or handle error differently)
        setIsSystemInitialized(true);
      });
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        // Fetch full user profile to ensure we have latest data
        fetch(`/api/users/${decoded.id}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to fetch user');
          })
          .then(user => {
            setCurrentUser(user);
            // Note: loading will be handled by the data fetch effect
          })
          .catch(err => {
            console.error("Session restore failed", err);
            localStorage.removeItem('token');
            setLoading(false);
          });
      } catch (err) {
        console.error("Invalid token", err);
        localStorage.removeItem('token');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch initial data ONLY after login & token set!
  useEffect(() => {
    if (!currentUser) {
      // If there is a token, we might be restoring session, so don't stop loading yet
      // The restore effect will handle setting loading to false if restoration fails
      if (!localStorage.getItem('token')) {
        setLoading(false);
      }
      return; // Only fetch data after you have logged in!
    }

    setLoading(true); // Show loading while fetching after login
    const fetchData = async () => {
      try {
        const [usersRes, projectsRes, tasksRes, timesheetsRes, leaveRequestsRes, notificationsRes, bestEmployeesRes] = await Promise.all([
          fetch(`/api/users`, { headers: getAuthHeaders() }),
          fetch(`/api/projects`, { headers: getAuthHeaders() }),
          fetch(`/api/tasks`, { headers: getAuthHeaders() }),
          fetch(`/api/timesheets`, { headers: getAuthHeaders() }),
          fetch(`/api/leave_requests`, { headers: getAuthHeaders() }),
          fetch(`/api/notifications`, { headers: getAuthHeaders() }),
          fetch(`/api/best_employees`, { headers: getAuthHeaders() }),
        ]);
        if (!usersRes.ok || !projectsRes.ok || !tasksRes.ok || !timesheetsRes.ok || !leaveRequestsRes.ok || !notificationsRes.ok || !bestEmployeesRes.ok) {
          throw new Error('Failed to fetch data');
        }
        const users = await usersRes.json();
        const projects = await projectsRes.json();
        const tasks = await tasksRes.json();
        const timesheets = await timesheetsRes.json();
        const leaveRequestsRaw = await leaveRequestsRes.json();
        const leaveRequests = leaveRequestsRaw.map((lr: any) => ({
          ...lr,
          leaveEntries: lr.details ? (typeof lr.details === 'string' ? JSON.parse(lr.details) : lr.details) : (lr.leaveEntries || [])
        }));
        const notifications = await notificationsRes.json();
        const bestEmployees = await bestEmployeesRes.json();

        // Filter best employees for current month/year
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        const currentYear = now.getFullYear();

        const currentBestEmployeeIds = bestEmployees
          .filter((be: any) => be.type === 'MONTH' && be.month === currentMonth && be.year === currentYear)
          .map((be: any) => be.user_id);

        const currentBestEmployeeOfYearIds = bestEmployees
          .filter((be: any) => be.type === 'YEAR' && be.year === currentYear)
          .map((be: any) => be.user_id);

        setAppData({
          users,
          projects,
          tasks,
          timesheets,
          leaveRequests,
          notifications,
          bestEmployeeIds: currentBestEmployeeIds,
          bestEmployeeOfYearIds: currentBestEmployeeOfYearIds
        });

        // Sync currentUser
        const updatedCurrentUser = users.find((u: User) => u.id === currentUser?.id);
        if (currentUser && updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(currentUser)) {
          setCurrentUser(updatedCurrentUser);
        }

        setError('');
      } catch (error) {
        console.error("Failed to load data from server", error);
        setError("Could not connect to server data storage.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]); // <---- important!

  // Poll notifications every 1 second
  useEffect(() => {
    if (!currentUser) return;

    const pollNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications`, { headers: getAuthHeaders() });
        if (res.ok) {
          const fetchedNotifications = await res.json();
          setAppData(prev => {
            if (JSON.stringify(prev.notifications) !== JSON.stringify(fetchedNotifications)) {
              console.log('[Polling] Notifications updated. Previous count:', prev.notifications.length, 'New count:', fetchedNotifications.length);
              console.log('[Polling] New notifications:', fetchedNotifications.filter(fn => !prev.notifications.some(pn => pn.id === fn.id)));
              return { ...prev, notifications: fetchedNotifications };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Failed to poll notifications", error);
      }
    };

    // Poll immediately on mount, then every 1 second
    pollNotifications();
    const interval = setInterval(pollNotifications, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Trigger Window Notifications for new items
  useEffect(() => {
    if (!currentUser) return;
    const prevNotifs = prevNotificationsRef.current;
    const currentNotifs = appData.notifications;

    // Find new notifications (only those not in previous state)
    const newNotifs = currentNotifs.filter(n => !prevNotifs.some(p => p.id === n.id));

    // Only process if we have previous notifications (i.e., not initial load)
    // and we have new notifications
    if (prevNotifs.length > 0 && newNotifs.length > 0 && notificationPermission === 'granted') {
      console.log('[Notification] New notifications received:', newNotifs.length);

      newNotifs.forEach(n => {
        // Only notify if meant for the current user
        if (n.userId === currentUser.id) {
          console.log('[Notification] Showing browser notification:', n.title, 'for user', n.userId);
          const notifi = new Notification(n.title, {
            body: n.message,
            icon: '/vite.svg',
          });
          if (n.linkTo) {
            notifi.onclick = () => {
              window.focus();
              setView(n.linkTo!);
              notifi.close();
            };
          }
        } else {
          console.log('[Notification] Skipping notification for different user:', n.userId, '(current:', currentUser.id, ')');
        }
      });
    }

    prevNotificationsRef.current = currentNotifs;
  }, [appData.notifications, notificationPermission, currentUser]);


  // Sync on storage change
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'appData' && event.newValue) {
        console.log('Detected data change. Refetching...');
        const fetchData = async () => {
          try {
            const [usersRes, projectsRes, tasksRes, timesheetsRes, leaveRequestsRes, notificationsRes] = await Promise.all([
              fetch(`/api/users`, { headers: getAuthHeaders() }),
              fetch(`/api/projects`, { headers: getAuthHeaders() }),
              fetch(`/api/tasks`, { headers: getAuthHeaders() }),
              fetch(`/api/timesheets`, { headers: getAuthHeaders() }),
              fetch(`/api/leave_requests`, { headers: getAuthHeaders() }),
              fetch(`/api/notifications`, { headers: getAuthHeaders() }),
              fetch(`/api/best_employees`, { headers: getAuthHeaders() }),
            ]);

            if (!usersRes.ok || !projectsRes.ok || !tasksRes.ok || !timesheetsRes.ok || !notificationsRes.ok) {
              throw new Error('Failed to refetch data');
            }

            const users = await usersRes.json();
            const projects = await projectsRes.json();
            const tasks = await tasksRes.json();
            const timesheets = await timesheetsRes.json();
            const leaveRequestsRaw = await leaveRequestsRes.json();
            const leaveRequests = leaveRequestsRaw.map((lr: any) => ({
              ...lr,
              leaveEntries: lr.details ? (typeof lr.details === 'string' ? JSON.parse(lr.details) : lr.details) : (lr.leaveEntries || [])
            }));
            const notifications = await notificationsRes.json();

            setAppData({ users, projects, tasks, timesheets, leaveRequests, notifications, bestEmployeeIds: [], bestEmployeeOfYearIds: [] });

            const updatedCurrentUser = users.find((u: User) => u.id === currentUser?.id);
            if (currentUser && !updatedCurrentUser) {
              setCurrentUser(null);
              localStorage.removeItem('token');
            } else if (updatedCurrentUser && JSON.stringify(updatedCurrentUser) !== JSON.stringify(currentUser)) {
              setCurrentUser(updatedCurrentUser);
            }
          } catch (error) {
            console.error("Failed to sync data from server", error);
            setError("Could not sync with server data storage.");
          }
        };
        fetchData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser]);

  // Destructure data
  const { users, timesheets, leaveRequests, projects, tasks, notifications, bestEmployeeIds, bestEmployeeOfYearIds } = appData;

  // Setter functions using fetch
  const setUsers = async (value: React.SetStateAction<User[]>) => {
    const newUsers = typeof value === 'function' ? value(users) : value;

    // Handle deletions
    const usersToDelete = users.filter(u => !newUsers.find(nu => nu.id === u.id));
    for (const u of usersToDelete) {
      await fetch(`/api/users/${u.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    for (const user of newUsers) {
      if (!users.find(u => u.id === user.id)) {
        await fetch(`/api/users`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(user) });
      } else {
        const existingUser = users.find(u => u.id === user.id);
        if (existingUser && JSON.stringify(existingUser) !== JSON.stringify(user)) {
          await fetch(`/api/users/${user.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(user) });
        }
      }
    }
    setAppData(prev => ({ ...prev, users: newUsers }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, users: newUsers }));
  };

  const setTimesheets = async (value: React.SetStateAction<Timesheet[]>) => {
    const newTimesheets = typeof value === 'function' ? value(timesheets) : value;

    // Handle deletions
    const timesheetsToDelete = timesheets.filter(t => !newTimesheets.find(nt => nt.id === t.id));
    for (const t of timesheetsToDelete) {
      await fetch(`/api/timesheets/${t.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    for (const ts of newTimesheets) {
      // Ensure date is in YYYY-MM-DD format before sending to API
      const normalizedTimesheet = {
        ...ts,
        date: normalizeDateToYYYYMMDD(ts.date)
      };

      if (!timesheets.find(t => t.id === ts.id)) {
        await fetch(`/api/timesheets`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(normalizedTimesheet) });
      } else {
        await fetch(`/api/timesheets/${ts.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(normalizedTimesheet) });
      }
    }
    setAppData(prev => ({ ...prev, timesheets: newTimesheets }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, timesheets: newTimesheets }));
  };

  const setLeaveRequests = async (value: React.SetStateAction<LeaveRequest[]>) => {
    const newLeaveRequests = typeof value === 'function' ? value(leaveRequests) : value;

    // Handle deletions
    const leaveRequestsToDelete = leaveRequests.filter(l => !newLeaveRequests.find(nl => nl.id === l.id));
    for (const l of leaveRequestsToDelete) {
      await fetch(`/api/leave_requests/${l.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    const updatedLeaveRequests = newLeaveRequests.map(lr => ({ ...lr }));

    for (const lr of updatedLeaveRequests) {
      if (!leaveRequests.find(l => l.id === lr.id)) {
        try {
          const res = await fetch(`/api/leave_requests`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(lr) });
          if (res.ok) {
            const data = await res.json();
            lr.id = data.id;
          } else {
            console.error("Failed to create leave request", await res.text());
            addToastNotification("Failed to create leave request", "Error");
          }
        } catch (error) {
          console.error("Error creating leave request", error);
          addToastNotification("Error creating leave request", "Error");
        }
      } else {
        try {
          const res = await fetch(`/api/leave_requests/${lr.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(lr) });
          if (!res.ok) {
            console.error("Failed to update leave request", await res.text());
          }
        } catch (error) {
          console.error("Error updating leave request", error);
        }
      }
    }
    setAppData(prev => ({ ...prev, leaveRequests: updatedLeaveRequests }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, leaveRequests: updatedLeaveRequests }));
  };

  const setProjects = async (value: React.SetStateAction<Project[]>) => {
    const newProjects = typeof value === 'function' ? value(projects) : value;

    // Handle deletions
    const projectsToDelete = projects.filter(p => !newProjects.find(np => np.id === p.id));
    for (const p of projectsToDelete) {
      await fetch(`/api/projects/${p.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    for (const p of newProjects) {
      if (!projects.find(pr => pr.id === p.id)) {
        await fetch(`/api/projects`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(p) });
      } else {
        await fetch(`/api/projects/${p.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(p) });
      }
    }
    setAppData(prev => ({ ...prev, projects: newProjects }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, projects: newProjects }));
  };

  const setTasks = async (value: React.SetStateAction<Task[]>) => {
    const newTasks = typeof value === 'function' ? value(tasks) : value;

    // Handle deletions
    const tasksToDelete = tasks.filter(t => !newTasks.find(nt => nt.id === t.id));
    for (const t of tasksToDelete) {
      await fetch(`/api/tasks/${t.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    for (const t of newTasks) {
      if (!tasks.find(ta => ta.id === t.id)) {
        await fetch(`/api/tasks`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(t) });
      } else {
        await fetch(`/api/tasks/${t.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(t) });
      }
    }
    setAppData(prev => ({ ...prev, tasks: newTasks }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, tasks: newTasks }));
  };

  const setNotifications = async (value: React.SetStateAction<Notification[]>) => {
    const newNotifications = typeof value === 'function' ? value(notifications) : value;

    // Handle deletions
    const notificationsToDelete = notifications.filter(n => !newNotifications.find(nn => nn.id === n.id));
    for (const n of notificationsToDelete) {
      await fetch(`/api/notifications/${n.id}`, { method: 'DELETE', headers: getAuthHeaders() });
    }

    for (const n of newNotifications) {
      if (!notifications.find(no => no.id === n.id)) {
        await fetch(`/api/notifications`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(n) });
      } else {
        await fetch(`/api/notifications/${n.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(n) });
      }
    }
    setAppData(prev => ({ ...prev, notifications: newNotifications }));
    localStorage.setItem('appData', JSON.stringify({ ...appData, notifications: newNotifications }));
  };

  // Computed values (unchanged)
  // Computed values
  const isSuperAdmin = currentUser?.role === Role.SUPERADMIN;

  const companyUsers = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) return users;
    return users.filter(u => u.company === currentUser.company);
  }, [currentUser, users, isSuperAdmin]);

  const companyProjects = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) return projects;
    return projects.filter(p => p.company === currentUser.company);
  }, [currentUser, projects, isSuperAdmin]);

  const companyTimesheets = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) return timesheets;
    const companyUserIds = companyUsers.map(u => u.id);
    return timesheets.filter(t => companyUserIds.includes(t.userId));
  }, [currentUser, companyUsers, timesheets, isSuperAdmin]);

  const companyLeaveRequests = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) return leaveRequests;
    const companyUserIds = companyUsers.map(u => u.id);
    return leaveRequests.filter(l => companyUserIds.includes(l.userId));
  }, [currentUser, companyUsers, leaveRequests, isSuperAdmin]);

  const companyTasks = useMemo(() => {
    if (!currentUser) return [];
    if (isSuperAdmin) return tasks;
    const companyProjectIds = companyProjects.map(p => p.id);
    return tasks.filter(t => companyProjectIds.includes(t.projectId));
  }, [currentUser, companyProjects, tasks, isSuperAdmin]);

  const teamMembers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === Role.TEAM_LEADER) {
      return companyUsers.filter(u => u.managerId === currentUser.id);
    }
    return [];
  }, [currentUser, companyUsers]);

  const { pendingTimesheetCount, pendingLeaveCount } = useMemo(() => {
    if (!currentUser || ![Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role)) {
      return { pendingTimesheetCount: 0, pendingLeaveCount: 0 };
    }
    const companyUserIds = companyUsers.map(u => u.id);
    const teamMemberIds = teamMembers.map(tm => tm.id);

    const timesheetCount = timesheets.filter(t => {
      const isPending = t.status === Status.PENDING;

      if (currentUser.role === Role.MANAGER) {
        // Manager sees all pending items in company
        return isPending && companyUserIds.includes(t.userId);
      } else if (currentUser.role === Role.ADMIN) {
        // Admin sees Team Leader and Employee items (not Manager's)
        const submitter = companyUsers.find(u => u.id === t.userId);
        return isPending && submitter && submitter.role !== Role.MANAGER && companyUserIds.includes(t.userId);
      } else {
        // Team Leader sees their team members
        return isPending && teamMemberIds.includes(t.userId);
      }
    }).length;

    const leaveCount = leaveRequests.filter(l => {
      const isPending = l.status === Status.PENDING;

      if (currentUser.role === Role.MANAGER) {
        // Manager sees all pending items in company
        return isPending && companyUserIds.includes(l.userId);
      } else if (currentUser.role === Role.ADMIN) {
        // Admin sees Team Leader and Employee items (not Manager's)
        const submitter = companyUsers.find(u => u.id === l.userId);
        return isPending && submitter && submitter.role !== Role.MANAGER && companyUserIds.includes(l.userId);
      } else {
        // Team Leader sees their team members
        return isPending && teamMemberIds.includes(l.userId);
      }
    }).length;

    return { pendingTimesheetCount: timesheetCount, pendingLeaveCount: leaveCount };
  }, [currentUser, companyUsers, teamMembers, timesheets, leaveRequests]);

  // Project hours update
  useEffect(() => {
    const projectsWithUpdatedHours = projects.map(p => {
      const totalHours = timesheets.reduce((projectSum, ts) => {
        if (ts.status !== Status.APPROVED) return projectSum;
        const workForThisProject = (ts.projectWork || []).find(pw => pw.projectId === p.id);
        if (workForThisProject) {
          const hoursInTimesheet = workForThisProject.workEntries.reduce((workSum, entry) => workSum + entry.hours, 0);
          return projectSum + hoursInTimesheet;
        }
        return projectSum;
      }, 0);
      return { ...p, actualHours: totalHours };
    });

    const currentProjectHoursJSON = JSON.stringify(projects.map(p => ({ id: p.id, actualHours: p.actualHours })));
    const newProjectHoursJSON = JSON.stringify(projectsWithUpdatedHours.map(p => ({ id: p.id, actualHours: p.actualHours })));

    if (newProjectHoursJSON !== currentProjectHoursJSON) {
      setProjects(projectsWithUpdatedHours);
    }
  }, [timesheets, projects]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.user && data.token) {
        setCurrentUser(data.user);
        localStorage.setItem('token', data.token);
        setView('DASHBOARD');
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Invalid email or password.');
      }
    } catch (err) {
      setError('An error occurred during login.');
    }
  };

  // Signup input change
  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSignupData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // Signup using fetch
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailExists = users.some(u => u.email === signupData.email);
    if (emailExists) {
      setError('An account with this email already exists.');
      return;
    }

    const companyExists = users.some(u => u.company?.toLowerCase() === signupData.company.toLowerCase());
    if (companyExists && !signupData.managerId) {
      setError('Please select a manager for this company.');
      return;
    }

    const newUser: User = {
      id: Date.now(),
      role: companyExists ? Role.EMPLOYEE : Role.ADMIN,

      ...signupData,
      managerId: companyExists ? Number(signupData.managerId) : undefined,
    };

    try {
      const res = await fetch(`/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        setAuthView('login');
        setSuccessMessage('Account created successfully! Please log in.');
        setError('');
        setSignupData({
          name: '',
          email: '',
          password: '',
          employeeId: '',
          dob: '',
          phone: '',
          address: '',
          designation: '',
          managerId: '',
          company: '',
        });
      } else {
        const data = await res.json();
        setError(data.error || 'Signup failed.');
      }
    } catch (err) {
      setError('An error occurred during signup.');
    }
  };



  // Export functions (unchanged, using existing logic)
  const downloadExcel = (filename: string, workbook: any) => {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const handleExportProjects = () => {
    const companyProjectsToExport = projects.filter(p => p.company === currentUser?.company);
    const companyUsersToExport = users.filter(u => u.company === currentUser?.company);

    const projectHeaders = ['ID', 'Name', 'Description', 'Customer Name', 'Job Name', 'Estimated Hours', 'Actual Hours', 'Manager ID', 'Manager Name', 'Team Leader ID', 'Team Leader Name', 'Team IDs'];
    const projectData = companyProjectsToExport.map(p => [p.id, p.name, p.description, p.customerName, p.jobName, p.estimatedHours, p.actualHours, p.managerId, companyUsersToExport.find(u => u.id === p.managerId)?.name || '', p.teamLeaderId || '', companyUsersToExport.find(u => u.id === p.teamLeaderId)?.name || '', p.teamIds.join(';')]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectData]);
    XLSX.utils.book_append_sheet(wb, ws, 'Projects');
    downloadExcel('projects', wb);
  };

  const handleExportTimesheets = () => {
    const companyUserIds = users.filter(u => u.company === currentUser?.company).map(u => u.id);
    const companyTimesheets = timesheets.filter(ts => companyUserIds.includes(ts.userId));

    const timesheetHeaders = ['Timesheet ID', 'User ID', 'User Name', 'Date', 'In-Time', 'Out-Time', 'Project ID', 'Project Name', 'Task Description', 'Task Hours', 'Status', 'Approver Name'];
    const timesheetsByMonth = companyTimesheets.reduce((acc, ts) => {
      const month = ts.date.substring(0, 7);
      (acc[month] = acc[month] || []).push(ts);
      return acc;
    }, {} as Record<string, Timesheet[]>);

    const wb = XLSX.utils.book_new();

    Object.entries(timesheetsByMonth).forEach(([month, monthTimesheets]: [string, Timesheet[]]) => {
      const data: (string | number | undefined)[][] = [];
      monthTimesheets.forEach(ts => {
        const userName = users.find(u => u.id === ts.userId)?.name || 'Unknown';
        const approverName = ts.approverId ? (users.find(u => u.id === ts.approverId)?.name || 'Unknown') : '';
        (ts.projectWork || []).forEach(pw => {
          const projectName = projects.find(p => p.id === pw.projectId)?.name || 'N/A';
          pw.workEntries.forEach(we => {
            data.push([
              ts.id, ts.userId, userName, ts.date, ts.inTime, ts.outTime,
              pw.projectId, projectName, we.description, we.hours,
              ts.status, approverName
            ]);
          });
        });
      });
      const ws = XLSX.utils.aoa_to_sheet([timesheetHeaders, ...data]);
      XLSX.utils.book_append_sheet(wb, month);
    });
    downloadExcel('timesheets', wb);
  };

  const handleExportLeaveRequests = () => {
    const companyUserIds = users.filter(u => u.company === currentUser?.company).map(u => u.id);
    const companyLeaveRequests = leaveRequests.filter(lr => companyUserIds.includes(lr.userId));

    const leaveHeaders = ['Request ID', 'User ID', 'User Name', 'Leave Date', 'Leave Type', 'Half Day Session', 'Reason', 'Status', 'Approver Name'];
    const leavesByMonth = companyLeaveRequests.reduce((acc, lr) => {
      if (lr.leaveEntries.length > 0) {
        const month = lr.leaveEntries[0].date.substring(0, 7);
        (acc[month] = acc[month] || []).push(lr);
      }
      return acc;
    }, {} as Record<string, LeaveRequest[]>);

    const wb = XLSX.utils.book_new();

    Object.entries(leavesByMonth).forEach(([month, monthLeaves]: [string, LeaveRequest[]]) => {
      const data: (string | number | undefined)[][] = [];
      monthLeaves.forEach(lr => {
        const userName = users.find(u => u.id === lr.userId)?.name || 'Unknown';
        const approverName = lr.approverId ? (users.find(u => u.id === lr.approverId)?.name || 'Unknown') : '';
        lr.leaveEntries.forEach(entry => {
          data.push([
            lr.id, lr.userId, userName,
            entry.date, entry.leaveType, (entry as any).halfDaySession || '',
            lr.reason, lr.status, approverName
          ]);
        });
      });
      const ws = XLSX.utils.aoa_to_sheet([leaveHeaders, ...data]);
      XLSX.utils.book_append_sheet(wb, month);
    });
    downloadExcel('leave_requests', wb);
  };

  const handleExportTimesheetsByDay = (startDate?: string, endDate?: string) => {
    const companyUserIds = users.filter(u => u.company === currentUser?.company).map(u => u.id);
    let companyTimesheets = timesheets.filter(ts => companyUserIds.includes(ts.userId));

    if (startDate && endDate) {
      companyTimesheets = companyTimesheets.filter(ts => ts.date >= startDate && ts.date <= endDate);
      if (companyTimesheets.length === 0) {
        addToastNotification("No timesheets found in the selected date range.", "Export Canceled");
        return;
      }
    }

    const timesheetsByDay = companyTimesheets.reduce((acc, ts) => {
      (ts.projectWork || []).forEach(pw => {
        pw.workEntries.forEach(we => {
          const date = ts.date;
          (acc[date] = acc[date] || []).push({
            timesheet: ts,
            projectWork: pw,
            workEntry: we
          });
        });
      });
      return acc;
    }, {} as Record<string, { timesheet: Timesheet, projectWork: ProjectWork, workEntry: WorkEntry }[]>);

    const wb = XLSX.utils.book_new();
    const timesheetHeaders = ['Timesheet ID', 'User ID', 'User Name', 'Date', 'In-Time', 'Out-Time', 'Project ID', 'Project Name', 'Task Description', 'Task Hours', 'Status', 'Approver Name'];

    Object.keys(timesheetsByDay).sort().forEach(date => {
      const dayEntries = timesheetsByDay[date];
      const data: (string | number | undefined)[][] = [];

      dayEntries.forEach(entry => {
        const { timesheet, projectWork, workEntry } = entry;
        const userName = users.find(u => u.id === timesheet.userId)?.name || 'Unknown';
        const approverName = timesheet.approverId ? (users.find(u => u.id === timesheet.approverId)?.name || 'Unknown') : '';
        const projectName = projects.find(p => p.id === projectWork.projectId)?.name || 'N/A';

        data.push([
          timesheet.id,
          timesheet.userId,
          userName,
          timesheet.date,
          timesheet.inTime,
          timesheet.outTime,
          projectWork.projectId,
          projectName,
          workEntry.description,
          workEntry.hours,
          timesheet.status,
          approverName
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet([timesheetHeaders, ...data]);
      XLSX.utils.book_append_sheet(wb, ws, date);
    });

    downloadExcel(`timesheets_by_day${startDate ? `_${startDate}_to_${endDate}` : ''}`, wb);
  };

  const handleExportLeaveRequestsByDay = (startDate?: string, endDate?: string) => {
    const companyUserIds = users.filter(u => u.company === currentUser?.company).map(u => u.id);
    let companyLeaveRequests = leaveRequests.filter(lr => companyUserIds.includes(lr.userId));

    if (startDate && endDate) {
      companyLeaveRequests = companyLeaveRequests.filter(lr =>
        lr.leaveEntries.some(entry => entry.date >= startDate && entry.date <= endDate)
      );
      if (companyLeaveRequests.length === 0) {
        addToastNotification("No leave requests found in the selected date range.", "Export Canceled");
        return;
      }
    }

    const leavesByDay = companyLeaveRequests.reduce((acc, lr) => {
      lr.leaveEntries.forEach(entry => {
        const date = entry.date;
        (acc[date] = acc[date] || []).push({
          request: lr,
          entry: entry
        });
      });
      return acc;
    }, {} as Record<string, { request: LeaveRequest, entry: LeaveEntry }[]>);

    const wb = XLSX.utils.book_new();
    const leaveHeaders = ['Request ID', 'User ID', 'User Name', 'Leave Date', 'Leave Type', 'Half Day Session', 'Reason', 'Status', 'Approver Name'];

    Object.keys(leavesByDay).sort().forEach(date => {
      const dayEntries = leavesByDay[date];
      const data: (string | number | undefined)[][] = [];

      dayEntries.forEach(({ request, entry }) => {
        const userName = users.find(u => u.id === request.userId)?.name || 'Unknown';
        const approverName = request.approverId ? (users.find(u => u.id === request.approverId)?.name || 'Unknown') : '';

        data.push([
          request.id,
          request.userId,
          userName,
          entry.date,
          entry.leaveType,
          entry.halfDaySession || '',
          request.reason,
          request.status,
          approverName
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet([leaveHeaders, ...data]);
      XLSX.utils.book_append_sheet(wb, ws, date);
    });

    downloadExcel(`leave_requests_by_day${startDate ? `_${startDate}_to_${endDate}` : ''}`, wb);
  };

  // Notification handlers (unchanged)
  const removeToastNotification = (id: number) => {
    setToastNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addToastNotification = (message: string, title?: string) => {
    const newToast = { id: Date.now(), message, title };
    setToastNotifications(prev => [...prev, newToast]);
  };

  const showBrowserNotification = (title: string, options: NotificationOptions & { linkTo?: View }) => {
    if (notificationPermission !== 'granted') {
      return;
    }

    const notifi = new Notification(title, {
      body: options.body,
      icon: '/vite.svg',
    });

    if (options.linkTo) {
      notifi.onclick = () => {
        window.focus();
        setView(options.linkTo!);
        notifi.close();
      };
    }
  };

  const requestNotificationPermission = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      addToastNotification('Browser notifications have been enabled!', 'Success');
      showBrowserNotification('Notifications Enabled', { body: 'You will now receive updates from Timesheet Pro.' });
    } else {
      addToastNotification('Browser notifications are disabled. You can change this in your browser settings.', 'Info');
    }
  };

  const addNotification = async (payload: Omit<Notification, 'id' | 'read' | 'createdAt' | 'dismissed'>) => {
    const newNotification: Notification = {
      ...payload,
      id: Date.now(),
      read: false,
      createdAt: new Date().toISOString(),
      dismissed: false,
    };
    await setNotifications(prev => [...prev, newNotification]);


  };

  const dismissNotification = async (notificationId: number) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE', headers: getAuthHeaders() });
      setAppData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.id !== notificationId)
      }));
    } catch (error) {
      console.error("Failed to dismiss notification", error);
      addToastNotification("Failed to dismiss notification", "Error");
    }
  };

  const permanentlyDeleteNotification = async (notificationId: number) => {
    await dismissNotification(notificationId);
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    await setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
  };

  const dismissAllNotifications = async () => {
    if (!currentUser) return;
    const userNotifs = notifications.filter(n => n.userId === currentUser.id);
    try {
      await Promise.all(userNotifs.map(n => fetch(`/api/notifications/${n.id}`, { method: 'DELETE', headers: getAuthHeaders() })));
      setAppData(prev => ({
        ...prev,
        notifications: prev.notifications.filter(n => n.userId !== currentUser.id)
      }));
    } catch (error) {
      console.error("Failed to dismiss all notifications", error);
      addToastNotification("Failed to dismiss all notifications", "Error");
    }
  };

  const handleSendAnnouncement = async (title: string, message: string) => {
    if (!currentUser || ![Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role)) {
      addToastNotification("You do not have permission to send announcements.", "Error");
      return;
    }

    const newNotifications: Notification[] = companyUsers.map(user => ({
      id: Date.now() + user.id,
      userId: user.id,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      dismissed: false,
      isAnnouncement: true,
    }));

    await setNotifications(prev => [...prev, ...newNotifications]);
    addToastNotification("Your announcement has been sent to all users.", "Announcement Sent");


  };



  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter(n => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notifications, currentUser]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };



  // Loading screen
  if (loading || isSystemInitialized === null) { // Added isSystemInitialized === null to loading condition
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-sky-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Loading application...</p>
        </div>
      </div>
    );
  }

  // Auth views
  if (!currentUser) {
    if (authView === 'login') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
            <button
              onClick={toggleTheme}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              aria-label="Toggle dark mode"
            >
              {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-sky-500 rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Timesheet Pro Login</h1>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); setSuccessMessage(''); }}
                  required
                  className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); setSuccessMessage(''); }}
                  required
                  className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Sign in
                </button>
              </div>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <button
                onClick={() => { setAuthView('signup'); setError(''); setSuccessMessage(''); }}
                className="font-medium text-sky-600 hover:text-sky-500 focus:outline-none focus:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      );
    } else { // Signup view
      const companyExists = users.some(u => u.company?.toLowerCase() === signupData.company.toLowerCase());
      const managersForCompany = users.filter(u => u.company?.toLowerCase() === signupData.company.toLowerCase() && (u.role === Role.MANAGER || u.role === Role.ADMIN || u.role === Role.TEAM_LEADER));
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 py-12 px-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
            <div className="flex items-center justify-center gap-3 mb-6">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Your Account</h1>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={signupData.name}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={signupData.email}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={signupData.password}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Employee ID</label>
                  <input
                    type="text"
                    name="employeeId"
                    value={signupData.employeeId}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={signupData.designation}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Company</label>
                  <input
                    type="text"
                    name="company"
                    value={signupData.company}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                  {signupData.company && !companyExists && <p className="text-xs text-green-500 mt-1">You will be the administrator for this new company.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    value={signupData.dob}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={signupData.phone}
                  onChange={handleSignupInputChange}
                  required
                  className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Address</label>
                <input
                  type="text"
                  name="address"
                  value={signupData.address}
                  onChange={handleSignupInputChange}
                  required
                  className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                />
              </div>
              {companyExists && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Manager</label>
                  <select
                    name="managerId"
                    value={signupData.managerId}
                    onChange={handleSignupInputChange}
                    required
                    className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3"
                  >
                    <option value="" disabled>Select your manager</option>
                    {managersForCompany.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                >
                  Create Account
                </button>
              </div>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => { setAuthView('login'); setError(''); setSuccessMessage(''); }}
                className="font-medium text-sky-600 hover:text-sky-500"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      );
    }
  }

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
  };

  const handleUpdateUser = async (updatedUser: User) => {
    await setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    await setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleSetBestEmployees = async (userIds: number[]) => {
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();

    try {
      // 1. Fetch all to find IDs to delete
      const res = await fetch(`/api/best_employees`, { headers: getAuthHeaders() });
      if (res.ok) {
        const allEntries = await res.json();
        const toDelete = allEntries.filter((be: any) => be.type === 'MONTH' && be.month === currentMonth && be.year === currentYear);

        // 2. Delete old
        await Promise.all(toDelete.map((be: any) => fetch(`/api/best_employees/${be.id}`, { method: 'DELETE', headers: getAuthHeaders() })));
      }

      // 3. Add new
      await Promise.all(userIds.map(id => fetch(`/api/best_employees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: id, type: 'MONTH', month: currentMonth, year: currentYear })
      })));

      setAppData(prev => ({ ...prev, bestEmployeeIds: userIds }));
      setIsBestEmployeeModalOpen(false);
      addToastNotification("Best employees updated successfully", "Success");
    } catch (error) {
      console.error("Failed to update best employees", error);
      addToastNotification("Failed to update best employees", "Error");
    }
  };

  const handleSetBestEmployeeOfYear = async (userIds: number[]) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    try {
      // 1. Fetch all to find IDs to delete
      const res = await fetch(`/api/best_employees`, { headers: getAuthHeaders() });
      if (res.ok) {
        const allEntries = await res.json();
        const toDelete = allEntries.filter((be: any) => be.type === 'YEAR' && be.year === currentYear);

        // 2. Delete old
        await Promise.all(toDelete.map((be: any) => fetch(`/api/best_employees/${be.id}`, { method: 'DELETE', headers: getAuthHeaders() })));
      }

      // 3. Add new
      await Promise.all(userIds.map(id => fetch(`/api/best_employees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: id, type: 'YEAR', month: '', year: currentYear })
      })));

      setAppData(prev => ({ ...prev, bestEmployeeOfYearIds: userIds }));
      setIsBestEmployeeOfYearModalOpen(false);
      addToastNotification("Best employee of year updated successfully", "Success");
    } catch (error) {
      console.error("Failed to update best employee of year", error);
      addToastNotification("Failed to update best employee of year", "Error");
    }
  };

  const renderView = () => {
    const canExport = [Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role);
    const companyUserIds = companyUsers.map(u => u.id);

    switch (view) {
      case 'DASHBOARD':
        return <DashboardPage
          currentUser={currentUser}
          users={companyUsers}
          timesheets={timesheets}
          leaveRequests={leaveRequests}
          projects={companyProjects}
          tasks={tasks}
          bestEmployeeIds={bestEmployeeIds}
          bestEmployeeOfYearIds={bestEmployeeOfYearIds}
          setView={setView}
        />;

      case 'PROFILE':
        return <ProfilePage user={currentUser} onUpdateUser={handleUpdateUser} currentUser={currentUser} />;
      case 'TIMESHEETS':
        return <TimesheetPage
          currentUser={currentUser}
          users={users}
          timesheets={timesheets.filter(t => t.userId === currentUser.id)}
          setTimesheets={setTimesheets}
          projects={companyProjects}
          tasks={tasks}
          onExport={canExport ? handleExportTimesheets : undefined}
          addToastNotification={addToastNotification}
          addNotification={addNotification}
        />;
      case 'LEAVE':
        return <LeaveRequestPage
          currentUser={currentUser}
          users={users}
          leaveRequests={leaveRequests.filter(l => l.userId === currentUser.id)}
          setLeaveRequests={setLeaveRequests}
          onExport={canExport ? handleExportLeaveRequests : undefined}
          addToastNotification={addToastNotification}
          addNotification={addNotification}
        />;
      case 'TASKS':
        const userVisibleProjects = companyProjects.filter(p =>
          p.teamIds.includes(currentUser.id) ||
          p.managerId === currentUser.id ||
          p.teamLeaderId === currentUser.id
        );
        return <TasksPage
          projects={userVisibleProjects}
          tasks={tasks}
          users={companyUsers}
          currentUser={currentUser}
          setTasks={setTasks}
          addToastNotification={addToastNotification}
          addNotification={addNotification}
        />;
      case 'TEAM_TIMESHEETS': {
        let itemsToReview: Timesheet[];
        let viewTitle: string;
        let canApproveItems = true;

        if (currentUser.role === Role.MANAGER) {
          // Manager sees all timesheets in company
          itemsToReview = timesheets.filter(t => companyUserIds.includes(t.userId));
          viewTitle = "All Timesheets";
        } else if (currentUser.role === Role.ADMIN) {
          // Admin sees Team Leader and Employee timesheets (not Manager's)
          itemsToReview = timesheets.filter(t => {
            const submitter = companyUsers.find(u => u.id === t.userId);
            return submitter && submitter.role !== Role.MANAGER && companyUserIds.includes(t.userId);
          });
          viewTitle = "Team Timesheets";
        } else { // Team Leader
          const teamMemberIds = teamMembers.map(tm => tm.id);
          itemsToReview = timesheets.filter(t => teamMemberIds.includes(t.userId));
          viewTitle = "Team Timesheets";
        }

        return <ManagerReviewPage
          title={viewTitle}
          items={itemsToReview}
          users={companyUsers}
          currentUser={currentUser}
          onUpdateStatus={async (id, status) => {
            const timesheet = timesheets.find(t => t.id === id);
            if (timesheet) {
              await addNotification({
                userId: timesheet.userId,
                title: `Timesheet ${status}`,
                message: `Your timesheet for ${timesheet.date} has been ${status.toLowerCase()} by ${currentUser.name}.`,
                linkTo: 'TIMESHEETS'
              });
            }
            await setTimesheets(prev => prev.map(t => t.id === id ? { ...t, status, approverId: currentUser.id } : t));
          }}
          canApprove={canApproveItems}
          projects={companyProjects}
          tasks={tasks}
          onExport={canExport ? handleExportTimesheetsByDay : undefined}
        />;
      }
      case 'TEAM_LEAVE': {
        let itemsToReview: LeaveRequest[];
        let viewTitle: string;
        let canApproveItems = true;

        if (currentUser.role === Role.MANAGER) {
          // Manager sees all leave requests in company
          itemsToReview = leaveRequests.filter(l => companyUserIds.includes(l.userId));
          viewTitle = "All Leave Requests";
        } else if (currentUser.role === Role.ADMIN) {
          // Admin sees Team Leader and Employee leave requests (not Manager's)
          itemsToReview = leaveRequests.filter(l => {
            const submitter = companyUsers.find(u => u.id === l.userId);
            return submitter && submitter.role !== Role.MANAGER && companyUserIds.includes(l.userId);
          });
          viewTitle = "Team Leave Requests";
        } else { // Team Leader
          const teamMemberIds = teamMembers.map(tm => tm.id);
          itemsToReview = leaveRequests.filter(l => teamMemberIds.includes(l.userId));
          viewTitle = "Team Leave Requests";
        }

        return <ManagerReviewPage
          title={viewTitle}
          items={itemsToReview}
          users={companyUsers}
          currentUser={currentUser}
          onUpdateStatus={async (id, status) => {
            const leaveRequest = leaveRequests.find(l => l.id === id);
            if (leaveRequest) {
              await addNotification({
                userId: leaveRequest.userId,
                title: `Leave Request ${status}`,
                message: `Your leave request for ${leaveRequest.leaveEntries[0]?.date} has been ${status.toLowerCase()} by ${currentUser.name}.`,
                linkTo: 'LEAVE'
              });
            }
            await setLeaveRequests(prev => prev.map(l => l.id === id ? { ...l, status, approverId: currentUser.id } : l));
          }}
          canApprove={canApproveItems}
          projects={companyProjects}
          tasks={tasks}
          onExport={canExport ? handleExportLeaveRequestsByDay : undefined}
        />;
      }
      case 'PROJECTS': {
        let visibleProjects = companyProjects;
        if (currentUser.role === Role.TEAM_LEADER) {
          visibleProjects = companyProjects.filter(p => p.teamLeaderId === currentUser.id || p.teamIds.includes(currentUser.id));
        } else if (currentUser.role === Role.EMPLOYEE) {
          visibleProjects = companyProjects.filter(p => p.teamIds.includes(currentUser.id));
        }

        const visibleProjectIds = visibleProjects.map(p => p.id);
        const visibleTasks = tasks.filter(t => visibleProjectIds.includes(t.projectId));

        return <ProjectManagementPage
          projects={visibleProjects}
          setProjects={setProjects}
          users={companyUsers}
          currentUser={currentUser}
          onExport={canExport ? handleExportProjects : undefined}
          tasks={visibleTasks}
          setTasks={setTasks}
          addNotification={addNotification}
          addToastNotification={addToastNotification}
        />;
      }
      case 'USERS': {
        const usersForView = (currentUser.role === Role.TEAM_LEADER)
          ? teamMembers
          : companyUsers;

        return <UserManagementPage
          users={usersForView}
          allUsers={companyUsers}
          setUsers={setUsers}
          currentUser={currentUser}
          onDeleteUser={handleDeleteUser}
          projects={companyProjects}
          timesheets={companyTimesheets}
          leaveRequests={companyLeaveRequests}
          onSetBestEmployee={() => setIsBestEmployeeModalOpen(true)}
          onSetBestEmployeeOfYear={() => setIsBestEmployeeOfYearModalOpen(true)}
          onViewEmployee={(userId) => {
            setViewedEmployeeId(userId);
            setView('EMPLOYEE_DETAIL');
          }}
          isSuperAdmin={isSuperAdmin}
        />;
      }
      case 'EMPLOYEE_DETAIL': {
        const employee = companyUsers.find(u => u.id === viewedEmployeeId);
        if (!employee) {
          setView('USERS');
          return null;
        }
        return <EmployeeDetailPage
          employee={employee}
          timesheets={companyTimesheets.filter(t => t.userId === viewedEmployeeId)}
          leaveRequests={companyLeaveRequests.filter(l => l.userId === viewedEmployeeId)}
          projects={companyProjects}
          onBack={() => {
            setViewedEmployeeId(null);
            setView('USERS');
          }}
          allUsers={companyUsers}
        />;
      }
      default:
        return <ProfilePage user={currentUser} onUpdateUser={handleUpdateUser} currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <Sidebar
        user={currentUser}
        setView={setView}
        currentView={view}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        pendingTimesheetCount={pendingTimesheetCount}
        pendingLeaveCount={pendingLeaveCount}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Header
          user={currentUser}
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          userNotifications={userNotifications}
          onToggleNotifications={() => setIsNotificationCenterOpen(prev => !prev)}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={requestNotificationPermission}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8 hide-scrollbar">
          {renderView()}
        </main>
      </div>
      {isBestEmployeeModalOpen && (
        <SetBestEmployeeModal
          users={companyUsers.filter(u => u.role === Role.EMPLOYEE || u.role === Role.TEAM_LEADER)}
          onClose={() => setIsBestEmployeeModalOpen(false)}
          onSet={handleSetBestEmployees}
          selectedIds={bestEmployeeIds}
        />
      )}
      {isBestEmployeeOfYearModalOpen && (
        <SetBestEmployeeOfYearModal
          users={companyUsers.filter(u => u.role === Role.EMPLOYEE || u.role === Role.TEAM_LEADER)}
          onClose={() => setIsBestEmployeeOfYearModalOpen(false)}
          onSet={handleSetBestEmployeeOfYear}
          selectedIds={bestEmployeeOfYearIds}
        />
      )}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={userNotifications}
        setView={setView}
        markAllNotificationsAsRead={markAllNotificationsAsRead}
        dismissNotification={dismissNotification}
        dismissAllNotifications={dismissAllNotifications}
        permanentlyDeleteNotification={permanentlyDeleteNotification}
        unreadCount={userNotifications.filter(n => !n.read).length}
      />
      <div className="fixed top-5 right-5 z-[2147483647] space-y-7">
        {toastNotifications.map(notifi => (
          <NotificationToast
            key={notifi.id}
            message={notifi.message}
            title={notifi.title}
            onClose={() => removeToastNotification(notifi.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default App;
