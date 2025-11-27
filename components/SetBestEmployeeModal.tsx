
import React, { useState } from 'react';
import { User } from '../types';

interface SetBestEmployeeModalProps {
  users: User[];
  onClose: () => void;
  onSet: (userIds: number[]) => void;
  selectedIds: number[];
}

export const SetBestEmployeeModal: React.FC<SetBestEmployeeModalProps> = ({ users, onClose, onSet, selectedIds }) => {
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(selectedIds);

  const handleSet = () => {
    onSet(selectedUserIds);
  };

  const handleCheckboxChange = (userId: number) => {
    setSelectedUserIds(prev => {
        const isSelected = prev.includes(userId);
        if (isSelected) {
            return prev.filter(id => id !== userId);
        } else {
            if (prev.length < 2) {
                return [...prev, userId];
            }
            return prev; // Do not add more than 2
        }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Set Employee of the Month</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">&times;</button>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6">Select up to two employees to recognize their outstanding performance.</p>
        
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {users.map(user => {
                const isSelected = selectedUserIds.includes(user.id);
                const isDisabled = !isSelected && selectedUserIds.length >= 2;

                return (
                    <label key={user.id} className={`flex items-center p-3 rounded-lg border-2 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'bg-sky-50 border-sky-500 dark:bg-sky-900/50' : 'bg-white border-slate-200 dark:bg-slate-700 dark:border-slate-600'}`}>
                        <input 
                            type="checkbox" 
                            name="best-employee" 
                            className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                            checked={isSelected}
                            onChange={() => handleCheckboxChange(user.id)}
                            disabled={isDisabled}
                        />
                        <img src={user.profilePictureUrl} alt={user.name} className="w-10 h-10 rounded-full mx-4 object-cover"/>
                        <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">{user.designation}</div>
                        </div>
                    </label>
                );
            })}
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">
            Cancel
          </button>
          <button 
            onClick={handleSet} 
            disabled={selectedUserIds.length === 0}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            Set Employee(s)
          </button>
        </div>
      </div>
    </div>
  );
};