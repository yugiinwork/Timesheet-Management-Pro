import React, { useState, useMemo, useRef, useEffect } from 'react';
import { formatDate } from '../utils';
import { Timesheet, LeaveRequest, Status, User, Role, Project, Task, LeaveEntry } from '../types';
import { Calendar } from './Calendar';

type ReviewItem = (Timesheet | LeaveRequest) & { id: number; userId: number; status: Status; approverId?: number };

interface ManagerReviewPageProps {
  title: string;
  items: ReviewItem[];
  users: User[];
  currentUser: User;
  onUpdateStatus: (id: number, status: Status) => void;
  canApprove: boolean;
  projects: Project[];
  tasks: Task[];
  onExport?: (startDate?: string, endDate?: string) => void;
}

const getStatusBadge = (status: Status) => {
  const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
  switch (status) {
    case Status.PENDING: return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
    case Status.APPROVED: return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
    case Status.REJECTED: return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`;
  }
};

const getLeaveEntryDetails = (entry: LeaveEntry) => {
  if (entry.leaveType === 'Half Day') {
    return `Half Day (${entry.halfDaySession})`
  }
  return 'Full Day';
}

const getLeaveSummary = (req: LeaveRequest) => {
  const entries = req.leaveEntries || [];
  if (entries.length === 0) return 'No dates';
  const sortedDates = entries.map(e => e.date).sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  let totalDays = 0;
  entries.forEach(e => {
    totalDays += e.leaveType === 'Full Day' ? 1 : 0.5;
  });

  const dateRange = startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} to ${formatDate(endDate)}`;
  return `${dateRange} (${totalDays} day${totalDays !== 1 ? 's' : ''})`;
}

const DetailsModal: React.FC<{ item: ReviewItem, users: User[], projects: Project[], onClose: () => void }> = ({ item, users, projects, onClose }) => {
  const isTimesheet = (item: ReviewItem): item is Timesheet => 'projectWork' in item;
  const isLeave = (item: ReviewItem): item is LeaveRequest => 'leaveEntries' in item;

  const employee = users.find(u => u.id === item.userId);
  const approver = item.approverId ? users.find(u => u.id === item.approverId) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-2xl shadow-xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            Request Details
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
        </div>
        <div className="space-y-4 text-sm">
          <p><strong className="text-slate-500 dark:text-slate-400 w-28 inline-block">Employee:</strong> {employee?.name}</p>
          <p><strong className="text-slate-500 dark:text-slate-400 w-28 inline-block">Status:</strong> <span className={getStatusBadge(item.status)}>{item.status}</span></p>
          {approver && <p><strong className="text-slate-500 dark:text-slate-400 w-28 inline-block">Processed By:</strong> {approver.name}</p>}

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            {isTimesheet(item) && (
              <div className="space-y-4">
                <p><strong className="text-slate-500 dark:text-slate-400 w-28 inline-block">Date:</strong> {formatDate(item.date)}</p>
                <p><strong className="text-slate-500 dark:text-slate-400 w-28 inline-block">Time:</strong> {item.inTime} - {item.outTime}</p>
                <p className="mt-2"><strong className="text-slate-500 dark:text-slate-400 block mb-1">Work Done Details:</strong></p>
                <div className="space-y-3">
                  {(item.projectWork || []).map((pw, pwIndex) => (
                    <div key={pwIndex} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                      <h4 className="font-semibold">{projects.find(p => p.id === pw.projectId)?.name || 'N/A'}</h4>
                      <ul className="list-disc list-inside space-y-1 mt-1 pl-2">
                        {pw.workEntries.map((entry, index) => (
                          <li key={index}><strong>{entry.hours} hrs:</strong> {entry.description}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isLeave(item) && (
              <>
                <p className="mt-2"><strong className="text-slate-500 dark:text-slate-400 block mb-1">Reason:</strong></p>
                <p className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md whitespace-pre-wrap mb-4">{item.reason}</p>
                <p className="mt-2"><strong className="text-slate-500 dark:text-slate-400 block mb-1">Leave Dates:</strong></p>
                <ul className="list-disc list-inside p-2 bg-slate-100 dark:bg-slate-700 rounded-md space-y-1">
                  {(item.leaveEntries || []).map((entry, index) => (
                    <li key={index}><strong>{formatDate(entry.date)}:</strong> {getLeaveEntryDetails(entry)}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">Close</button>
        </div>
      </div>
    </div>
  )
}

export const ManagerReviewPage: React.FC<ManagerReviewPageProps> = ({ title, items, users, currentUser, onUpdateStatus, canApprove, projects, onExport }) => {
  const [activeTab, setActiveTab] = useState<'Pending' | 'History'>('Pending');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');
  const [calendarOpenFor, setCalendarOpenFor] = useState<'start' | 'end' | null>(null);
  const [exportCalendarMonth, setExportCalendarMonth] = useState(new Date());

  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [dateFilterCalendarMonth, setDateFilterCalendarMonth] = useState(new Date());
  const [isDateFilterCalendarOpen, setIsDateFilterCalendarOpen] = useState(false);

  const dateRangePickerRef = useRef<HTMLDivElement>(null);
  const dateFilterRef = useRef<HTMLDivElement>(null);

  const getUserName = (userId: number) => users.find(u => u.id === userId)?.name || 'Unknown';
  const isTimesheet = (item: ReviewItem): item is Timesheet => 'projectWork' in item;
  const isLeave = (item: ReviewItem): item is LeaveRequest => 'leaveEntries' in item;
  const isTimesheetPage = useMemo(() => items.length > 0 && isTimesheet(items[0]), [items]);


  const highlightedDates = useMemo(() => {
    const dates = new Set<string>();
    items.forEach(item => {
      if (isTimesheet(item)) {
        dates.add(item.date);
      } else if (isLeave(item)) {
        (item.leaveEntries || []).forEach(entry => {
          dates.add(entry.date);
        });
      }
    });
    return dates;
  }, [items]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRangePickerRef.current && !dateRangePickerRef.current.contains(event.target as Node)) {
        setCalendarOpenFor(null);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target as Node)) {
        setIsDateFilterCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportDateSelect = (date: string) => {
    if (calendarOpenFor === 'start') {
      setExportStartDate(date);
      if (exportEndDate && date > exportEndDate) {
        setExportEndDate('');
      }
      setCalendarOpenFor('end');
      setExportCalendarMonth(new Date(date + 'T00:00:00'));
    } else if (calendarOpenFor === 'end') {
      setExportEndDate(date);
      setCalendarOpenFor(null);
    }
  };

  const handleDateFilterSelect = (date: string) => {
    setSelectedDateFilter(date);
    setIsDateFilterCalendarOpen(false);
  }

  const toggleCalendar = (target: 'start' | 'end') => {
    if (calendarOpenFor === target) {
      setCalendarOpenFor(null);
    } else {
      const dateToUse = target === 'start' ? exportStartDate : exportEndDate;
      const fallbackDate = target === 'end' && exportStartDate ? exportStartDate : new Date().toISOString().split('T')[0];
      const initialDate = dateToUse || fallbackDate;

      const validDateString = initialDate.includes('T') ? initialDate : initialDate + 'T00:00:00';
      setExportCalendarMonth(new Date(validDateString));
      setCalendarOpenFor(target);
    }
  };

  const getTimesheetSummary = (item: Timesheet) => {
    const works = item.projectWork || [];
    const totalHours = works.reduce((sum, pw) => sum + pw.workEntries.reduce((s, we) => s + we.hours, 0), 0);
    const projectNames = works.map(pw => {
      if (pw.projectId === 0) {
        return 'General/Admin Tasks';
      }
      return projects.find(p => p.id === pw.projectId)?.name || 'Unknown Project';
    }).join(', ');
    return `${projectNames} (${totalHours} hrs)`;
  }

  const processedItems = useMemo(() => {
    let filteredItems = items;

    if (selectedDateFilter) {
      filteredItems = items.filter(item => {
        try {
          const filterDate = new Date(selectedDateFilter + 'T00:00:00').toISOString().split('T')[0];

          if (isTimesheet(item)) {
            if (!item.date) return false;
            // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS.SSSZ" formats
            const itemDateObj = new Date(item.date);
            if (isNaN(itemDateObj.getTime())) return false;
            const itemDate = itemDateObj.toISOString().split('T')[0];
            return itemDate === filterDate;
          }

          if (isLeave(item)) {
            return (item.leaveEntries || []).some(entry => {
              if (!entry.date) return false;
              // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS.SSSZ" formats
              const entryDateObj = new Date(entry.date);
              if (isNaN(entryDateObj.getTime())) return false;
              const entryDate = entryDateObj.toISOString().split('T')[0];
              return entryDate === filterDate;
            });
          }

          return false;
        } catch (error) {
          console.error('Date filter error:', error);
          return false;
        }
      });
    }

    const itemsWithUser = filteredItems.map(item => ({
      ...item,
      user: users.find(u => u.id === item.userId),
    })).filter(item => item.user);

    let filtered = itemsWithUser;

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const userName = item.user!.name.toLowerCase();
        if (userName.includes(lowercasedQuery)) return true;

        if (isTimesheet(item)) {
          const summary = getTimesheetSummary(item as Timesheet).toLowerCase();
          if (summary.includes(lowercasedQuery)) return true;
        }
        if (isLeave(item)) {
          const reason = (item as LeaveRequest).reason.toLowerCase();
          if (reason.includes(lowercasedQuery)) return true;
        }
        return false;
      });
    }

    if (isTimesheetPage && projectFilter) {
      const projectId = Number(projectFilter);
      filtered = filtered.filter(item =>
        ((item as Timesheet).projectWork || []).some(pw => pw.projectId === projectId)
      );
    }

    filtered.sort((a, b) => {
      const [sortField, sortDir] = sortBy.split('_');
      const valA = sortField === 'name' ? a.user!.name.toLowerCase() : a.user!.employeeId;
      const valB = sortField === 'name' ? b.user!.name.toLowerCase() : b.user!.employeeId;

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, users, sortBy, searchQuery, projects, selectedDateFilter, projectFilter, isTimesheetPage]);

  const pendingItems = processedItems.filter(i => i.status === Status.PENDING);

  const historyItems = useMemo(() => {
    let history = processedItems.filter(i => i.status !== Status.PENDING);
    if (statusFilter) {
      history = history.filter(i => i.status === statusFilter);
    }
    return history;
  }, [processedItems, statusFilter]);

  const renderTable = (data: ReviewItem[], isHistory: boolean) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Employee</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
            {isHistory && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Processed By</th>}
            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
          {data.map(item => (
            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-200">{getUserName(item.userId)}</div>
                <div className="text-xs text-slate-500">{users.find(u => u.id === item.userId)?.designation}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                {isTimesheet(item) ? formatDate(item.date) : formatDate((item.leaveEntries || [])[0]?.date)}
              </td>
              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-sm truncate">
                {isTimesheet(item) && (
                  <div title={getTimesheetSummary(item)}>{getTimesheetSummary(item)}</div>
                )}
                {isLeave(item) && (
                  <div title={item.reason}>
                    <span className="font-semibold">{getLeaveSummary(item)}: </span>
                    {item.reason}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={getStatusBadge(item.status)}>{item.status}</span>
              </td>
              {isHistory && <td className="px-6 py-4 whitespace-nowrap text-sm">{item.approverId ? getUserName(item.approverId) : 'N/A'}</td>}
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }} className="px-3 py-1 text-xs text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500">View</button>
                {canApprove && !isHistory && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(item.id, Status.APPROVED); }} className="px-3 py-1 text-xs text-white bg-green-600 rounded-md hover:bg-green-700">Approve</button>
                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(item.id, Status.REJECTED); }} className="px-3 py-1 text-xs text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={isHistory ? 5 : 4} className="text-center py-10 text-slate-500 dark:text-slate-400">
                {selectedDateFilter ? `No requests found for ${formatDate(selectedDateFilter)}.` : `No ${activeTab.toLowerCase()} requests found.`}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{title}</h1>
        {onExport && (
          <div ref={dateRangePickerRef} className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50">
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Export Range:</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleCalendar('start')}
                className="p-2 w-36 text-left bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm flex justify-between items-center"
              >
                {exportStartDate ? formatDate(exportStartDate) : <span className="text-slate-400">Start Date</span>}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              {calendarOpenFor === 'start' && (
                <div className="absolute top-full mt-2 z-10 left-0">
                  <Calendar
                    currentMonth={exportCalendarMonth}
                    onMonthChange={setExportCalendarMonth}
                    selectedDate={exportStartDate}
                    onDateSelect={handleExportDateSelect}
                    maxDate={exportEndDate || undefined}
                    highlightedDates={highlightedDates}
                  />
                </div>
              )}
            </div>
            <span className="text-slate-500">to</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleCalendar('end')}
                className="p-2 w-36 text-left bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm flex justify-between items-center"
              >
                {exportEndDate ? formatDate(exportEndDate) : <span className="text-slate-400">End Date</span>}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              {calendarOpenFor === 'end' && (
                <div className="absolute top-full mt-2 z-10 right-0">
                  <Calendar
                    currentMonth={exportCalendarMonth}
                    onMonthChange={setExportCalendarMonth}
                    selectedDate={exportEndDate}
                    onDateSelect={handleExportDateSelect}
                    minDate={exportStartDate || undefined}
                    highlightedDates={highlightedDates}
                  />
                </div>
              )}
            </div>
            <button
              onClick={() => onExport(exportStartDate, exportEndDate)}
              disabled={!exportStartDate || !exportEndDate}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>Export</span>
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg">
        <div className="p-4 flex flex-wrap items-end gap-4 text-sm border-b border-slate-200 dark:border-slate-700">
          <div className="relative flex-grow min-w-[200px]">
            <label htmlFor="search-filter" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Search</label>
            <div className="relative">
              <input
                id="search-filter"
                type="search"
                placeholder="By name, project, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
          <div className="flex-grow min-w-[150px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Filter by Date</label>
            <div className="relative" ref={dateFilterRef}>
              <button
                type="button"
                onClick={() => setIsDateFilterCalendarOpen(prev => !prev)}
                className="p-2 w-full text-left bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm flex justify-between items-center"
              >
                <span>{selectedDateFilter ? formatDate(selectedDateFilter) : 'All Dates'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
              {isDateFilterCalendarOpen && (
                <div className="absolute top-full mt-2 z-10">
                  <Calendar
                    currentMonth={dateFilterCalendarMonth}
                    onMonthChange={setDateFilterCalendarMonth}
                    selectedDate={selectedDateFilter || ''}
                    onDateSelect={handleDateFilterSelect}
                    highlightedDates={highlightedDates}
                  />
                </div>
              )}
            </div>
          </div>
          {selectedDateFilter && (
            <div className="pb-1">
              <button
                onClick={() => setSelectedDateFilter(null)}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
                aria-label="Clear date filter"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex-grow min-w-[150px]">
            <label htmlFor="status-filter" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as Status | '')}
              className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={activeTab === 'Pending'}
            >
              <option value="">All History</option>
              <option value={Status.APPROVED}>Approved</option>
              <option value={Status.REJECTED}>Rejected</option>
            </select>
          </div>
          {isTimesheetPage && (
            <div className="flex-grow min-w-[150px]">
              <label htmlFor="project-filter" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Project</label>
              <select id="project-filter" value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                <option value="">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Sort By</label>
            <div className="flex">
              <select value={sortBy.split('_')[0]} onChange={e => setSortBy(`${e.target.value}_${sortBy.split('_')[1]}`)} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-l-md">
                <option value="name">Name</option>
                <option value="empId">Employee ID</option>
              </select>
              <button onClick={() => setSortBy(`${sortBy.split('_')[0]}_asc`)} className={`px-3 py-2 border ${sortBy.endsWith('_asc') ? 'bg-sky-500 text-white border-sky-500' : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-600'}`}>▲</button>
              <button onClick={() => setSortBy(`${sortBy.split('_')[0]}_desc`)} className={`px-3 py-2 border rounded-r-md ${sortBy.endsWith('_desc') ? 'bg-sky-500 text-white border-sky-500' : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-600'}`}>▼</button>
            </div>
          </div>
        </div>
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
            <button onClick={() => setActiveTab('Pending')} className={`${activeTab === 'Pending' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
              Pending ({pendingItems.length})
            </button>
            <button onClick={() => setActiveTab('History')} className={`${activeTab === 'History' ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>
              History ({historyItems.length})
            </button>
          </nav>
        </div>
        {activeTab === 'Pending' ? renderTable(pendingItems, false) : renderTable(historyItems, true)}
      </div>


      {selectedItem && <DetailsModal item={selectedItem} users={users} projects={projects} onClose={() => setSelectedItem(null)} />}
    </div>
  );
};