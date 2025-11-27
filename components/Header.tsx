import React, { useState, useEffect } from 'react';
import { User, Notification, Role } from '../types';

interface HeaderProps {
  user: User;
  onToggleSidebar: () => void;
  userNotifications: Notification[];
  onToggleNotifications: () => void;
  notificationPermission: string;
  onRequestNotificationPermission: () => void;
  theme: string;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onToggleSidebar, userNotifications, onToggleNotifications, notificationPermission, onRequestNotificationPermission, theme, onToggleTheme }) => {

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time in IST
  const formatISTTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Format date in IST
  const formatISTDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow-sm p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
      <button onClick={onToggleSidebar} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 lg:hidden">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* IST Time Display */}
      <div className="flex-1 flex justify-center items-center">
        <div className="text-center hidden md:block">
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
            {formatISTTime(currentTime)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {formatISTDate(currentTime)} IST
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
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

        {notificationPermission === 'default' && (
          <button
            onClick={onRequestNotificationPermission}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 relative"
            title="Enable browser notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-800">+</span>
          </button>
        )}

        {notificationPermission === 'denied' && (
          <button
            onClick={() => alert("Notifications are blocked by your browser. Please click the lock icon 🔒 in the address bar and select 'Allow' for Notifications, then refresh the page.")}
            className="p-2 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 relative"
            title="Notifications are blocked. Click for help."
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {notificationPermission === 'granted' && (
          <button
            onClick={() => {
              const testNotif = new window.Notification('Test Notification', {
                body: 'This is a test browser notification. If you see this, notifications are working!',
                icon: '/vite.svg',
              });
              console.log('[Test] Browser notification created:', testNotif);
            }}
            className="p-2 rounded-full text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-500"
            title="Test browser notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        )}

        <div className="text-right">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
          <p className="text-sm text-sky-600 dark:text-sky-400">{user.role}</p>
        </div>
        <img
          className="h-10 w-10 rounded-full object-cover"
          src={user.profilePictureUrl || `https://picsum.photos/seed/${user.id}/100`}
          alt="User Avatar"
        />
      </div>
    </header>
  );
};
