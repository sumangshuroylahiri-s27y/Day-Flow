import { useMemo } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Plus, Target } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { getTodayISO } from '../../lib/formatters';

export function MyDayView() {
  const { tasks, updateTask, events, goals, openQuickAdd } = useDayflow();
  const today = getTodayISO();

  const timeline = useMemo(() => {
    const dayEvents = events
      .filter((e) => e.startDate === today)
      .map((e) => ({
        id: e.id,
        kind: 'event' as const,
        time: e.startTime,
        title: e.title,
        subtitle: `${e.durationMinutes} min · ${e.category}${e.location ? ` · ${e.location}` : ''}`,
      }));

    const dayTasks = tasks
      .filter((t) => t.dueDate === today || (t.status !== 'done' && t.dueDate && t.dueDate < today))
      .map((t) => ({
        id: t.id,
        kind: 'task' as const,
        time: t.dueTime || '09:00',
        title: t.title,
        subtitle: `${t.dueDate && t.dueDate < today ? 'Overdue' : 'Today'} · ${t.priority} priority`,
        done: t.status === 'done',
        overdue: Boolean(t.dueDate && t.dueDate < today && t.status !== 'done'),
      }));

    return [...dayEvents, ...dayTasks].sort((a, b) => a.time.localeCompare(b.time));
  }, [events, tasks, today]);

  const dailyGoals = useMemo(
    () => goals.filter((g) => g.horizon === 'daily' || g.horizon === 'weekly'),
    [goals]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">My Day</h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Chronological schedule of your meetings, tasks, and reminders for {today}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openQuickAdd('task')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
          <button
            type="button"
            onClick={() => openQuickAdd('event')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-4">Chronological Timeline</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-10 text-center">
              Your day is open. Add a task or schedule an event to build your timeline.
            </p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item) => (
                <div
                  key={`${item.kind}_${item.id}`}
                  className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 dark:bg-[#121620] border border-slate-200/70 dark:border-white/[0.05]"
                >
                  <div className="flex items-center gap-1.5 font-mono-tabular text-xs text-slate-500 dark:text-[#94A3B8] pt-0.5 w-16 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{item.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.kind === 'task' ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateTask(item.id, {
                              status: item.done ? 'todo' : 'done',
                              completedAt: item.done ? '' : new Date().toISOString(),
                            })
                          }
                          className="cursor-pointer shrink-0"
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 hover:text-[#8B7CFF]" />
                          )}
                        </button>
                      ) : (
                        <Calendar className="w-4 h-4 text-[#60A5FA] shrink-0" />
                      )}
                      <p
                        className={`text-sm font-medium truncate ${
                          item.kind === 'task' && item.done ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {item.title}
                      </p>
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        item.kind === 'task' && item.overdue
                          ? 'text-amber-500 dark:text-[#FBBF24]'
                          : 'text-slate-500 dark:text-[#94A3B8]'
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-display font-semibold text-base">Near-Term Goals</h3>
          </div>
          {dailyGoals.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-6 text-center">
              No daily or weekly goals yet.
            </p>
          ) : (
            <div className="space-y-3">
              {dailyGoals.map((g) => (
                <div key={g.id} className="p-3 rounded-lg bg-slate-50 dark:bg-[#121620]">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="truncate">{g.title}</span>
                    <span className="font-mono-tabular text-xs text-[#8B7CFF]">{g.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#0B0D12] mt-2 overflow-hidden">
                    <div className="h-full bg-[#8B7CFF]" style={{ width: `${g.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
