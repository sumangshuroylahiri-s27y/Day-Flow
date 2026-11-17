import { useMemo } from 'react';
import { CheckSquare, Wallet, Timer, Flame, FileText } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { formatCurrency } from '../../lib/formatters';

export function ActivityView() {
  const { tasks, transactions, focusSessions, habitRecords, habits, notes, profile } = useDayflow();

  const feed = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'task' | 'finance' | 'focus' | 'habit' | 'note';
      title: string;
      detail: string;
      date: string;
    }> = [];

    tasks
      .filter((t) => t.status === 'done')
      .forEach((t) => {
        items.push({
          id: `t_${t.id}`,
          type: 'task',
          title: `Completed task: ${t.title}`,
          detail: `${t.category || 'General'} · ${t.priority} priority`,
          date: (t.completedAt || t.updatedAt || t.dueDate || '2026-11-17').slice(0, 10),
        });
      });

    transactions.forEach((tx) => {
      items.push({
        id: `tx_${tx.id}`,
        type: 'finance',
        title: `${tx.type === 'income' ? 'Income' : 'Expense'}: ${tx.category}`,
        detail: `${formatCurrency(tx.amount, profile.currency)} via ${tx.paymentMethod}`,
        date: tx.date,
      });
    });

    focusSessions.forEach((fs) => {
      items.push({
        id: `fs_${fs.id}`,
        type: 'focus',
        title: `Completed ${fs.durationMinutes}m ${fs.mode.replace('_', ' ')} session`,
        detail: fs.taskTitle ? `Linked to: ${fs.taskTitle}` : 'Unlinked sprint',
        date: fs.completedAt.slice(0, 10),
      });
    });

    const habitNameMap = new Map(habits.map((h) => [h.id, h.name]));
    habitRecords
      .filter((r) => r.completed)
      .slice(0, 20)
      .forEach((r) => {
        items.push({
          id: `hr_${r.id}`,
          type: 'habit',
          title: `Habit check-in: ${habitNameMap.get(r.habitId) || 'Habit'}`,
          detail: 'Daily consistency logged',
          date: r.date,
        });
      });

    notes.forEach((n) => {
      items.push({
        id: `n_${n.id}`,
        type: 'note',
        title: `Note updated: ${n.title || 'Untitled Note'}`,
        detail: `Folder: ${n.folder}`,
        date: (n.updatedAt || '2026-11-17').slice(0, 10),
      });
    });

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40);
  }, [tasks, transactions, focusSessions, habitRecords, habits, notes, profile.currency]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Workspace Activity</h2>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
          Recent completions, logged transactions, focus sprints, and habit check-ins across DAYFLOW.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] divide-y divide-slate-100 dark:divide-white/[0.06]">
        {feed.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-12 text-center">
            No workspace activity yet. Complete a task, log a transaction, or run a focus sprint to see updates here.
          </p>
        ) : (
          feed.map((item) => {
            const Icon =
              item.type === 'task'
                ? CheckSquare
                : item.type === 'finance'
                ? Wallet
                : item.type === 'focus'
                ? Timer
                : item.type === 'habit'
                ? Flame
                : FileText;
            const color =
              item.type === 'task'
                ? 'text-[#34D399]'
                : item.type === 'finance'
                ? 'text-[#60A5FA]'
                : item.type === 'focus'
                ? 'text-[#8B7CFF]'
                : item.type === 'habit'
                ? 'text-[#FBBF24]'
                : 'text-slate-400';

            return (
              <div key={item.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs text-slate-400 shrink-0">
                  {item.date}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
