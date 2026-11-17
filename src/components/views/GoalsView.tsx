import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, X } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { formatDateDisplay, getTodayISO } from '../../lib/formatters';
import { generateSafeId, GoalHorizon, Milestone } from '../../types/dayflow';

const HORIZON_LABELS: Record<GoalHorizon, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  long_term: 'Long-Term',
};

export function GoalsView() {
  const { goals, addGoal, updateGoal, deleteGoal, profile, pushToast } = useDayflow();
  const [horizonFilter, setHorizonFilter] = useState<'all' | GoalHorizon>('all');
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [horizon, setHorizon] = useState<GoalHorizon>('monthly');
  const [targetDate, setTargetDate] = useState(getTodayISO());
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState('');

  const filtered = useMemo(() => {
    if (horizonFilter === 'all') return goals;
    return goals.filter((g) => g.horizon === horizonFilter);
  }, [goals, horizonFilter]);

  const handleAddMilestoneDraft = () => {
    if (!newMilestone.trim()) return;
    setMilestones((prev) => [
      ...prev,
      { id: generateSafeId('ms'), title: newMilestone.trim(), completed: false },
    ]);
    setNewMilestone('');
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const doneCount = milestones.filter((m) => m.completed).length;
    const progress = milestones.length > 0 ? Math.round((doneCount / milestones.length) * 100) : 0;
    await addGoal({
      title: title.trim(),
      description,
      horizon,
      targetDate,
      progress,
      status: progress === 100 ? 'completed' : 'active',
      milestones,
    });
    setTitle('');
    setDescription('');
    setMilestones([]);
    setModalOpen(false);
    pushToast({ title: 'Goal created', variant: 'success' });
  };

  const toggleGoalMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;
    const updatedMilestones = (goal.milestones || []).map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const done = updatedMilestones.filter((m) => m.completed).length;
    const progress =
      updatedMilestones.length > 0 ? Math.round((done / updatedMilestones.length) * 100) : goal.progress;
    await updateGoal(goalId, {
      milestones: updatedMilestones,
      progress,
      status: progress === 100 ? 'completed' : 'active',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setHorizonFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              horizonFilter === 'all'
                ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-[#94A3B8]'
            }`}
          >
            All Horizons
          </button>
          {(Object.keys(HORIZON_LABELS) as GoalHorizon[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizonFilter(h)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                horizonFilter === h
                  ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[#94A3B8]'
              }`}
            >
              {HORIZON_LABELS[h]}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] py-14 text-center">
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">No goals in this horizon yet.</p>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
          >
            Create Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((g) => (
            <div
              key={g.id}
              className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#8B7CFF] font-medium">
                    {HORIZON_LABELS[g.horizon]} Goal · {g.status}
                  </p>
                  <h3 className="font-display text-lg font-semibold mt-0.5">{g.title}</h3>
                  {g.description && (
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">{g.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteGoal(g.id);
                    pushToast({ title: 'Goal deleted', variant: 'info' });
                  }}
                  aria-label={`Delete ${g.title}`}
                  className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-[#94A3B8]">
                    Target: {formatDateDisplay(g.targetDate, profile.dateFormat)}
                  </span>
                  <span className="font-mono-tabular font-semibold text-[#8B7CFF]">{g.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-[#121620] overflow-hidden">
                  <div
                    className="h-full bg-[#8B7CFF] transition-all"
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
                {(!g.milestones || g.milestones.length === 0) && (
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={g.progress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateGoal(g.id, {
                        progress: val,
                        status: val === 100 ? 'completed' : 'active',
                      });
                    }}
                    className="w-full mt-2 accent-[#8B7CFF]"
                  />
                )}
              </div>

              {g.milestones && g.milestones.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
                  <p className="text-xs font-medium text-slate-400">Milestones</p>
                  {g.milestones.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleGoalMilestone(g.id, m.id)}
                      className="w-full flex items-center gap-2.5 text-left text-xs cursor-pointer"
                    >
                      {m.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={m.completed ? 'line-through text-slate-400' : ''}>
                        {m.title}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Create Goal</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Horizon</label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    {(Object.keys(HORIZON_LABELS) as GoalHorizon[]).map((h) => (
                      <option key={h} value={h}>
                        {HORIZON_LABELS[h]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Milestones</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="Add milestone..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestoneDraft}
                    className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-white/10 text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span>{m.title}</span>
                      <button
                        type="button"
                        onClick={() => setMilestones((prev) => prev.filter((x) => x.id !== m.id))}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
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
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-sm font-medium cursor-pointer"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
