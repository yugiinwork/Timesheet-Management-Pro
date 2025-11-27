import React, { useState } from 'react';
import { formatDate } from '../utils';
import { Project, Task, User, TaskStatus, Role, View, TaskImportance } from '../types';

interface TasksPageProps {
    projects: Project[];
    tasks: Task[];
    users: User[];
    currentUser: User;
    setTasks: (updater: React.SetStateAction<Task[]>) => Promise<void>;
    addToastNotification: (message: string, title?: string) => void;
    addNotification: (payload: { userId: number; title: string; message: string; linkTo?: View; }) => Promise<void>;
}

const TaskModal: React.FC<{
    task: Omit<Task, 'id'> | Task;
    project: Project;
    users: User[];
    onClose: () => void;
    onSave: (task: Omit<Task, 'id'> | Task) => void;
}> = ({ task, project, users, onClose, onSave }) => {
    const [formData, setFormData] = useState(task);
    const assignableUsers = users.filter(u => u.role === Role.EMPLOYEE || u.role === Role.TEAM_LEADER);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // FIX: Explicitly type `option` as HTMLOptionElement to resolve type inference issue.
        const selectedIds = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => Number(option.value));
        setFormData(prev => ({ ...prev, assignedTo: selectedIds }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">
                    {'id' in formData ? 'Edit Task' : 'Create Task'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" name="title" placeholder="Task Title" value={formData.title} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                    <textarea name="description" placeholder="Description" value={formData.description} onChange={handleInputChange} rows={3} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Done">Done</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Deadline</label>
                            <input type="date" name="deadline" value={formData.deadline || ''} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Importance</label>
                            <select name="importance" value={formData.importance} onChange={handleInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                {Object.values(TaskImportance).map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Assigned To</label>
                        <select multiple name="assignedTo" value={(formData.assignedTo || []).map(String)} onChange={handleAssigneeChange} className="w-full h-24 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                            {assignableUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                        </select>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Save Task</button>
                    </div>
                </form>
            </div>
        </div>
    )
};

export const TasksPage: React.FC<TasksPageProps> = ({ projects, tasks, users, currentUser, setTasks, addToastNotification, addNotification }) => {
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projects.length > 0 ? projects[0].id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Omit<Task, 'id'> | Task | null>(null);

    const canManageTasks = currentUser.role === Role.MANAGER || currentUser.role === Role.TEAM_LEADER;

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const handleCreateTask = () => {
        if (!selectedProject) return;
        setEditingTask({
            projectId: selectedProject.id,
            title: '',
            description: '',
            assignedTo: [],
            status: 'To Do',
            importance: TaskImportance.MEDIUM,
            deadline: undefined
        });
        setIsModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    }

    const handleSaveTask = async (taskData: Omit<Task, 'id'> | Task) => {
        const isNewTask = !('id' in taskData);
        const originalAssignees = isNewTask ? [] : (tasks.find(t => t.id === taskData.id)?.assignedTo) || [];

        if (isNewTask) {
            const newTask: Task = {
                id: Date.now(),
                ...taskData,
            } as Task;
            await setTasks(prev => [...prev, newTask]);
        } else {
            await setTasks(prev => prev.map(t => t.id === (taskData as Task).id ? (taskData as Task) : t));
        }

        if (!isNewTask) {
            addToastNotification(`Task "${taskData.title}" has been updated.`, 'Task Updated');
        }

        // Notify any newly assigned users
        const newAssignees = taskData.assignedTo;
        const newlyAssignedUserIds = newAssignees.filter(id => !originalAssignees.includes(id));

        for (const userId of newlyAssignedUserIds) {
            // Create a persistent notifi for the newly assigned user
            await addNotification({
                userId: userId,
                title: 'New Task Assigned',
                message: `${currentUser.name} assigned you a new task: "${taskData.title}" in project ${selectedProject?.name}.`,
                linkTo: 'TASKS',
            });
        }

        setIsModalOpen(false);
        setEditingTask(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
    }

    const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
    const tasksByStatus: Record<TaskStatus, Task[]> = {
        'To Do': projectTasks.filter(t => t.status === 'To Do'),
        'In Progress': projectTasks.filter(t => t.status === 'In Progress'),
        'Done': projectTasks.filter(t => t.status === 'Done'),
    };

    const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
        const assignees = users.filter(u => (task.assignedTo || []).includes(u.id));

        const getDeadlineStatus = () => {
            if (!task.deadline || task.status === 'Done') return { status: 'none', text: '' };
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const deadlineDate = new Date(task.deadline + 'T00:00:00');
            const diffTime = deadlineDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < 0) return { status: 'overdue', text: 'Overdue' };
            if (diffDays <= 1) return { status: 'due-soon', text: 'Due Soon' };
            return { status: 'none', text: '' };
        };

        const deadlineInfo = getDeadlineStatus();

        const cardBorderColor = {
            [TaskImportance.HIGH]: 'border-l-4 border-red-500',
            [TaskImportance.MEDIUM]: 'border-l-4 border-amber-500',
            [TaskImportance.LOW]: 'border-l-4 border-sky-500',
        }[task.importance];

        const deadlineTextColor = {
            'overdue': 'text-red-500 dark:text-red-400',
            'due-soon': 'text-amber-500 dark:text-amber-400',
            'none': 'text-slate-500 dark:text-slate-400'
        }[deadlineInfo.status];

        return (
            <div className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm ${cardBorderColor}`}>
                <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{task.title}</h4>
                    {canManageTasks && (
                        <button onClick={() => handleEditTask(task)} className="text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200">Edit</button>
                    )}
                </div>
                {task.deadline && (
                    <p className={`text-xs ${deadlineTextColor} mt-1 font-semibold`}>
                        Due: {formatDate(task.deadline)} {deadlineInfo.text && `(${deadlineInfo.text})`}
                    </p>
                )}
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{task.description}</p>
                <div className="mt-4 flex justify-end">
                    <div className="flex -space-x-2">
                        {assignees.map(a => (
                            <img key={a.id} src={a.profilePictureUrl || `https://picsum.photos/seed/${a.id}/32`} alt={a.name} title={a.name} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Tasks</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <select
                        value={selectedProjectId || ''}
                        onChange={e => setSelectedProjectId(Number(e.target.value))}
                        className="w-full sm:w-48 p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md"
                    >
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {canManageTasks && (
                        <button
                            onClick={handleCreateTask}
                            disabled={!selectedProject}
                            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            Create Task
                        </button>
                    )}
                </div>
            </div>

            {selectedProject ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {statuses.map(status => (
                        <div key={status} className="bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-4">
                            <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200 mb-4">{status} ({tasksByStatus[status].length})</h3>
                            <div className="space-y-4">
                                {tasksByStatus[status].map(task => (
                                    <TaskCard key={task.id} task={task} />
                                ))}
                                {tasksByStatus[status].length === 0 && (
                                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No tasks in this column.</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow-md">
                    <p className="text-slate-500 dark:text-slate-400">You are not assigned to any projects. Contact your manager.</p>
                </div>
            )}

            {isModalOpen && editingTask && selectedProject && (
                <TaskModal
                    task={editingTask}
                    project={selectedProject}
                    users={users}
                    onClose={handleCloseModal}
                    onSave={handleSaveTask}
                />
            )}
        </div>
    );
};
