
import React from 'react';
import { User } from '../types';

interface BestEmployeeOfYearWidgetProps {
  bestEmployeeOfYearIds: number[];
  users: User[];
}

export const BestEmployeeOfYearWidget: React.FC<BestEmployeeOfYearWidgetProps> = ({ bestEmployeeOfYearIds, users }) => {
  const employees = users.filter(u => bestEmployeeOfYearIds.includes(u.id));

  if (employees.length === 0) {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg text-center shadow-lg my-4 flex items-center justify-center h-[209px] border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400">Employee of the Year has not been announced.</p>
        </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-sky-500 to-indigo-600 dark:from-sky-700 dark:to-indigo-800 p-4 rounded-lg text-center shadow-2xl my-4 overflow-hidden relative flex flex-col items-center justify-center h-[209px]">
      <div className="absolute inset-0 bg-repeat bg-center opacity-10" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')"}}></div>
      <div className="relative z-10">
        <h3 className="font-serif text-lg font-bold text-white uppercase tracking-widest">Employee of the Year</h3>
        <div className="mt-2 flex items-center justify-center gap-4">
          {employees.map(employee => (
            <div key={employee.id} className="flex flex-col items-center max-w-[120px]">
              <div className="relative">
                <img 
                  src={employee.profilePictureUrl}
                  alt={employee.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-amber-300 shadow-lg"
                />
                <div className="absolute -top-2 -left-2 text-3xl" style={{filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))'}}>
                  🏆
                </div>
              </div>
              <h4 className="mt-2 font-semibold text-white text-lg leading-tight">{employee.name}</h4>
              <p className="text-xs text-indigo-100 dark:text-indigo-200">{employee.designation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
