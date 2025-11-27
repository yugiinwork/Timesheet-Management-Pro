import React, { useState, useMemo } from 'react';
import { Notification, View } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  setView: (view: View) => void;
  markAllNotificationsAsRead: () => Promise<void>;
  unreadCount: number;
  dismissNotification: (id: number) => Promise<void>;
  dismissAllNotifications: () => Promise<void>;
  permanentlyDeleteNotification: (id: number) => Promise<void>;
}

const timeSince = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return "Just now";
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  setView,
  markAllNotificationsAsRead,
  unreadCount,
  dismissNotification,
  dismissAllNotifications,
  permanentlyDeleteNotification,
}) => {
  // Filter only new (undismissed) notifications
  const newNotifications = useMemo(() => notifications.filter(n => !n.dismissed), [notifications]);

  const handleNotificationClick = async (notifi: Notification) => {
    if (notifi.linkTo) {
      setView(notifi.linkTo);
    }
    onClose();
    await dismissNotification(notifi.id);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 z-[60] ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out z-[70] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Notifications</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-light">&times;</button>
        </div>

        {/* Tabs and Controls */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-md bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 font-semibold">New ({newNotifications.length})</span>
          </div>
          {newNotifications.length > 0 && (
            <button onClick={dismissAllNotifications} className="text-xs text-sky-600 dark:text-sky-400 hover:underline">Dismiss All</button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {newNotifications.length > 0 ? newNotifications.map(n => (
            <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 border-b border-slate-100 dark:border-slate-700/50  transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${!n.read ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
              <div className="flex items-start gap-3">
                {!n.read && <div className="mt-1.5 h-2 w-2 rounded-full bg-sky-500 flex-shrink-0 animate-pulse"></div>}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {n.isAnnouncement && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-2.236 9.168-5.584C18.35 0 18.68 0 19 0c.23 0 .44.04.66.11a.387.387 0 01.168.616C19.165 2.245 18 4.09 18 6h-1a1 1 0 00-1 1v8a1 1 0 001 1h1a1 1 0 001-1v-2.582m-7 0a3 3 0 01-3 3H5.436a3 3 0 01-3-3V6a3 3 0 013-3h5.436a3 3 0 013 3v5.118z" /></svg>
                    )}
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{n.message}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{timeSince(n.createdAt)}</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-300">All caught up!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">You have no new notifications.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};