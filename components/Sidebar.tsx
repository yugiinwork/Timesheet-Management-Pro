
import React from 'react';
import { User, Role } from '../types';

interface SidebarProps {
  user: User;
  setView: (view: any) => void;
  currentView: string;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  pendingTimesheetCount: number;
  pendingLeaveCount: number;
}

const NavLink: React.FC<{
  label: string;
  view: string;
  currentView: string;
  setView: (view: string) => void;
  icon: React.ReactElement;
  setIsOpen: (isOpen: boolean) => void;
  badgeCount?: number;
}> = ({ label, view, currentView, setView, icon, setIsOpen, badgeCount }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => {
        setView(view);
        setIsOpen(false);
      }}
      className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${isActive
          ? 'bg-sky-500 text-white font-semibold'
          : 'text-slate-500 dark:text-slate-400 hover:bg-sky-100 dark:hover:bg-slate-700'
        }`}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {badgeCount && badgeCount > 0 && (
        <span className={`text-xs font-bold rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center transition-colors duration-200 ${isActive
            ? 'bg-white text-sky-600'
            : 'bg-sky-500 text-white'
          }`}>
          {badgeCount}
        </span>
      )}
    </button>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({ user, setView, currentView, onLogout, isOpen, setIsOpen, pendingTimesheetCount, pendingLeaveCount }) => {
  const role = user.role;

  const ICONS = {
    DASHBOARD: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
    PROFILE: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    TIMESHEETS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    LEAVE: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    PROJECTS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
    TASKS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    USERS: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    LOGOUT: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  };

  return (
    <div className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 flex flex-col p-4 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-300 ease-in-out z-40 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="mb-8 flex items-center gap-3 flex-shrink-0">
        <div className="bg-sky-500 rounded-lg p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Timesheet Pro</h1>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase">My Space</div>
        <NavLink label="Dashboard" view="DASHBOARD" currentView={currentView} setView={setView} icon={ICONS.DASHBOARD} setIsOpen={setIsOpen} />
        <NavLink label="Profile" view="PROFILE" currentView={currentView} setView={setView} icon={ICONS.PROFILE} setIsOpen={setIsOpen} />
        <NavLink label="My Timesheets" view="TIMESHEETS" currentView={currentView} setView={setView} icon={ICONS.TIMESHEETS} setIsOpen={setIsOpen} />
        <NavLink label="My Leave" view="LEAVE" currentView={currentView} setView={setView} icon={ICONS.LEAVE} setIsOpen={setIsOpen} />
        <NavLink label="My Tasks" view="TASKS" currentView={currentView} setView={setView} icon={ICONS.TASKS} setIsOpen={setIsOpen} />

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase">Company</div>
        <NavLink label="Projects" view="PROJECTS" currentView={currentView} setView={setView} icon={ICONS.PROJECTS} setIsOpen={setIsOpen} />

        {(role === Role.MANAGER || role === Role.TEAM_LEADER || role === Role.ADMIN) && (
          <>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase">
              {role === Role.ADMIN ? 'Admin' : 'Management'}
            </div>
            <NavLink label="Review Timesheets" view="TEAM_TIMESHEETS" currentView={currentView} setView={setView} icon={ICONS.TIMESHEETS} setIsOpen={setIsOpen} badgeCount={pendingTimesheetCount} />
            <NavLink label="Review Leave" view="TEAM_LEAVE" currentView={currentView} setView={setView} icon={ICONS.LEAVE} setIsOpen={setIsOpen} badgeCount={pendingLeaveCount} />
            <NavLink
              label={role === Role.ADMIN ? "User Management" : "My Team"}
              view="USERS"
              currentView={currentView}
              setView={setView}
              icon={ICONS.USERS}
              setIsOpen={setIsOpen}
            />

          </>
        )}
      </nav>
      <div className="mt-auto flex-shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 text-slate-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400"
        >
          {ICONS.LOGOUT}
          <span className="truncate">Logout</span>
        </button>
      </div>
    </div>
  );
};
