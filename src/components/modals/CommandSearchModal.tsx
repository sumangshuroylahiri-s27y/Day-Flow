import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  CheckSquare,
  Calendar,
  FileText,
  Wallet,
  Flame,
  Target,
  Plus,
  Timer,
  Sparkles,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { formatCurrency } from '../../lib/formatters';

export function CommandSearchModal() {
  const {
    commandSearchOpen,
    setCommandSearchOpen,
    setActiveNav,
    openQuickAdd,
    tasks,
    events,
    notes,
    transactions,
    habits,
    goals,
    profile,
  } = useDayflow();

  const [query, setQuery] = useState('');

  useEffect(() => {
    if (commandSearchOpen) {
      setQuery('');
    }
  }, [commandSearchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (str?: string) => !q || (str || '').toLowerCase().includes(q);

    return {
      tasks: tasks.filter((t) => match(t.title) || match(t.description) || match(t.category)).slice(0, 5),
      events: events.filter((e) => match(e.title) || match(e.description) || match(e.location)).slice(0, 4),
      notes: notes.filter((n) => match(n.title) || match(n.content) || match(n.folder)).slice(0, 4),
      transactions: transactions
        .filter((tx) => match(tx.category) || match(tx.description) || match(tx.paymentMethod))
        .slice(0, 4),
      habits: habits.filter((h) => match(h.name) || match(h.category)).slice(0, 4),
      goals: goals.filter((g) => match(g.title) || match(g.description)).slice(0, 4),
    };
  }, [query, tasks, events, notes, transactions, habits, goals]);

  if (!commandSearchOpen) return null;

  const jump = (nav: Parameters<typeof setActiveNav>[0]) => {
    setActiveNav(nav);
    setCommandSearchOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setCommandSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10">
          <Search className="w-5 h-5 text-[#8B7CFF] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, notes, events, transactions, habits, or goals..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setCommandSearchOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          <div>
            <p className="px-2 text-xs font-medium text-slate-400 mb-1.5">Quick Actions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {[
                { label: 'Create Task', icon: Plus, action: () => { setCommandSearchOpen(false); openQuickAdd('task'); } },
                { label: 'Add Note', icon: FileText, action: () => { setCommandSearchOpen(false); openQuickAdd('note'); } },
                { label: 'Record Expense', icon: Wallet, action: () => { setCommandSearchOpen(false); openQuickAdd('transaction'); } },
                { label: 'Schedule Event', icon: Calendar, action: () => { setCommandSearchOpen(false); openQuickAdd('event'); } },
                { label: 'Start Focus Session', icon: Timer, action: () => jump('focus') },
                { label: 'Ask DAYFLOW AI', icon: Sparkles, action: () => jump('ai-assistant') },
              ].map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={qa.action}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-[#F8FAFC] bg-slate-100/80 dark:bg-[#171D29] hover:bg-[#8B7CFF]/15 hover:text-[#8B7CFF] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <qa.icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {results.tasks.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Tasks</p>
              {results.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => jump('tasks')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckSquare className="w-4 h-4 text-[#8B7CFF] shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">{t.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] shrink-0 ml-2">
                    {t.priority} {t.dueDate ? `· ${t.dueDate}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.events.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Calendar Events</p>
              {results.events.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => jump('calendar')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="w-4 h-4 text-[#60A5FA] shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">{e.title}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] font-mono-tabular shrink-0 ml-2">
                    {e.startDate} · {e.startTime}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.notes.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Notes</p>
              {results.notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => jump('notes')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">
                      {n.title || 'Untitled Note'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] shrink-0 ml-2">{n.folder}</span>
                </button>
              ))}
            </div>
          )}

          {results.transactions.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Transactions</p>
              {results.transactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => jump('finance')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Wallet className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">
                      {tx.category} {tx.description ? `— ${tx.description}` : ''}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-mono-tabular shrink-0 ml-2 ${
                      tx.type === 'income' ? 'text-[#34D399]' : 'text-slate-600 dark:text-[#94A3B8]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, profile.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.habits.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Habits</p>
              {results.habits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => jump('habits')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">{h.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] shrink-0 ml-2">
                    {h.targetPerWeek}x / week
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.goals.length > 0 && (
            <div>
              <p className="px-2 text-xs font-medium text-slate-400 mb-1">Goals</p>
              {results.goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => jump('goals')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Target className="w-4 h-4 text-[#8B7CFF] shrink-0" />
                    <span className="text-sm text-slate-900 dark:text-[#F8FAFC] truncate">{g.title}</span>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8] shrink-0 ml-2">
                    {g.progress}%
                  </span>
                </button>
              ))}
            </div>
          )}

          {query.trim() &&
            results.tasks.length === 0 &&
            results.events.length === 0 &&
            results.notes.length === 0 &&
            results.transactions.length === 0 &&
            results.habits.length === 0 &&
            results.goals.length === 0 && (
              <p className="text-center text-sm text-slate-500 dark:text-[#94A3B8] py-8">
                No records matched "{query}".
              </p>
            )}
        </div>
      </div>
    </div>
  );
}
