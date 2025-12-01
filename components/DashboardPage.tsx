
import React from 'react';
import { formatDate } from '../utils';
import { User, Role, Timesheet, LeaveRequest, Project, Status, Task, TaskImportance } from '../types';
import { BestEmployeeWidget } from './BestEmployeeWidget';
import { BestEmployeeOfYearWidget } from './BestEmployeeOfYearWidget';

interface DashboardPageProps {
    currentUser: User;
    users: User[];
    timesheets: Timesheet[];
    leaveRequests: LeaveRequest[];
    projects: Project[];
    tasks: Task[];
    bestEmployeeIds: number[];
    bestEmployeeOfYearIds: number[];
    setView: (view: any) => void;
}

const MyProjectsWidget: React.FC<{ projects: Project[], currentUser: User }> = ({ projects, currentUser }) => {
    const myProjectsCount = projects.filter(p => p.teamIds.includes(currentUser.id) || p.managerId === currentUser.id || p.teamLeaderId === currentUser.id).length;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
                <div className="p-3 rounded-full bg-sky-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">My Projects</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{myProjectsCount}</p>
                </div>
            </div>
        </div>
    )
}

const ClockWidget: React.FC = () => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}.${pad(date.getMinutes())}.${pad(date.getSeconds())}`;
    };

    return (
        <div className="text-sm font-mono text-slate-500 dark:text-slate-400">
            {formatTime(time)}
        </div>
    );
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, users, timesheets, leaveRequests, projects, tasks, bestEmployeeIds, bestEmployeeOfYearIds, setView }) => {

    const isManagerial = [Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role);

    const myRecentActivity = [
        ...timesheets.filter(t => t.userId === currentUser.id).map(t => ({ ...t, type: 'Timesheet', date: t.date })),
        ...leaveRequests.filter(l => l.userId === currentUser.id).map(l => ({ ...l, type: 'Leave', date: (l.leaveEntries || [])[0]?.date || '' }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const teamRecentActivity = isManagerial ? (() => {
        const filterByRole = (item: any) => {
            if (currentUser.role === Role.MANAGER) {
                // Manager sees all activity
                return true;
            } else if (currentUser.role === Role.ADMIN) {
                // Admin sees Team Leader and Employee activity (not Manager's)
                const submitter = users.find(u => u.id === item.userId);
                return submitter && submitter.role !== Role.MANAGER;
            } else {
                // Team Leader sees their team members
                return users.find(u => u.id === item.userId)?.managerId === currentUser.id;
            }
        };

        return [
            ...timesheets.filter(filterByRole).map(t => ({ ...t, type: 'Timesheet', date: t.date })),
            ...leaveRequests.filter(filterByRole).map(l => ({ ...l, type: 'Leave', date: (l.leaveEntries || [])[0]?.date || '' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    })() : [];

    const myOpenTasks = tasks
        .filter(t => (t.assignedTo || []).includes(currentUser.id) && t.status !== 'Done')
        .sort((a, b) => {
            const importanceOrder = { [TaskImportance.HIGH]: 1, [TaskImportance.MEDIUM]: 2, [TaskImportance.LOW]: 3 };
            const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
            const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;

            if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
                return importanceOrder[a.importance] - importanceOrder[b.importance];
            }
            return deadlineA - deadlineB;
        });


    const getStatusBadge = (status: Status) => {
        const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full";
        switch (status) {
            case Status.PENDING: return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
            case Status.APPROVED: return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
            case Status.REJECTED: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
        }
    }

    const getImportanceBadge = (importance: TaskImportance) => {
        const baseClasses = "px-2 py-0.5 text-xs font-medium rounded-full";
        switch (importance) {
            case TaskImportance.HIGH: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
            case TaskImportance.MEDIUM: return `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300`;
            case TaskImportance.LOW: return `${baseClasses} bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300`;
            default: return `${baseClasses} bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300`;
        }
    }



    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Welcome back, {currentUser.name}!</h1>
                    <p className="text-slate-500 dark:text-slate-400">Here's your dashboard overview for today.</p>
                </div>
                <ClockWidget />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {myOpenTasks.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">My Open Tasks</h2>
                                <button onClick={() => setView('TASKS')} className="text-sm font-medium text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200">
                                    View All
                                </button>
                            </div>
                            <ul className="space-y-3">
                                {myOpenTasks.slice(0, 5).map(task => (
                                    <li key={task.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-semibold">{task.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {projects.find(p => p.id === task.projectId)?.name}
                                                {task.deadline && ` - Due: ${formatDate(task.deadline)}`}
                                            </p>
                                        </div>
                                        <span className={getImportanceBadge(task.importance)}>{task.importance}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-bold mb-4">My Recent Activity</h2>
                        <ul className="space-y-3">
                            {myRecentActivity.map(item => (
                                <li key={`${item.type}-${item.id}`} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center">
                                        <span className={`mr-3 p-1.5 rounded-full ${item.type === 'Timesheet' ? 'bg-sky-100 dark:bg-sky-900' : 'bg-green-100 dark:bg-green-900'}`}>
                                            {item.type === 'Timesheet' ?
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> :
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            }
                                        </span>
                                        <p>{item.type} for {formatDate(item.date)}</p>
                                    </div>
                                    <span className={getStatusBadge(item.status)}>{item.status}</span>
                                </li>
                            ))}
                            {myRecentActivity.length === 0 && <p className="text-sm text-slate-500">No recent activity.</p>}
                        </ul>
                    </div>
                    {isManagerial && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-bold mb-4">Recent Team Activity</h2>
                            <ul className="space-y-3">
                                {teamRecentActivity.map(item => (
                                    <li key={`${item.type}-${item.id}`} className="flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-semibold">{users.find(u => u.id === item.userId)?.name}</span>
                                            <span className="text-slate-500"> - {item.type} for {formatDate(item.date)}</span>
                                        </div>
                                        <span className={getStatusBadge(item.status)}>{item.status}</span>
                                    </li>
                                ))}
                                {teamRecentActivity.length === 0 && <p className="text-sm text-slate-500">No recent team activity.</p>}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="space-y-6">
                    <BestEmployeeOfYearWidget bestEmployeeOfYearIds={bestEmployeeOfYearIds} users={users} />
                    <BestEmployeeWidget bestEmployeeIds={bestEmployeeIds} users={users} />
                    {currentUser.role === Role.TEAM_LEADER && (
                        <MyProjectsWidget projects={projects} currentUser={currentUser} />
                    )}
                </div>
            </div>
        </div>
    );
};