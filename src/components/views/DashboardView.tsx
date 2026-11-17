import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  CloudSun,
  Eye,
  EyeOff,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import {
  calculateProductivityScore,
  formatCurrency,
  formatDateDisplay,
  getGreeting,
  getTodayISO,
} from '../../lib/formatters';
import { DEFAULT_WIDGET_ORDER, WidgetId } from '../../types/dayflow';

const WIDGET_LABELS: Record<WidgetId, string> = {
  'today-overview': "Today's Overview",
  'productivity-score': 'Productivity Score',
  'financial-snapshot': 'Financial Snapshot',
  'focus-widget': 'Focus Timer',
  'my-day': 'My Day Timeline',
  'habit-overview': 'Habit Overview',
  'upcoming-events': 'Upcoming Events',
  'quick-notes': 'Quick Notes',
};

interface WeatherData {
  city: string;
  country: string;
  temperatureC: number;
  feelsLikeC: number;
  condition: string;
}

export function DashboardView() {
  const {
    profile,
    updateProfileSettings,
    tasks,
    updateTask,
    events,
    transactions,
    budgets,
    savingsGoals,
    habits,
    habitRecords,
    toggleHabitDate,
    focusSessions,
    logFocusSession,
    goals,
    addNote,
    setActiveNav,
    openQuickAdd,
    pushToast,
  } = useDayflow();

  const today = getTodayISO();
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [customizing, setCustomizing] = useState(false);
  const [showScoreMath, setShowScoreMath] = useState(false);

  // Quick note state
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteBody, setQuickNoteBody] = useState('');

  // Compact Focus widget state
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(() => {
      setFocusSeconds((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          logFocusSession({
            mode: 'focus',
            durationMinutes: 25,
            completedAt: new Date().toISOString(),
          });
          pushToast({ title: '25-minute focus block completed!', variant: 'success' });
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [focusRunning, logFocusSession, pushToast]);

  useEffect(() => {
    const city = profile.weatherCity?.trim();
    if (!city) return;
    let cancelled = false;
    fetch(`/api/weather?city=${encodeURIComponent(city)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Weather unavailable'))))
      .then((data) => {
        if (!cancelled && data?.city) {
          setWeather(data);
          setWeatherError('');
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherError('Weather unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [profile.weatherCity]);

  const tasksDueToday = useMemo(() => tasks.filter((t) => t.dueDate === today), [tasks, today]);
  const tasksCompletedToday = useMemo(
    () => tasks.filter((t) => t.status === 'done' && (t.dueDate === today || t.completedAt?.startsWith(today))),
    [tasks, today]
  );
  const tasksRemaining = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);
  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today),
    [tasks, today]
  );
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => e.startDate >= today)
        .sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`))
        .slice(0, 5),
    [events, today]
  );

  const completionPct = useMemo(() => {
    const scope = tasksDueToday.length > 0 ? tasksDueToday : tasks;
    if (scope.length === 0) return 0;
    return Math.round((scope.filter((t) => t.status === 'done').length / scope.length) * 100);
  }, [tasksDueToday, tasks]);

  const scoreBreakdown = useMemo(
    () =>
      calculateProductivityScore({
        tasks,
        habits,
        habitRecords,
        focusSessions,
        goals,
        today,
      }),
    [tasks, habits, habitRecords, focusSessions, goals, today]
  );

  const monthPrefix = today.slice(0, 7);
  const financeMetrics = useMemo(() => {
    const monthTx = transactions.filter((t) => t.date.startsWith(monthPrefix));
    const income = monthTx.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
    const totalBudget = budgets
      .filter((b) => b.month === monthPrefix)
      .reduce((a, b) => a + b.limit, 0);
    const totalSavingsCurrent = savingsGoals.reduce((a, b) => a + b.currentAmount, 0);
    const totalSavingsTarget = savingsGoals.reduce((a, b) => a + b.targetAmount, 0);

    return {
      income,
      expense,
      remainingBudget: totalBudget > 0 ? totalBudget - expense : income - expense,
      hasBudget: totalBudget > 0,
      savingsPct:
        totalSavingsTarget > 0 ? Math.min(100, Math.round((totalSavingsCurrent / totalSavingsTarget) * 100)) : 0,
      totalSavingsCurrent,
      totalSavingsTarget,
    };
  }, [transactions, budgets, savingsGoals, monthPrefix]);

  const myDayItems = useMemo(() => {
    const eventItems = events
      .filter((e) => e.startDate === today)
      .map((e) => ({
        id: e.id,
        kind: 'event' as const,
        time: e.startTime,
        title: e.title,
        meta: `${e.durationMinutes}m · ${e.category}`,
        done: false,
      }));
    const taskItems = tasks
      .filter((t) => t.dueDate === today)
      .map((t) => ({
        id: t.id,
        kind: 'task' as const,
        time: t.dueTime || 'Anytime',
        title: t.title,
        meta: `${t.priority} priority`,
        done: t.status === 'done',
      }));
    return [...eventItems, ...taskItems].sort((a, b) => a.time.localeCompare(b.time));
  }, [events, tasks, today]);

  const widgetOrder = profile.widgetOrder?.length ? profile.widgetOrder : DEFAULT_WIDGET_ORDER;
  const hiddenSet = new Set(profile.hiddenWidgets || []);

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const idx = widgetOrder.indexOf(id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= widgetOrder.length) return;
    const copy = [...widgetOrder];
    const [removed] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, removed);
    updateProfileSettings({ widgetOrder: copy });
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    const nextHidden = hiddenSet.has(id)
      ? (profile.hiddenWidgets || []).filter((w) => w !== id)
      : [...(profile.hiddenWidgets || []), id];
    updateProfileSettings({ hiddenWidgets: nextHidden });
  };

  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteTitle.trim() && !quickNoteBody.trim()) return;
    await addNote({
      title: quickNoteTitle.trim() || 'Dashboard Quick Note',
      content: quickNoteBody,
      folder: 'General',
      tags: ['quick-note'],
      pinned: false,
      favorite: false,
      archived: false,
    });
    setQuickNoteTitle('');
    setQuickNoteBody('');
    pushToast({ title: 'Note saved to Notes', variant: 'success' });
  };

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const renderWidget = (id: WidgetId) => {
    if (hiddenSet.has(id)) return null;

    switch (id) {
      case 'today-overview':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Today's Overview</h2>
              <button
                type="button"
                onClick={() => setActiveNav('tasks')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Tasks
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Completed</p>
                <p className="font-mono-tabular text-xl font-semibold text-emerald-500 dark:text-[#34D399] mt-0.5">
                  {tasksCompletedToday.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Remaining</p>
                <p className="font-mono-tabular text-xl font-semibold mt-0.5">
                  {tasksRemaining.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Overdue</p>
                <p
                  className={`font-mono-tabular text-xl font-semibold mt-0.5 ${
                    overdueTasks.length > 0 ? 'text-amber-500 dark:text-[#FBBF24]' : ''
                  }`}
                >
                  {overdueTasks.length}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Upcoming Events</p>
                <p className="font-mono-tabular text-xl font-semibold text-[#60A5FA] mt-0.5">
                  {upcomingEvents.length}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-[#94A3B8]">Daily completion</span>
                <span className="font-mono-tabular font-medium">{completionPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-[#0B0D12] overflow-hidden">
                <div
                  className="h-full bg-[#8B7CFF] transition-all"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>
        );

      case 'productivity-score':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base">Productivity Score</h2>
              <button
                type="button"
                onClick={() => setShowScoreMath((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-[#94A3B8] hover:text-[#8B7CFF] cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showScoreMath ? 'Hide formula' : 'How it works'}</span>
              </button>
            </div>

            <div className="flex items-baseline gap-2 my-1">
              <span className="font-mono-tabular text-4xl font-bold text-[#8B7CFF]">
                {scoreBreakdown.totalScore}
              </span>
              <span className="text-sm text-slate-500 dark:text-[#94A3B8]">/ 100 pts</span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              {[
                {
                  label: 'Tasks',
                  pts: scoreBreakdown.taskPoints,
                  max: scoreBreakdown.taskMax,
                  detail: scoreBreakdown.taskDetail,
                },
                {
                  label: 'Habits',
                  pts: scoreBreakdown.habitPoints,
                  max: scoreBreakdown.habitMax,
                  detail: scoreBreakdown.habitDetail,
                },
                {
                  label: 'Focus',
                  pts: scoreBreakdown.focusPoints,
                  max: scoreBreakdown.focusMax,
                  detail: scoreBreakdown.focusDetail,
                },
                {
                  label: 'Goals',
                  pts: scoreBreakdown.goalPoints,
                  max: scoreBreakdown.goalMax,
                  detail: scoreBreakdown.goalDetail,
                },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-[#94A3B8] truncate">
                    {row.label} · {row.detail}
                  </span>
                  <span className="font-mono-tabular font-semibold shrink-0">
                    {row.pts}/{row.max}
                  </span>
                </div>
              ))}
            </div>

            {showScoreMath && (
              <p className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                Formula: 40 pts from today's task completion ratio + 25 pts from today's habit check-ins + 20 pts for logging 60 focus minutes + 15 pts from active goal progress.
              </p>
            )}
          </div>
        );

      case 'financial-snapshot':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Financial Snapshot</h2>
              <button
                type="button"
                onClick={() => setActiveNav('finance')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Finance
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Monthly Income</span>
                <span className="font-mono-tabular font-semibold text-emerald-500 dark:text-[#34D399]">
                  {formatCurrency(financeMetrics.income, profile.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">Monthly Expenditure</span>
                <span className="font-mono-tabular font-semibold">
                  {formatCurrency(financeMetrics.expense, profile.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-[#94A3B8]">
                  {financeMetrics.hasBudget ? 'Remaining Budget' : 'Net Monthly Balance'}
                </span>
                <span
                  className={`font-mono-tabular font-semibold ${
                    financeMetrics.remainingBudget < 0 ? 'text-rose-500' : 'text-[#60A5FA]'
                  }`}
                >
                  {formatCurrency(financeMetrics.remainingBudget, profile.currency)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-[#94A3B8]">Savings Goals Progress</span>
                <span className="font-mono-tabular font-medium">{financeMetrics.savingsPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-[#0B0D12] overflow-hidden">
                <div
                  className="h-full bg-[#34D399] transition-all"
                  style={{ width: `${financeMetrics.savingsPct}%` }}
                />
              </div>
            </div>
          </div>
        );

      case 'focus-widget':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base">Focus Timer</h2>
              <button
                type="button"
                onClick={() => setActiveNav('focus')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Full Timer
              </button>
            </div>
            <div className="text-center py-2">
              <p className="font-mono-tabular text-4xl font-bold tracking-tight">
                {formatTimer(focusSeconds)}
              </p>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                25-minute Pomodoro sprint
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => setFocusRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                {focusRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{focusRunning ? 'Pause' : 'Start Focus'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFocusRunning(false);
                  setFocusSeconds(25 * 60);
                }}
                aria-label="Reset focus timer"
                className="p-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );

      case 'my-day':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">My Day</h2>
              <button
                type="button"
                onClick={() => setActiveNav('my-day')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                View Full Day
              </button>
            </div>
            {myDayItems.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
                  Nothing scheduled for today yet.
                </p>
                <button
                  type="button"
                  onClick={() => openQuickAdd('task')}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#8B7CFF] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add a task for today
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {myDayItems.slice(0, 6).map((item) => (
                  <div
                    key={`${item.kind}_${item.id}`}
                    className="flex items-center justify-between gap-3 py-1.5 border-b last:border-b-0 border-slate-100 dark:border-white/[0.05]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.kind === 'task' ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateTask(item.id, {
                              status: item.done ? 'todo' : 'done',
                              completedAt: item.done ? '' : new Date().toISOString(),
                            })
                          }
                          className="text-slate-400 hover:text-[#8B7CFF] cursor-pointer shrink-0"
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <span className="w-4 text-center text-xs text-[#60A5FA] font-semibold shrink-0">
                          •
                        </span>
                      )}
                      <div className="min-w-0">
                        <p
                          className={`text-sm truncate ${
                            item.done ? 'line-through text-slate-400' : 'text-slate-900 dark:text-[#F8FAFC]'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">{item.meta}</p>
                      </div>
                    </div>
                    <span className="font-mono-tabular text-xs text-slate-500 dark:text-[#94A3B8] shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'habit-overview':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Habit Overview</h2>
              <button
                type="button"
                onClick={() => setActiveNav('habits')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                All Habits
              </button>
            </div>
            {habits.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500 dark:text-[#94A3B8]">No habits added yet.</p>
                <button
                  type="button"
                  onClick={() => openQuickAdd('habit')}
                  className="mt-2 text-xs font-medium text-[#8B7CFF] hover:underline cursor-pointer"
                >
                  Create your first habit
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {habits.map((h) => {
                  const doneToday = habitRecords.some(
                    (r) => r.habitId === h.id && r.date === today && r.completed
                  );
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#121620]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{h.name}</p>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                          {h.category || 'Daily'} · Target {h.targetPerWeek}x/wk
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleHabitDate(h.id, today)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          doneToday
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#34D399]'
                            : 'bg-slate-200/70 dark:bg-white/10 text-slate-700 dark:text-[#F8FAFC] hover:bg-[#8B7CFF]/20'
                        }`}
                      >
                        {doneToday ? 'Done' : 'Check in'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'upcoming-events':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-base">Upcoming Events</h2>
              <button
                type="button"
                onClick={() => setActiveNav('calendar')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Calendar
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-6 text-center">
                No upcoming calendar events.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#121620]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                        {formatDateDisplay(ev.startDate, profile.dateFormat)} · {ev.durationMinutes} min
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                    <span className="font-mono-tabular text-xs font-medium text-[#60A5FA] shrink-0">
                      {ev.startTime}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'quick-notes':
        return (
          <div
            key={id}
            className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-base">Quick Notes</h2>
              <button
                type="button"
                onClick={() => setActiveNav('notes')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                All Notes
              </button>
            </div>
            <form onSubmit={handleSaveQuickNote} className="space-y-2.5">
              <input
                type="text"
                value={quickNoteTitle}
                onChange={(e) => setQuickNoteTitle(e.target.value)}
                placeholder="Note title..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
              />
              <textarea
                rows={3}
                value={quickNoteBody}
                onChange={(e) => setQuickNoteBody(e.target.value)}
                placeholder="Capture a thought, checklist, or reminder..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-[#8B7CFF] text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                Save Quick Note
              </button>
            </form>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Personalized Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/[0.07]">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {getGreeting(now.getHours())}, {profile.displayName.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
            {now.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            ·{' '}
            <span className="font-mono-tabular">
              {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {weather && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] text-xs">
              <CloudSun className="w-4 h-4 text-[#60A5FA]" />
              <span className="font-medium">{weather.city}</span>
              <span className="font-mono-tabular font-semibold">{weather.temperatureC}°C</span>
              <span className="text-slate-500 dark:text-[#94A3B8] hidden sm:inline">
                {weather.condition}
              </span>
            </div>
          )}
          {!weather && weatherError && (
            <span className="text-xs text-slate-400">{weatherError}</span>
          )}

          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
              customizing
                ? 'border-[#8B7CFF] bg-[#8B7CFF]/10 text-[#8B7CFF]'
                : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{customizing ? 'Done Customizing' : 'Customize Widgets'}</span>
          </button>
        </div>
      </div>

      {/* Widget Customization Panel */}
      {customizing && (
        <div className="rounded-xl border border-[#8B7CFF]/30 bg-white dark:bg-[#121620] p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Arrange or toggle dashboard widgets</p>
            <button
              type="button"
              onClick={() =>
                updateProfileSettings({ widgetOrder: DEFAULT_WIDGET_ORDER, hiddenWidgets: [] })
              }
              className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
            >
              Restore defaults
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {widgetOrder.map((wId, idx) => {
              const hidden = hiddenSet.has(wId);
              return (
                <div
                  key={wId}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                >
                  <span className={`text-xs font-medium truncate ${hidden ? 'opacity-50 line-through' : ''}`}>
                    {WIDGET_LABELS[wId]}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveWidget(wId, -1)}
                      aria-label={`Move ${WIDGET_LABELS[wId]} up`}
                      className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === widgetOrder.length - 1}
                      onClick={() => moveWidget(wId, 1)}
                      aria-label={`Move ${WIDGET_LABELS[wId]} down`}
                      className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleWidgetVisibility(wId)}
                      aria-label={hidden ? `Show ${WIDGET_LABELS[wId]}` : `Hide ${WIDGET_LABELS[wId]}`}
                      className="p-1 text-slate-400 hover:text-[#8B7CFF] cursor-pointer"
                    >
                      {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Responsive Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {widgetOrder.map((wId) => renderWidget(wId))}
      </div>
    </div>
  );
}
