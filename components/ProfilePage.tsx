
import React, { useState } from 'react';
import { User, Role } from '../types';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (user: User) => void;
  currentUser: User;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    ...user,
    dob: user.dob ? user.dob.split('T')[0] : ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const base64 = await fileToBase64(files[0]);
      setFormData(prev => ({ ...prev, [name]: base64 }));
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(formData);
    setIsEditing(false);
  };

  const InfoField: React.FC<{ label: string, value: string | undefined }> = ({ label, value }) => (
    <div>
      <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</h4>
      <p className="text-md text-slate-800 dark:text-slate-200">{value || 'N/A'}</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-slate-800 shadow-xl rounded-lg overflow-hidden">
        <div className="relative h-48 bg-sky-500">
          <img
            src={formData.bannerUrl || `https://picsum.photos/seed/${user.id}/1200/300`}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
          <img
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-28 w-28 rounded-full object-cover border-4 border-white dark:border-slate-800"
            src={formData.profilePictureUrl || `https://picsum.photos/seed/${user.id}/200`}
            alt="User Avatar"
          />
        </div>
        <div className="pt-20 p-8">
          {isEditing ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Company</label>
                    <input type="text" name="company" value={formData.company} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Date of Birth</label>
                    <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Address</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Profile Picture</label>
                    <input type="file" name="profilePictureUrl" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Banner Image</label>
                    <input type="file" name="bannerUrl" onChange={handleFileChange} accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 transition">Save Changes</button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{user.name}</h2>
                <p className="text-md text-slate-500 dark:text-slate-400 mt-1">{user.company}</p>
                <p className="text-md text-sky-600 dark:text-sky-400 mt-1">{user.designation}</p>
              </div>
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <InfoField label="Employee ID" value={user.employeeId} />
                <InfoField label="Role" value={user.role} />
                <InfoField label="Email Address" value={user.email} />
                <InfoField label="Phone Number" value={user.phone} />
                <InfoField label="Date of Birth" value={user.dob} />
                <div className="md:col-span-2">
                  <InfoField label="Address" value={user.address} />
                </div>
              </div>
              {currentUser.id === user.id && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => {
                      setFormData({
                        ...user,
                        dob: user.dob ? user.dob.split('T')[0] : ''
                      });
                      setIsEditing(true);
                    }}
                    className="px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};