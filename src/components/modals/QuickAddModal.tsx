import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { getTodayISO } from '../../lib/formatters';
import { EventCategory, GoalHorizon, TaskPriority } from '../../types/dayflow';

type QuickTab = 'task' | 'event' | 'note' | 'transaction' | 'habit' | 'goal';

export function QuickAddModal() {
  const {
    quickAddOpen,
    setQuickAddOpen,
    quickAddDefaultTab,
    addTask,
    addEvent,
    addNote,
    addTransaction,
    addHabit,
    addGoal,
    pushToast,
  } = useDayflow();

  const [tab, setTab] = useState<QuickTab>(quickAddDefaultTab);
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [time, setTime] = useState('10:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Work');
  const [eventCat, setEventCat] = useState<EventCategory>('work');
  const [duration, setDuration] = useState(45);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [habitTarget, setHabitTarget] = useState(7);
  const [goalHorizon, setGoalHorizon] = useState<GoalHorizon>('monthly');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (quickAddOpen) {
      setTab(quickAddDefaultTab);
      setTitle('');
      setDetails('');
      setAmount('');
      setDate(getTodayISO());
    }
  }, [quickAddOpen, quickAddDefaultTab]);

  if (!quickAddOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (tab === 'task') {
        if (!title.trim()) return;
        await addTask({
          title,
          description: details,
          status: 'todo',
          priority,
          category,
          dueDate: date,
          dueTime: time,
          recurrence: 'none',
          tags: [],
          subtasks: [],
        });
        pushToast({ title: 'Task added', description: title, variant: 'success' });
      } else if (tab === 'event') {
        if (!title.trim()) return;
        await addEvent({
          title,
          description: details,
          startDate: date,
          startTime: time,
          durationMinutes: duration,
          category: eventCat,
          recurrence: 'none',
          reminderMinutes: 15,
        });
        pushToast({ title: 'Event scheduled', description: title, variant: 'success' });
      } else if (tab === 'note') {
        await addNote({
          title: title.trim() || 'Quick Note',
          content: details,
          folder: category || 'General',
          tags: [],
          pinned: false,
          favorite: false,
          archived: false,
        });
        pushToast({ title: 'Note saved', variant: 'success' });
      } else if (tab === 'transaction') {
        const amt = Number(amount);
        if (!amt || amt <= 0) {
          pushToast({ title: 'Enter a valid positive amount', variant: 'warning' });
          setSubmitting(false);
          return;
        }
        await addTransaction({
          type: txType,
          amount: amt,
          category: category || (txType === 'income' ? 'Salary' : 'General'),
          description: details || title,
          paymentMethod,
          date,
        });
        pushToast({
          title: txType === 'income' ? 'Income recorded' : 'Expense recorded',
          variant: 'success',
        });
      } else if (tab === 'habit') {
        if (!title.trim()) return;
        await addHabit({
          name: title,
          category,
          frequency: 'daily',
          targetPerWeek: habitTarget,
          color: '#8B7CFF',
        });
        pushToast({ title: 'Habit created', description: title, variant: 'success' });
      } else if (tab === 'goal') {
        if (!title.trim()) return;
        await addGoal({
          title,
          description: details,
          horizon: goalHorizon,
          targetDate: date,
          progress: 0,
          status: 'active',
          milestones: [],
        });
        pushToast({ title: 'Goal created', description: title, variant: 'success' });
      }
      setQuickAddOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">Quick Add</h2>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#171D29] mb-4">
          {(
            [
              ['task', 'Task'],
              ['event', 'Event'],
              ['note', 'Note'],
              ['transaction', 'Expense'],
              ['habit', 'Habit'],
              ['goal', 'Goal'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === id
                  ? 'bg-white dark:bg-[#0B0D12] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'transaction' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Type
                </label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as 'expense' | 'income')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC] font-mono-tabular"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                {tab === 'habit' ? 'Habit Name' : 'Title'}
              </label>
              <input
                type="text"
                required={tab !== 'note'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  tab === 'task'
                    ? 'Prepare Q4 presentation...'
                    : tab === 'event'
                    ? 'Team architecture review...'
                    : tab === 'note'
                    ? 'Meeting notes...'
                    : tab === 'habit'
                    ? 'Morning run 20m...'
                    : 'Launch portfolio website...'
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
              />
            </div>
          )}

          {(tab === 'task' || tab === 'event' || tab === 'note' || tab === 'goal' || tab === 'transaction') && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                {tab === 'note' ? 'Content' : 'Description'}
              </label>
              <textarea
                rows={tab === 'note' ? 4 : 2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add context or details..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {tab !== 'note' && tab !== 'habit' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>
            )}

            {tab === 'task' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            )}

            {tab === 'event' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <select
                    value={eventCat}
                    onChange={(e) => setEventCat(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="learning">Learning</option>
                  </select>
                </div>
              </>
            )}

            {tab === 'transaction' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Groceries, Dining, Salary..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </>
            )}

            {tab === 'habit' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                    Days per Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={habitTarget}
                    onChange={(e) => setHabitTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                  />
                </div>
              </>
            )}

            {tab === 'goal' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Horizon
                </label>
                <select
                  value={goalHorizon}
                  onChange={(e) => setGoalHorizon(e.target.value as GoalHorizon)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="long_term">Long-Term</option>
                </select>
              </div>
            )}

            {tab === 'note' && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                  Folder
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="General, Work, Learning..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setQuickAddOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
