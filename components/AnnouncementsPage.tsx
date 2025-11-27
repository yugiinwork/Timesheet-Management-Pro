
import React, { useState, useMemo } from 'react';
import { Notification, User, Role } from '../types';

// This is safe because we load marked from a script tag in index.html
declare var marked: {
  parse(markdown: string): string;
};

interface AnnouncementsPageProps {
    currentUser: User;
    notifications: Notification[];
    onSendAnnouncement: (title: string, message: string) => Promise<void>;
}

const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};


export const AnnouncementsPage: React.FC<AnnouncementsPageProps> = ({ currentUser, notifications, onSendAnnouncement }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            alert("Title and message cannot be empty.");
            return;
        }
        await onSendAnnouncement(title, message);
        setTitle('');
        setMessage('');
    };

    const previousAnnouncements = useMemo(() => {
        const announcementGroups = notifications
            .filter(n => n.isAnnouncement)
            .reduce((acc, n) => {
                // Group by a composite key to identify a single broadcast event
                const key = `${n.createdAt}-${n.title}`;
                if (!acc[key]) {
                    acc[key] = n;
                }
                return acc;
            }, {} as Record<string, Notification>);
        
        return Object.values(announcementGroups)
            // FIX: Explicitly type `a` and `b` to resolve type inference issue with Object.values.
            .sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    }, [notifications]);

    if (![Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role)) {
        return (
            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-300">You do not have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Site Notifications</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Create and send announcements to all users in your company.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6">
                <h2 className="text-xl font-bold mb-4">New Announcement</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="announcement-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Title</label>
                        <input
                            id="announcement-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                            placeholder="e.g., Company Holiday"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="announcement-message" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message (Markdown supported)</label>
                        <textarea
                            id="announcement-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={5}
                            className="mt-1 block w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500"
                            placeholder="e.g., The office will be closed on Monday for the public holiday."
                            required
                        />
                    </div>
                    <div className="text-right">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition disabled:bg-slate-400"
                            disabled={!title.trim() || !message.trim()}
                        >
                            Send to All Users
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg">
                <h2 className="text-xl font-bold p-6 border-b border-slate-200 dark:border-slate-700">Sent History</h2>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {previousAnnouncements.length > 0 ? (
                        previousAnnouncements.map(announcement => (
                            <div key={announcement.id} className="p-6">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{announcement.title}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 flex-shrink-0 ml-4">{timeSince(announcement.createdAt)}</p>
                                </div>
                                <div 
                                    className="prose prose-sm dark:prose-invert mt-2 max-w-none text-slate-600 dark:text-slate-300"
                                    dangerouslySetInnerHTML={{ __html: marked.parse(announcement.message) }} 
                                />
                            </div>
                        ))
                    ) : (
                        <p className="p-6 text-center text-slate-500 dark:text-slate-400">No announcements have been sent yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
