import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Edit3,
  Kanban,
  List,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { formatDateDisplay, getTodayISO } from '../../lib/formatters';
import {
  generateSafeId,
  RecurrenceType,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '../../types/dayflow';

type TaskFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed' | 'high_priority';
type TaskViewMode = 'list' | 'kanban' | 'calendar';

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  low: 'text-slate-500 dark:text-[#94A3B8]',
  medium: 'text-[#60A5FA]',
  high: 'text-amber-500 dark:text-[#FBBF24]',
  urgent: 'text-rose-500',
};

export function TasksView() {
  const { tasks, addTask, updateTask, deleteTask, profile, pushToast } = useDayflow();
  const today = getTodayISO();

  const [viewMode, setViewMode] = useState<TaskViewMode>('list');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [search, setSearch] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modal state for create/edit
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [category, setCategory] = useState('Work');
  const [tagsText, setTagsText] = useState('');
  const [dueDate, setDueDate] = useState(today);
  const [dueTime, setDueTime] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminderAt, setReminderAt] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');

  // Calendar month navigation for task calendar view
  const [calMonth, setCalMonth] = useState(() => today.slice(0, 7));

  const overdueCount = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).length,
    [tasks, today]
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (q) {
          const hit =
            t.title.toLowerCase().includes(q) ||
            (t.description || '').toLowerCase().includes(q) ||
            (t.category || '').toLowerCase().includes(q) ||
            (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
          if (!hit) return false;
        }
        if (filter === 'today') return t.dueDate === today;
        if (filter === 'upcoming') return Boolean(t.dueDate && t.dueDate > today && t.status !== 'done');
        if (filter === 'overdue') return Boolean(t.dueDate && t.dueDate < today && t.status !== 'done');
        if (filter === 'completed') return t.status === 'done';
        if (filter === 'high_priority') return t.priority === 'high' || t.priority === 'urgent';
        return true;
      })
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [tasks, search, filter, today]);

  const openCreate = (presetStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setStatus(presetStatus);
    setCategory('Work');
    setTagsText('');
    setDueDate(today);
    setDueTime('');
    setRecurrence('none');
    setReminderAt('');
    setSubtasks([]);
    setEditorOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setStatus(t.status);
    setCategory(t.category || 'General');
    setTagsText((t.tags || []).join(', '));
    setDueDate(t.dueDate || '');
    setDueTime(t.dueTime || '');
    setRecurrence(t.recurrence || 'none');
    setReminderAt(t.reminderAt || '');
    setSubtasks(t.subtasks || []);
    setEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const tags = tagsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (editingTask) {
      await updateTask(editingTask.id, {
        title: title.trim(),
        description,
        priority,
        status,
        category,
        tags,
        dueDate,
        dueTime,
        recurrence,
        reminderAt,
        subtasks,
        completedAt: status === 'done' ? editingTask.completedAt || new Date().toISOString() : '',
      });
      pushToast({ title: 'Task updated', variant: 'success' });
    } else {
      await addTask({
        title: title.trim(),
        description,
        priority,
        status,
        category,
        tags,
        dueDate,
        dueTime,
        recurrence,
        reminderAt,
        subtasks,
        completedAt: status === 'done' ? new Date().toISOString() : '',
      });
      pushToast({ title: 'Task created', variant: 'success' });
    }
    setEditorOpen(false);
  };

  const toggleDone = async (t: Task) => {
    const nextStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done';
    await updateTask(t.id, {
      status: nextStatus,
      completedAt: nextStatus === 'done' ? new Date().toISOString() : '',
    });
  };

  const handleDropOnColumn = async (targetStatus: TaskStatus) => {
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    setDraggedTaskId(null);
    if (!task || task.status === targetStatus) return;
    await updateTask(task.id, {
      status: targetStatus,
      completedAt: targetStatus === 'done' ? new Date().toISOString() : '',
    });
    pushToast({ title: `Moved "${task.title}"`, variant: 'info' });
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks((prev) => [...prev, { id: generateSafeId('sub'), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  // Calendar grid dates for Task Calendar View
  const calendarDays = useMemo(() => {
    const [y, m] = calMonth.split('-').map(Number);
    const first = new Date(y, (m || 1) - 1, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(y, m || 1, 0).getDate();
    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: `${calMonth}-${String(d).padStart(2, '0')}`,
        day: d,
      });
    }
    return cells;
  }, [calMonth]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06]">
          {(
            [
              ['all', 'All'],
              ['today', 'Today'],
              ['upcoming', 'Upcoming'],
              ['overdue', `Overdue (${overdueCount})`],
              ['completed', 'Completed'],
              ['high_priority', 'High Priority'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filter === id
                  ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
            />
          </div>

          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06]">
            {(
              [
                ['list', List, 'List'],
                ['kanban', Kanban, 'Kanban'],
                ['calendar', CalendarIcon, 'Calendar'],
              ] as const
            ).map(([modeId, Icon, label]) => (
              <button
                key={modeId}
                type="button"
                onClick={() => setViewMode(modeId)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === modeId
                    ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreate('todo')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Overdue Notice */}
      {overdueCount > 0 && filter !== 'overdue' && filter !== 'completed' && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-[#FBBF24]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              You have <strong className="font-mono-tabular">{overdueCount}</strong> overdue{' '}
              {overdueCount === 1 ? 'task' : 'tasks'} needing attention.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className="font-medium text-amber-600 dark:text-[#FBBF24] hover:underline cursor-pointer shrink-0"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* VIEW 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] divide-y divide-slate-100 dark:divide-white/[0.06]">
          {filteredTasks.length === 0 ? (
            <div className="py-14 text-center px-4">
              <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                No tasks match the current filter.
              </p>
              <button
                type="button"
                onClick={() => openCreate('todo')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Create Task
              </button>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const isOverdue = Boolean(t.dueDate && t.dueDate < today && t.status !== 'done');
              const subDone = (t.subtasks || []).filter((s) => s.completed).length;
              const subTotal = (t.subtasks || []).length;
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 p-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleDone(t)}
                      aria-label={`Toggle ${t.title}`}
                      className="mt-0.5 text-slate-400 hover:text-[#8B7CFF] cursor-pointer shrink-0"
                    >
                      {t.status === 'done' ? (
                        <CheckCircle2 className="w-5 h-5 text-[#34D399]" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            t.status === 'done'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900 dark:text-[#F8FAFC]'
                          }`}
                        >
                          {t.title}
                        </p>
                        {isOverdue && (
                          <span className="text-xs font-medium text-amber-500 dark:text-[#FBBF24]">
                            Overdue
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                        <span className={`font-medium capitalize ${PRIORITY_TEXT[t.priority]}`}>
                          {t.priority}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{t.category || 'General'}</span>
                        {t.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {formatDateDisplay(t.dueDate, profile.dateFormat)}
                              {t.dueTime ? ` ${t.dueTime}` : ''}
                            </span>
                          </>
                        )}
                        {subTotal > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono-tabular">
                              {subDone}/{subTotal} subtasks
                            </span>
                          </>
                        )}
                        {t.tags && t.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{t.tags.map((tag) => `#${tag}`).join(' ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(t)}
                      aria-label={`Edit ${t.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        deleteTask(t.id);
                        pushToast({ title: 'Task deleted', variant: 'info' });
                      }}
                      aria-label={`Delete ${t.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD WITH DRAG & DROP */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              ['todo', 'To Do'],
              ['in_progress', 'In Progress'],
              ['done', 'Completed'],
            ] as const
          ).map(([colStatus, colLabel]) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropOnColumn(colStatus)}
                className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#121620] p-4 min-h-[380px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold text-sm">{colLabel}</h3>
                    <span className="font-mono-tabular text-xs text-slate-400">{colTasks.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCreate(colStatus)}
                    aria-label={`Add task to ${colLabel}`}
                    className="p-1 rounded text-slate-400 hover:text-[#8B7CFF] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 flex-1">
                  {colTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(t.id)}
                      onClick={() => openEdit(t)}
                      className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-3.5 cursor-grab active:cursor-grabbing hover:border-[#8B7CFF]/50 transition-colors"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                        {t.title}
                      </p>
                      <div className="flex items-center justify-between mt-2.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                        <span className={`capitalize font-medium ${PRIORITY_TEXT[t.priority]}`}>
                          {t.priority}
                        </span>
                        {t.dueDate && (
                          <span className="font-mono-tabular">
                            {formatDateDisplay(t.dueDate, profile.dateFormat)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="h-24 rounded-lg border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-xs text-slate-400">
                      Drag tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-base">Tasks Calendar ({calMonth})</h3>
            <input
              type="month"
              value={calMonth}
              onChange={(e) => setCalMonth(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            />
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-400 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.iso) {
                return <div key={`empty_${idx}`} className="min-h-[84px] rounded-lg bg-slate-50/40 dark:bg-[#121620]/40" />;
              }
              const dayTasks = filteredTasks.filter((t) => t.dueDate === cell.iso);
              const isToday = cell.iso === today;
              return (
                <div
                  key={cell.iso}
                  className={`min-h-[84px] rounded-lg border p-2 ${
                    isToday
                      ? 'border-[#8B7CFF] bg-[#8B7CFF]/5'
                      : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#121620]'
                  }`}
                >
                  <p className="font-mono-tabular text-xs font-semibold mb-1">{cell.day}</p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openEdit(t)}
                        className={`w-full text-left text-[11px] truncate px-1.5 py-0.5 rounded cursor-pointer ${
                          t.status === 'done'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#34D399] line-through'
                            : 'bg-[#8B7CFF]/15 text-[#7C6BFF] dark:text-[#8B7CFF]'
                        }`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {editingTask ? 'Edit Task' : 'New Task'}
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder="roadmap, urgent"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Reminder
                  </label>
                  <input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
              </div>

              {/* Subtasks */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1.5">
                  Subtasks
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {subtasks.map((st) => (
                    <div key={st.id} className="flex items-center justify-between gap-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() =>
                            setSubtasks((prev) =>
                              prev.map((x) => (x.id === st.id ? { ...x, completed: !x.completed } : x))
                            )
                          }
                        />
                        <span className={st.completed ? 'line-through text-slate-400' : ''}>{st.title}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setSubtasks((prev) => prev.filter((x) => x.id !== st.id))}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium cursor-pointer"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
