
import React from 'react';

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (newMonth: Date) => void;
  selectedDate: string; // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  highlightedDates?: Set<string>;
}

export const Calendar: React.FC<CalendarProps> = ({ currentMonth, onMonthChange, selectedDate, onDateSelect, minDate, maxDate, highlightedDates }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(new Date(year, parseInt(e.target.value), 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onMonthChange(new Date(parseInt(e.target.value), month, 1));
  };

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isDateDisabled = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' }));
  const startYear = 2020;
  const endYear = new Date().getFullYear() + 5;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 w-72">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Previous month">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
            <select value={month} onChange={handleMonthChange} className="p-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold">
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={year} onChange={handleYearChange} className="p-1 rounded bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 focus:ring-sky-500 focus:border-sky-500 text-sm font-semibold">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>
        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Next month">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 dark:text-slate-400 font-semibold">
        {weekdays.map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isDisabled = isDateDisabled(day);
          const isHighlighted = highlightedDates?.has(dateStr) && !isSelected;
          return (
            <button
              key={day}
              onClick={() => onDateSelect(dateStr)}
              disabled={isDisabled}
              className={`
                h-9 w-9 rounded-full text-sm text-center transition-colors relative
                ${isSelected ? 'bg-sky-500 text-white font-semibold' : 'hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}
                ${isDisabled ? 'text-slate-300 dark:text-slate-500 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent' : ''}
              `}
            >
              {day}
              {isHighlighted && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-sky-500"></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
