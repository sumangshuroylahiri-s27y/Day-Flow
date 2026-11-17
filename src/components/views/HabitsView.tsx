import React, { useMemo, useState } from 'react';
import { Check, Flame, Plus, Trash2, X } from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useDayflow } from '../../context/DayflowContext';
import { addDaysISO, getTodayISO } from '../../lib/formatters';

export function HabitsView() {
  const { habits, addHabit, deleteHabit, habitRecords, toggleHabitDate, pushToast } = useDayflow();
  const today = getTodayISO();

  const [periodView, setPeriodView] = useState<'weekly' | 'monthly'>('weekly');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Health');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [targetPerWeek, setTargetPerWeek] = useState(6);
  const [color, setColor] = useState('#8B7CFF');

  const isDone = (habitId: string, date: string) =>
    habitRecords.some((r) => r.habitId === habitId && r.date === date && r.completed);

  const getStreak = (habitId: string) => {
    let streak = 0;
    for (let i = 0; i < 90; i++) {
      const d = addDaysISO(today, -i);
      if (isDone(habitId, d)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  };

  const recentDays = useMemo(() => {
    const count = periodView === 'weekly' ? 7 : 30;
    return Array.from({ length: count }, (_, idx) => addDaysISO(today, -(count - 1 - idx)));
  }, [periodView, today]);

  // 84-day heatmap grid
  const heatmapDays = useMemo(
    () => Array.from({ length: 84 }, (_, idx) => addDaysISO(today, -(83 - idx))),
    [today]
  );

  // Weekly Bar Chart Data
  const weeklyChartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDaysISO(today, -(6 - i));
      const completed = habits.filter((h) => isDone(h.id, d)).length;
      return {
        day: d.slice(5),
        completed,
        rate: habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0,
      };
    });
  }, [habits, habitRecords, today]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addHabit({
      name: name.trim(),
      category,
      frequency,
      targetPerWeek,
      color,
    });
    setName('');
    setModalOpen(false);
    pushToast({ title: 'Habit created', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Habit Tracker</h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Build daily and weekly consistency with streak tracking and completion heatmaps.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06]">
            {(['weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriodView(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer ${
                  periodView === p
                    ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New Habit
          </button>
        </div>
      </div>

      {/* Habit Matrix */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 overflow-x-auto">
        {habits.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-3">No habits tracked yet.</p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
            >
              Add First Habit
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-[#94A3B8]">
                <th className="pb-3 pr-4 font-medium min-w-[180px]">Habit</th>
                <th className="pb-3 px-3 font-medium">Streak</th>
                <th className="pb-3 px-3 font-medium">Rate</th>
                {recentDays.map((d) => (
                  <th key={d} className="pb-3 px-1 text-center font-mono-tabular font-normal">
                    {d.slice(8)}
                  </th>
                ))}
                <th className="pb-3 pl-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {habits.map((h) => {
                const streak = getStreak(h.id);
                const doneCount = recentDays.filter((d) => isDone(h.id, d)).length;
                const pct = Math.round((doneCount / recentDays.length) * 100);
                return (
                  <tr key={h.id}>
                    <td className="py-3 pr-4">
                      <p className="text-sm font-medium">{h.name}</p>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {h.category || 'General'} · {h.targetPerWeek}x/wk
                      </p>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs font-semibold text-amber-500 dark:text-[#FBBF24] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> {streak}d
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs">{pct}%</td>
                    {recentDays.map((d) => {
                      const checked = isDone(h.id, d);
                      return (
                        <td key={d} className="py-3 px-1 text-center">
                          <button
                            type="button"
                            onClick={() => toggleHabitDate(h.id, d)}
                            aria-label={`Toggle ${h.name} on ${d}`}
                            className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors cursor-pointer ${
                              checked
                                ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40'
                                : 'bg-slate-100 dark:bg-[#121620] text-transparent hover:border-[#8B7CFF]/40 border border-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          deleteHabit(h.id);
                          pushToast({ title: 'Habit deleted', variant: 'info' });
                        }}
                        aria-label={`Delete ${h.name}`}
                        className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Heatmap & Weekly Progress Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-1">84-Day Consistency Heatmap</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
            Intensity reflects daily habit completions across all tracked habits.
          </p>
          <div className="grid grid-cols-12 gap-1.5">
            {heatmapDays.map((d) => {
              const count = habits.filter((h) => isDone(h.id, d)).length;
              const ratio = habits.length > 0 ? count / habits.length : 0;
              const bg =
                ratio === 0
                  ? 'bg-slate-100 dark:bg-[#121620]'
                  : ratio < 0.5
                  ? 'bg-[#8B7CFF]/30'
                  : ratio < 1
                  ? 'bg-[#8B7CFF]/65'
                  : 'bg-[#34D399]';
              return (
                <div
                  key={d}
                  title={`${d}: ${count}/${habits.length} completed`}
                  className={`h-5 rounded ${bg}`}
                />
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-1">7-Day Completion Rate (%)</h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
            Percentage of active habits checked each day this week.
          </p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#121620',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="rate" fill="#8B7CFF" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Create Habit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">New Habit</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Read 20 pages..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Target Days / Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={targetPerWeek}
                    onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Accent Color
                  </label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] p-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium cursor-pointer"
                >
                  Create Habit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
