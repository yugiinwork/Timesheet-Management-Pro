import React, { useState, useMemo } from 'react';
import { formatDate } from '../utils';
import { Project, User, Role, ProjectStatus, Task, TaskStatus, View, TaskImportance } from '../types';

interface ProjectManagementPageProps {
  projects: Project[];
  setProjects: (updater: React.SetStateAction<Project[]>) => Promise<void>;
  users: User[];
  currentUser: User;
  onExport?: () => void;
  tasks: Task[];
  setTasks: (updater: React.SetStateAction<Task[]>) => Promise<void>;
  addToastNotification: (message: string, title?: string) => void;
  addNotification: (payload: { userId: number; title: string; message: string; linkTo?: View; }) => Promise<void>;
  isSuperAdmin?: boolean;
}

const emptyProject = (managerId: number, company: string): Omit<Project, 'id'> => ({
  name: '',
  description: '',
  managerId: managerId,
  teamLeaderId: undefined,
  teamIds: [],
  customerName: '',
  jobName: '',
  estimatedHours: 0,
  actualHours: 0,
  company: company,
  status: ProjectStatus.NOT_STARTED,
});

// --- Task Management Components (Copied from TasksPage for project-specific view) ---

const TaskModal: React.FC<{
  task: Omit<Task, 'id'> | Task;
  project: Project;
  users: User[];
  onClose: () => void;
  onSave: (task: Omit<Task, 'id'> | Task) => void;
}> = ({ task, project, users, onClose, onSave }) => {
  const [formData, setFormData] = useState(task);
  const assignableUsers = users.filter(u => {
    const isTeamMember = project.teamIds.includes(u.id);
    const isTeamLeader = project.teamLeaderId === u.id;
    return isTeamMember || isTeamLeader;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
          {'id' in formData ? 'Edit Task' : 'Create Task'} for {project.name}
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
            <select multiple name="assignedTo" value={formData.assignedTo.map(String)} onChange={handleAssigneeChange} className="w-full h-24 p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
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

// --- Main Component ---

export const ProjectManagementPage: React.FC<ProjectManagementPageProps> = ({ projects, setProjects, users, currentUser, onExport, tasks, setTasks, addToastNotification, addNotification, isSuperAdmin = false }) => {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Omit<Project, 'id'> | Project>(emptyProject(currentUser.id, currentUser.company || ''));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Task-related state for the details view
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Omit<Task, 'id'> | Task | null>(null);

  const managers = users.filter(u => u.role === Role.MANAGER || u.role === Role.ADMIN);
  const teamLeaders = users.filter(u => u.role === Role.TEAM_LEADER);
  const employees = users.filter(u => u.role === Role.EMPLOYEE);
  const canEditProjects = [Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role);
  const canManageTasks = [Role.ADMIN, Role.MANAGER, Role.TEAM_LEADER].includes(currentUser.role);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return projects;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return projects.filter(project =>
      project.name.toLowerCase().includes(lowercasedQuery) ||
      project.customerName.toLowerCase().includes(lowercasedQuery) ||
      project.jobName.toLowerCase().includes(lowercasedQuery)
    );
  }, [projects, searchQuery]);

  // --- Project Modal Logic ---
  const openProjectModal = (project?: Project) => {
    setEditingProject(project || emptyProject(currentUser.id, currentUser.company || ''));
    setIsProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
  };

  const handleProjectInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumberField = ['managerId', 'teamLeaderId', 'estimatedHours', 'actualHours'].includes(name);

    let processedValue: string | number | undefined = value;
    if (isNumberField) {
      processedValue = value ? Number(value) : undefined;
    }

    setEditingProject(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const value: number[] = [];
    for (let i = 0, l = options.length; i < l; i++) {
      if (options[i].selected) {
        value.push(Number(options[i].value));
      }
    }
    setEditingProject(prev => ({ ...prev, teamIds: value }));
  }

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const projectData = {
      ...editingProject,
      managerId: Number(editingProject.managerId),
      teamLeaderId: editingProject.teamLeaderId ? Number(editingProject.teamLeaderId) : undefined,
      company: isSuperAdmin ? editingProject.company : (currentUser.company || ''),
    }

    if ('id' in projectData) {
      await setProjects(prev => prev.map(p => p.id === projectData.id ? (projectData as Project) : p));
    } else {
      const newProject: Project = {
        id: Date.now(),
        ...projectData,
      } as Project;
      await setProjects(prev => [...prev, newProject]);
    }
    closeProjectModal();
  };

  const handleDeleteProject = async (project: Project) => {
    const canDelete = currentUser.role === Role.MANAGER ||
      currentUser.role === Role.ADMIN ||
      (currentUser.role === Role.TEAM_LEADER && project.teamLeaderId === currentUser.id);

    if (!canDelete) {
      addToastNotification('You do not have permission to delete this project.', 'Permission Denied');
      return;
    }

    if (!confirm(`Are you sure you want to delete the project "${project.name}"? This will also delete all associated tasks. This action cannot be undone.`)) {
      return;
    }

    // Delete all tasks associated with this project
    await setTasks(prev => prev.filter(t => t.projectId !== project.id));

    // Delete the project
    await setProjects(prev => prev.filter(p => p.id !== project.id));
  };

  const getStatusBadge = (status: ProjectStatus) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case ProjectStatus.NOT_STARTED: return `${baseClasses} bg-slate-200 text-slate-800 dark:bg-slate-600 dark:text-slate-200`;
      case ProjectStatus.IN_PROGRESS: return `${baseClasses} bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300`;
      case ProjectStatus.ON_HOLD: return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300`;
      case ProjectStatus.COMPLETED: return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`;
    }
  }

  // --- Task Logic for Details View ---
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
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }

  const handleSaveTask = async (taskData: Omit<Task, 'id'> | Task) => {
    const isNewTask = !('id' in taskData);
    const originalAssignees = isNewTask ? [] : (tasks.find(t => t.id === taskData.id)?.assignedTo) || [];

    if (isNewTask) {
      const newTask: Task = { id: Date.now(), ...taskData } as Task;
      await setTasks(prev => [...prev, newTask]);
    } else {
      await setTasks(prev => prev.map(t => t.id === (taskData as Task).id ? (taskData as Task) : t));
    }

    if (!isNewTask) {
      addToastNotification(`Task "${taskData.title}" has been updated.`, 'Task Updated');
    }

    const newAssignees = taskData.assignedTo;
    const newlyAssignedUserIds = newAssignees.filter(id => !originalAssignees.includes(id));

    for (const userId of newlyAssignedUserIds) {
      await addNotification({
        userId: userId,
        title: 'New Task Assigned',
        message: `${currentUser.name} assigned you a new task: "${taskData.title}" in project ${selectedProject?.name}.`,
        linkTo: 'TASKS',
      });
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  }

  const handleDeleteTask = async (task: Task) => {
    if (!canManageTasks) {
      addToastNotification('You do not have permission to delete tasks.', 'Permission Denied');
      return;
    }

    if (!confirm(`Are you sure you want to delete the task "${task.title}"? This action cannot be undone.`)) {
      return;
    }

    await setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
    const assignees = users.filter(u => (task.assignedTo || []).includes(u.id));

    const deadlineInfo = useMemo(() => {
      if (!task.deadline || task.status === 'Done') return { status: 'none', text: '' };
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const deadlineDate = new Date(task.deadline + 'T00:00:00');
      const diffTime = deadlineDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { status: 'overdue', text: 'Overdue' };
      if (diffDays <= 1) return { status: 'due-soon', text: 'Due Soon' };
      return { status: 'none', text: '' };
    }, [task.deadline, task.status]);

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
            <div className="flex gap-2">
              <button onClick={() => handleEditTask(task)} className="text-xs text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200">Edit</button>
              <button onClick={() => handleDeleteTask(task)} className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200">Delete</button>
            </div>
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

  // --- Render Logic ---
  if (selectedProject) {
    const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
    const tasksByStatus: Record<TaskStatus, Task[]> = {
      'To Do': projectTasks.filter(t => t.status === 'To Do'),
      'In Progress': projectTasks.filter(t => t.status === 'In Progress'),
      'Done': projectTasks.filter(t => t.status === 'Done'),
    };
    const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

    return (
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <button onClick={() => setSelectedProject(null)} className="text-sm font-medium text-sky-600 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-200 flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Projects
            </button>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">{selectedProject.name} - Task Board</h1>
          </div>
          {canManageTasks && (
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
            >
              Create Task
            </button>
          )}
        </div>
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
        {isTaskModalOpen && editingTask && (
          <TaskModal
            task={editingTask}
            project={selectedProject}
            users={users}
            onClose={handleCloseTaskModal}
            onSave={handleSaveTask}
          />
        )}
      </div>
    )
  }

  const ongoingProjects = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Project Management</h1>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow">
            <input
              type="search"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          {onExport && (
            <button onClick={onExport} className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
          )}
          {canEditProjects && (
            <button
              onClick={() => openProjectModal()}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition"
            >
              Create
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map(project => (
            <div key={project.id} onClick={() => setSelectedProject(project)} className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-6 flex flex-col hover:shadow-xl hover:ring-2 hover:ring-sky-500 transition-all cursor-pointer">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-sky-600 dark:text-sky-400">{project.name}</h2>
                <span className={getStatusBadge(project.status)}>{project.status}</span>
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{project.jobName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customer: {project.customerName}</p>
              {isSuperAdmin && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Company: {project.company}</p>}

              <div className="grid grid-cols-2 gap-4 my-4 text-center">
                <div>
                  <div className="text-xs text-slate-400">Estimated Hours</div>
                  <div className="text-lg font-bold">{project.estimatedHours}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Actual Hours</div>
                  <div className="text-lg font-bold">{project.actualHours}</div>
                </div>
              </div>

              <p className="mt-2 flex-grow text-slate-700 dark:text-slate-300 text-sm">{project.description}</p>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-sm">Team:</h4>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.teamIds.map(id => users.find(u => u.id === id)).filter(Boolean).map(member => (
                    <div key={member!.id} className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-700 rounded-full pr-3 py-0.5">
                      <img src={member!.profilePictureUrl || `https://picsum.photos/seed/${member!.id}/32`} alt={member!.name} className="w-6 h-6 rounded-full" />
                      <span className="text-xs">{member!.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedProject(project); }}
                  className="text-sky-600 hover:text-sky-900 dark:text-sky-400 dark:hover:text-sky-200 text-sm font-medium flex items-center gap-1"
                >
                  View Tasks
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
                {canEditProjects && (
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openProjectModal(project); }} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium">
                      Edit Info
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project); }}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Ongoing Projects</h2>
            <ul className="space-y-4">
              {ongoingProjects.length > 0 ? ongoingProjects.map(p => {
                const progress = p.estimatedHours > 0 ? Math.min(Math.round((p.actualHours / p.estimatedHours) * 100), 100) : 0;
                return (
                  <li key={p.id}>
                    <div className="flex justify-between items-center text-sm font-semibold mb-1">
                      <span className="text-slate-700 dark:text-slate-200 truncate pr-2">{p.name}</span>
                      <span className="text-sky-600 dark:text-sky-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                  </li>
                );
              }) : <p className="text-sm text-center text-slate-500 dark:text-slate-400">No projects are currently in progress.</p>}
            </ul>
          </div>
        </div>
      </div>


      {isProjectModalOpen && canEditProjects && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-8 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">
              {'id' in editingProject ? 'Edit' : 'Create'} Project
            </h2>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="name" placeholder="Project Name" value={editingProject.name} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Status</label>
                  <select name="status" value={editingProject.status} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Company</label>
                  <input type="text" name="company" placeholder="Company" value={editingProject.company} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="customerName" placeholder="Customer Name" value={editingProject.customerName} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                <input type="text" name="jobName" placeholder="Job Name" value={editingProject.jobName} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Estimated Hours</label>
                  <input type="number" name="estimatedHours" value={editingProject.estimatedHours} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Actual Hours (Auto-calculated)</label>
                  <input type="number" name="actualHours" value={editingProject.actualHours} className="w-full p-2 bg-slate-200 dark:bg-slate-600 border border-slate-300 dark:border-slate-600 rounded-md" disabled />
                </div>
              </div>
              <textarea name="description" placeholder="Description" value={editingProject.description} onChange={handleProjectInputChange} rows={3} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required></textarea>
              {currentUser.role !== Role.TEAM_LEADER && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Manager</label>
                  <select name="managerId" value={editingProject.managerId} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" required>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Team Leader</label>
                <select name="teamLeaderId" value={editingProject.teamLeaderId || ''} onChange={handleProjectInputChange} className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                  <option value="">None</option>
                  {teamLeaders.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Team Members</label>
                <select name="teamIds" multiple value={editingProject.teamIds.map(String)} onChange={handleTeamChange} className="w-full p-2 h-32 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                  {[...teamLeaders, ...employees].map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                </select>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={closeProjectModal} className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Save Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};