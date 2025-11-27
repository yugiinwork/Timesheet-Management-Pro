import React, { useState, useMemo } from 'react';
import { formatDate } from '../utils';
import { User, Timesheet, LeaveRequest, Project, Status } from '../types';

interface EmployeeDetailPageProps {
    employee: User;
    timesheets: Timesheet[];
    leaveRequests: LeaveRequest[];
    projects: Project[];
    allUsers: User[];
    onBack: () => void;
}

type FilterPeriod = '7d' | '30d' | 'this_month' | 'all';

const getStatusBadge = (status: Status) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
        case Status.PENDING: return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
        case Status.APPROVED: return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
        case Status.REJECTED: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
    }
};

const getLastActivity = (timesheets: Timesheet[]) => {
    // Sort timesheets to find the most recent one by combining date and outTime
    const userTimesheets = timesheets
        .filter(t => t.status !== Status.REJECTED)
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.outTime}`);
            const dateB = new Date(`${b.date}T${b.outTime}`);
            return dateB.getTime() - dateA.getTime();
        });

    if (userTimesheets.length === 0) {
        return 'N/A';
    }
    const lastSession = userTimesheets[0];
    return `${formatDate(lastSession.date)} at ${lastSession.outTime}`;
};

const getLeaveDaysInPeriod = (leaveRequests: LeaveRequest[]) => {
    const userLeave = leaveRequests.filter(lr => lr.status === Status.APPROVED);
    return userLeave.reduce((total, req) => total + (req.leaveEntries || []).reduce((sum, entry) => sum + (entry.leaveType === 'Full Day' ? 1 : 0.5), 0), 0);
};

const getAvgHoursInPeriod = (timesheets: Timesheet[]) => {
    const recentTimesheets = timesheets.filter(ts => ts.status === Status.APPROVED);
    if (recentTimesheets.length === 0) return 'N/A';
    const totalHours = recentTimesheets.reduce((sum, ts) => {
        return sum + (ts.projectWork || []).reduce((projectSum, pw) =>
            projectSum + pw.workEntries.reduce((entrySum, we) => entrySum + we.hours, 0), 0);
    }, 0);
    const avg = totalHours / recentTimesheets.length;
    return avg.toFixed(1);
};


export const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ employee, timesheets, leaveRequests, projects, allUsers, onBack }) => {
    const [filter, setFilter] = useState<FilterPeriod>('30d');

    const { filteredTimesheets, filteredLeaveRequests, periodLabel } = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let label = '';

        switch (filter) {
            case '7d':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                label = 'Last 7 Days';
                break;
            case '30d':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
                label = 'Last 30 Days';
                break;
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                label = 'This Month';
                break;
            case 'all':
            default:
                startDate = new Date(0); // Epoch time
                label = 'All Time';
                break;
        }

        const fTimesheets = timesheets
            .filter(t => new Date(t.date) >= startDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const fLeaveRequests = leaveRequests
            .filter(lr => lr.leaveEntries.some(e => new Date(e.date) >= startDate))
            .sort((a, b) => new Date(b.leaveEntries[0].date).getTime() - new Date(a.leaveEntries[0].date).getTime());

        return { filteredTimesheets: fTimesheets, filteredLeaveRequests: fLeaveRequests, periodLabel: label };

    }, [filter, timesheets, leaveRequests]);

    // Calculate stats based on filtered data
    const lastActivity = getLastActivity(filteredTimesheets);
    const leaveDays = getLeaveDaysInPeriod(filteredLeaveRequests);
    const avgHours = getAvgHoursInPeriod(filteredTimesheets);

    const getWorkSummary = (ts: Timesheet) => {
        const works = ts.projectWork || [];
        const totalHours = works.reduce((sum, pw) => sum + pw.workEntries.reduce((s, we) => s + we.hours, 0), 0);
        const projectNames = works.map(pw => {
            if (pw.projectId === 0) return 'General/Admin Tasks';
            return projects.find(p => p.id === pw.projectId)?.name || 'Unknown Project';
        }).join(', ');
        return `${projectNames} (${totalHours} hrs)`;
    }

    const getLeaveSummary = (req: LeaveRequest) => {
        const entries = req.leaveEntries || [];
        if (entries.length === 0) return 'No dates';
        const sortedDates = entries.map(e => e.date).sort();
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];
        let totalDays = 0;
        entries.forEach(e => { totalDays += e.leaveType === 'Full Day' ? 1 : 0.5; });
        const dateRange = startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`;
        return `${dateRange} (${totalDays} day${totalDays !== 1 ? 's' : ''})`;
    }

    const manager = allUsers.find(u => u.id === employee.managerId);

    const FilterButton: React.FC<{ period: FilterPeriod, label: string }> = ({ period, label }) => (
        <button
            onClick={() => setFilter(period)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === period
                ? 'bg-sky-500 text-white font-semibold'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
        >
            {label}
        </button>
    );

    const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode }> = ({ icon, label, value }) => (
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-lg text-sky-500">
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <img src={employee.profilePictureUrl} alt={employee.name} className="w-16 h-16 rounded-full object-cover" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{employee.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{employee.designation} {manager && `(Reports to ${manager.name})`}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <FilterButton period="7d" label="Last 7 Days" />
                        <FilterButton period="30d" label="Last 30 Days" />
                        <FilterButton period="this_month" label="This Month" />
                        <FilterButton period="all" label="All Time" />
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} label="Last Activity" value={lastActivity} />
                    <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} label={`Leave (${periodLabel})`} value={`${leaveDays} days`} />
                    <StatCard icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} label={`Avg. Hours/Day`} value={avgHours} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timesheets Section */}
                <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Work Submissions</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredTimesheets.length > 0 ? filteredTimesheets.map(ts => (
                            <div key={ts.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-bold">{formatDate(ts.date)}</p>
                                    <span className={getStatusBadge(ts.status)}>{ts.status}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1" title={getWorkSummary(ts)}>{getWorkSummary(ts)}</p>
                            </div>
                        )) : <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No timesheets in this period.</p>}
                    </div>
                </div>

                {/* Leave Section */}
                <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Leave Requests</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {filteredLeaveRequests.length > 0 ? filteredLeaveRequests.map(lr => (
                            <div key={lr.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="flex justify-between items-center text-sm">
                                    <p className="font-bold">{getLeaveSummary(lr)}</p>
                                    <span className={getStatusBadge(lr.status)}>{lr.status}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate" title={lr.reason}>Reason: {lr.reason}</p>
                            </div>
                        )) : <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No leave requests in this period.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};