import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckSquare,
  FileText,
  Flame,
  Search,
  Sparkles,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { formatCurrency, formatDateDisplay } from '../../lib/formatters';
import { NavSectionId } from '../../types/dayflow';

type SearchScope = 'all' | 'tasks' | 'events' | 'notes' | 'transactions' | 'habits' | 'goals';

export function SmartSearchView() {
  const {
    tasks,
    events,
    notes,
    transactions,
    habits,
    goals,
    profile,
    setActiveNav,
    openQuickAdd,
  } = useDayflow();

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');

  const normalizedQuery = query.trim().toLowerCase();

  const matches = useMemo(() => {
    const hasMatch = (...fields: Array<string | undefined>) => {
      if (!normalizedQuery) return true;
      return fields.some((f) => (f || '').toLowerCase().includes(normalizedQuery));
    };

    const matchedTasks = tasks.filter(
      (t) =>
        hasMatch(t.title, t.description, t.category, t.priority, ...(t.tags || []))
    );
    const matchedEvents = events.filter((e) =>
      hasMatch(e.title, e.description, e.category, e.location)
    );
    const matchedNotes = notes.filter((n) =>
      hasMatch(n.title, n.content, n.folder, ...(n.tags || []))
    );
    const matchedTransactions = transactions.filter((tx) =>
      hasMatch(tx.category, tx.description, tx.paymentMethod, tx.type, String(tx.amount))
    );
    const matchedHabits = habits.filter((h) => hasMatch(h.name, h.category, h.frequency));
    const matchedGoals = goals.filter((g) => hasMatch(g.title, g.description, g.horizon, g.status));

    return {
      tasks: matchedTasks,
      events: matchedEvents,
      notes: matchedNotes,
      transactions: matchedTransactions,
      habits: matchedHabits,
      goals: matchedGoals,
    };
  }, [normalizedQuery, tasks, events, notes, transactions, habits, goals]);

  const counts = {
    all:
      matches.tasks.length +
      matches.events.length +
      matches.notes.length +
      matches.transactions.length +
      matches.habits.length +
      matches.goals.length,
    tasks: matches.tasks.length,
    events: matches.events.length,
    notes: matches.notes.length,
    transactions: matches.transactions.length,
    habits: matches.habits.length,
    goals: matches.goals.length,
  };

  const jumpTo = (nav: NavSectionId) => {
    setActiveNav(nav);
  };

  const showSection = (key: Exclude<SearchScope, 'all'>) => scope === 'all' || scope === key;

  return (
    <div className="space-y-6">
      {/* Header & Search Input */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Smart Search
            </h2>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
              Search instantaneously across tasks, events, notes, finances, habits, and goals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => jumpTo('ai-assistant')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-[#F8FAFC] hover:border-[#8B7CFF]/50 hover:text-[#8B7CFF] transition-colors self-start md:self-auto cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8B7CFF]" />
            <span>Ask DAYFLOW AI instead</span>
          </button>
        </div>

        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-[#8B7CFF] absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type keywords, categories, tags, amounts, or folders..."
            className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-sm text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 focus:outline-none focus:border-[#8B7CFF]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search query"
              className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scope Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          {(
            [
              ['all', 'All Records'],
              ['tasks', 'Tasks'],
              ['events', 'Calendar'],
              ['notes', 'Notes'],
              ['transactions', 'Finance'],
              ['habits', 'Habits'],
              ['goals', 'Goals'],
            ] as Array<[SearchScope, string]>
          ).map(([key, label]) => {
            const active = scope === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#8B7CFF] text-white'
                    : 'bg-slate-100 dark:bg-[#121620] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {label} <span className="font-mono-tabular opacity-80 ml-1">{counts[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {counts[scope] === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-10 text-center">
          <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
            {normalizedQuery ? `No matches found for "${query}"` : 'No items in this category yet'}
          </p>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Try another keyword or create a new record directly.
          </p>
          <button
            type="button"
            onClick={() => openQuickAdd('task')}
            className="mt-4 px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Quick Add Record
          </button>
        </div>
      )}

      {/* Results Grid */}
      <div className="space-y-6">
        {showSection('tasks') && matches.tasks.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#8B7CFF]" />
                <h3 className="font-display font-semibold text-sm">Tasks ({matches.tasks.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('tasks')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Tasks
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.tasks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => jumpTo('tasks')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        t.status === 'done'
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-[#F8FAFC]'
                      }`}
                    >
                      {t.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                      {t.category || 'General'} · {t.priority} priority
                      {t.dueDate ? ` · Due ${formatDateDisplay(t.dueDate, profile.dateFormat)}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8] shrink-0">
                    {t.status.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {showSection('events') && matches.events.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#60A5FA]" />
                <h3 className="font-display font-semibold text-sm">
                  Calendar Events ({matches.events.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('calendar')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Calendar
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.events.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => jumpTo('calendar')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
                      {ev.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                      {ev.category}
                      {ev.location ? ` · ${ev.location}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8] shrink-0">
                    {formatDateDisplay(ev.startDate, profile.dateFormat)} · {ev.startTime}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {showSection('notes') && matches.notes.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <h3 className="font-display font-semibold text-sm">Notes ({matches.notes.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('notes')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Notes
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.notes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => jumpTo('notes')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
                      {n.title || 'Untitled Note'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                      {n.content.replace(/\s+/g, ' ').slice(0, 120) || 'Empty note'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#94A3B8] shrink-0">{n.folder}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {showSection('transactions') && matches.transactions.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" />
                <h3 className="font-display font-semibold text-sm">
                  Transactions ({matches.transactions.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('finance')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Finance Tracker
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.transactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => jumpTo('finance')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
                      {tx.category}
                      {tx.description ? ` — ${tx.description}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {formatDateDisplay(tx.date, profile.dateFormat)} · {tx.paymentMethod}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-mono-tabular font-semibold shrink-0 ${
                      tx.type === 'income' ? 'text-[#34D399]' : 'text-slate-700 dark:text-[#F8FAFC]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, profile.currency)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {showSection('habits') && matches.habits.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="font-display font-semibold text-sm">Habits ({matches.habits.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('habits')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Habits
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.habits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => jumpTo('habits')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
                      {h.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                      {h.category || 'Health'} · {h.frequency}
                    </p>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-500 dark:text-[#94A3B8] shrink-0">
                    {h.targetPerWeek}x / week
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {showSection('goals') && matches.goals.length > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#8B7CFF]" />
                <h3 className="font-display font-semibold text-sm">Goals ({matches.goals.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => jumpTo('goals')}
                className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
              >
                Open Goals
              </button>
            </div>
            <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
              {matches.goals.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => jumpTo('goals')}
                  className="w-full py-2.5 px-2 -mx-2 rounded-lg flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC] truncate">
                      {g.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                      {g.horizon.replace('_', '-')} · {g.status}
                    </p>
                  </div>
                  <span className="text-sm font-mono-tabular font-semibold text-[#8B7CFF] shrink-0">
                    {g.progress}%
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
