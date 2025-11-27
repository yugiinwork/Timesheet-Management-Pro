
import React from 'react';
import { User } from '../types';

interface BestEmployeeWidgetProps {
  bestEmployeeIds: number[];
  users: User[];
}

export const BestEmployeeWidget: React.FC<BestEmployeeWidgetProps> = ({ bestEmployeeIds, users }) => {
  const employees = users.filter(u => bestEmployeeIds.includes(u.id));

  if (employees.length === 0) {
    return (
        <div className="bg-gradient-to-br from-amber-300 to-yellow-500 dark:from-amber-500 dark:to-yellow-700 p-4 rounded-lg text-center shadow-lg my-4 flex items-center justify-center h-[209px]">
            <p className="text-white opacity-75">No employee of the month set.</p>
        </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-amber-300 to-yellow-500 dark:from-amber-500 dark:to-yellow-700 p-4 rounded-lg text-center shadow-lg my-4">
       <div className="flex items-center justify-center gap-2 text-white dark:text-yellow-100 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            <h3 className="font-bold text-md uppercase tracking-wider">Employee{employees.length > 1 ? 's' : ''} of the Month</h3>
       </div>
       <div className="flex items-start justify-center gap-4">
            {employees.map(employee => (
                <div key={employee.id} className="flex flex-col items-center max-w-[120px]">
                    <img 
                        src={employee.profilePictureUrl}
                        alt={employee.name}
                        className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white/50"
                    />
                    <h4 className="mt-2 font-semibold text-white text-lg">{employee.name}</h4>
                    <p className="text-xs text-yellow-100 dark:text-yellow-200">{employee.designation}</p>
                </div>
            ))}
       </div>
    </div>
  );
};