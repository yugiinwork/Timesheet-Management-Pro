import React, { useState } from 'react';
import { User, Role, Project, Timesheet, LeaveRequest, Status } from '../types';

interface UserManagementPageProps {
  users: User[]; // The users to display (team members for TL, all for manager/admin)
  allUsers: User[]; // All users in the company for lookups
  setUsers: (updater: React.SetStateAction<User[]>) => Promise<void>;
  currentUser: User;
  onDeleteUser: (userId: number) => Promise<void>;
  projects: Project[];
  timesheets: Timesheet[];
  leaveRequests: LeaveRequest[];
  onSetBestEmployee: () => void;
  onSetBestEmployeeOfYear: () => void;
  onViewEmployee: (userId: number) => void;
  isSuperAdmin?: boolean;
}

const emptyUser = (currentUser: User): Omit<User, 'id'> => ({
  name: '',
  email: '',
  role: Role.EMPLOYEE,
  password: 'admin',
  employeeId: '',
  dob: '',
  phone: '',
  address: '',
  designation: '',
  company: currentUser.company,
});

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
  users,
  allUsers,
  setUsers,
  currentUser,
  onDeleteUser,
  projects,
  timesheets,
  leaveRequests,
  onSetBestEmployee,
  onSetBestEmployeeOfYear,
  onViewEmployee,
  isSuperAdmin = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<User, 'id'> | User>(emptyUser(currentUser));
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<User | null>(null);

  const managersAndLeaders = allUsers.filter(u => u.role === Role.MANAGER || u.role === Role.ADMIN || u.role === Role.TEAM_LEADER);

  const isManagerial = [Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role);
  const isAdmin = currentUser.role === Role.ADMIN;

  const openModal = (user?: User) => {
    setEditingUser(user || emptyUser(currentUser));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['managerId'].includes(name);
    setEditingUser(prev => ({ ...prev, [name]: isNumberField ? (value ? Number(value) : undefined) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ('id' in editingUser) {
      await setUsers(prev => prev.map(u => u.id === editingUser.id ? (editingUser as User) : u));
    } else {
      const newUser: User = {
        id: Date.now(),
        ...editingUser,
      } as User;
      await setUsers(prev => [...prev, newUser]);
    }
    closeModal();
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
          {isAdmin ? 'User Management' : 'My Team'}
        </h1>
        <div className="flex items-center gap-2">
          {isManagerial && (
            <>
              <button
                onClick={onSetBestEmployee}
                className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition flex items-center gap-2 text-sm"
                title="Set Employee of the Month"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <span>EOM</span>
              </button>
              <button
                onClick={onSetBestEmployeeOfYear}
                className="px-3 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition flex items-center gap-2 text-sm"
                title="Set Employee of the Year"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span>EOY</span>
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => openModal()}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm"
            >
              Create User
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {users.map(user => {
          return (
            <div
              key={user.id}
              onClick={() => setViewingUserProfile(user)}
              className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-5 flex flex-col items-center text-center cursor-pointer hover:ring-2 hover:ring-sky-500 transition-all duration-200"
            >
              <div className="relative w-full h-5">
                {isAdmin && user.id !== currentUser.id && (
                  <div className="absolute top-0 right-0 flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openModal(user); }} className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full" aria-label="Edit user"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                    <button onClick={(e) => { e.stopPropagation(); setUserToDelete(user); }} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label="Delete user"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                )}
              </div>

              <img src={user.profilePictureUrl || `https://picsum.photos/seed/${user.id}/100`} alt={user.name} className="w-24 h-24 rounded-full object-cover mb-4 flex-shrink-0" />

              <div className="flex-grow flex flex-col justify-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{user.name}</h3>
                <p className="text-sm text-sky-600 dark:text-sky-400">{user.designation}</p>
                {isSuperAdmin && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{user.company}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-lg max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">
              {'id' in editingUser ? 'Edit' : 'Create'} User
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" placeholder="Full Name" value={editingUser.name} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <input type="text" name="designation" placeholder="Designation" value={editingUser.designation} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <input type="text" name="company" placeholder="Company" value={editingUser.company || ''} onChange={handleInputChange} className={`w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md ${isSuperAdmin ? 'bg-slate-100 dark:bg-slate-700' : 'bg-slate-200 dark:bg-slate-600'}`} disabled={!isSuperAdmin} />
                <input type="email" name="email" placeholder="Email" value={editingUser.email} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <input type="password" name="password" placeholder="Password" value={editingUser.password || ''} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required={'id' in editingUser ? false : true} />
                <input type="text" name="employeeId" placeholder="Employee ID" value={editingUser.employeeId} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <input type="tel" name="phone" placeholder="Phone Number" value={editingUser.phone} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
              </div>
              <div>
                <input type="text" name="address" placeholder="Address" value={editingUser.address} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Date of Birth</label>
                  <input type="date" name="dob" value={editingUser.dob} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Role</label>
                  <select name="role" value={editingUser.role} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required>
                    {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
              </div>

              {(editingUser.role === Role.EMPLOYEE || editingUser.role === Role.TEAM_LEADER) && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Assign Manager</label>
                  <select name="managerId" value={(editingUser as User).managerId || ''} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                    <option value="">None</option>
                    {managersAndLeaders
                      .filter(m => editingUser.role === Role.TEAM_LEADER ? m.role !== Role.TEAM_LEADER : true)
                      .map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Save User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Confirm Deletion</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Are you sure you want to delete the user "{userToDelete.name}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      {viewingUserProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-2xl shadow-xl overflow-hidden">
            {/* Banner */}
            <div className="h-32 bg-gradient-to-r from-sky-500 to-blue-600 relative">
              <img
                src={viewingUserProfile.bannerUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop'}
                alt="Banner"
                className="w-full h-full object-cover opacity-50"
              />
            </div>

            {/* Profile Content */}
            <div className="relative px-8 pb-8">
              {/* Profile Picture */}
              <div className="absolute -top-16 left-8">
                <img
                  src={viewingUserProfile.profilePictureUrl || `https://picsum.photos/seed/${viewingUserProfile.id}/128`}
                  alt={viewingUserProfile.name}
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-slate-800 object-cover"
                />
              </div>

              {/* Close Button */}
              <button
                onClick={() => setViewingUserProfile(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl"
              >
                &times;
              </button>

              {/* User Info */}
              <div className="pt-20">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white">{viewingUserProfile.name}</h2>
                <p className="text-lg text-sky-600 dark:text-sky-400 mt-1">{viewingUserProfile.designation}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{viewingUserProfile.role}</p>

                {/* Details Grid */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Employee ID</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">{viewingUserProfile.employeeId || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Email</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">{viewingUserProfile.email}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Phone</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">{viewingUserProfile.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Date of Birth</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                      {viewingUserProfile.dob ? (() => {
                        const date = new Date(viewingUserProfile.dob);
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}-${month}-${year}`;
                      })() : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg md:col-span-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Address</p>
                    <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">{viewingUserProfile.address || 'N/A'}</p>
                  </div>
                  {viewingUserProfile.managerId && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg md:col-span-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Reports To</p>
                      <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                        {allUsers.find(u => u.id === viewingUserProfile.managerId)?.name || 'N/A'}
                      </p>
                    </div>
                  )}
                  {isSuperAdmin && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg md:col-span-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Company</p>
                      <p className="text-sm text-slate-800 dark:text-slate-100 mt-1">{viewingUserProfile.company || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setViewingUserProfile(null)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setViewingUserProfile(null);
                      onViewEmployee(viewingUserProfile.id);
                    }}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Work Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};