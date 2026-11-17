import {
  CurrencyCode,
  DateFormatType,
  FocusSession,
  Goal,
  Habit,
  HabitRecord,
  Task,
} from '../types/dayflow';

const CURRENCY_LOCALE: Record<CurrencyCode, { locale: string; symbol: string }> = {
  INR: { locale: 'en-IN', symbol: '₹' },
  USD: { locale: 'en-US', symbol: '$' },
  EUR: { locale: 'de-DE', symbol: '€' },
  GBP: { locale: 'en-GB', symbol: '£' },
  JPY: { locale: 'ja-JP', symbol: '¥' },
  AUD: { locale: 'en-AU', symbol: 'A$' },
  CAD: { locale: 'en-CA', symbol: 'C$' },
  SGD: { locale: 'en-SG', symbol: 'S$' },
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const cfg = CURRENCY_LOCALE[currency] || CURRENCY_LOCALE.INR;
  try {
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${cfg.symbol}${amount.toFixed(0)}`;
  }
}

export function getCurrencySymbol(currency: CurrencyCode = 'INR'): string {
  return CURRENCY_LOCALE[currency]?.symbol || '₹';
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + deltaDays);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function formatDateDisplay(isoDate: string | undefined, format: DateFormatType = 'DD/MM/YYYY'): string {
  if (!isoDate) return '—';
  const clean = isoDate.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts;
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (format === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`;
}

export function getGreeting(hour = new Date().getHours()): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function downloadFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToCSV(
  rows: Array<{
    date: string;
    type: string;
    category: string;
    description?: string;
    paymentMethod: string;
    amount: number;
  }>,
  currency: CurrencyCode
) {
  const escape = (val: string | number | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const header = ['Date', 'Type', 'Category', 'Description', 'Payment Method', `Amount (${currency})`];
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      [r.date, r.type, r.category, r.description || '', r.paymentMethod, r.amount].map(escape).join(',')
    ),
  ];
  downloadFile(`dayflow-transactions-${getTodayISO()}.csv`, lines.join('\n'), 'text/csv;charset=utf-8');
}

export interface ProductivityBreakdown {
  totalScore: number;
  taskPoints: number;
  taskMax: 40;
  taskDetail: string;
  habitPoints: number;
  habitMax: 25;
  habitDetail: string;
  focusPoints: number;
  focusMax: 20;
  focusDetail: string;
  goalPoints: number;
  goalMax: 15;
  goalDetail: string;
}

export function calculateProductivityScore(params: {
  tasks: Task[];
  habits: Habit[];
  habitRecords: HabitRecord[];
  focusSessions: FocusSession[];
  goals: Goal[];
  today: string;
}): ProductivityBreakdown {
  const { tasks, habits, habitRecords, focusSessions, goals, today } = params;

  // 1. Tasks (40 pts): Based on tasks due today or completed today
  const dueTodayOrCompleted = tasks.filter(
    (t) => t.dueDate === today || (t.status === 'done' && t.completedAt?.startsWith(today))
  );
  const relevantTasks = dueTodayOrCompleted.length > 0 ? dueTodayOrCompleted : tasks;
  const completedCount = relevantTasks.filter((t) => t.status === 'done').length;
  const taskRatio = relevantTasks.length > 0 ? completedCount / relevantTasks.length : 0;
  const taskPoints = Math.round(taskRatio * 40);
  const taskDetail =
    relevantTasks.length > 0
      ? `${completedCount}/${relevantTasks.length} tasks done (${Math.round(taskRatio * 100)}%)`
      : 'No tasks scheduled yet';

  // 2. Habits (25 pts): Today's habit completion rate
  const completedHabitIdsToday = new Set(
    habitRecords.filter((r) => r.date === today && r.completed).map((r) => r.habitId)
  );
  const habitRatio = habits.length > 0 ? completedHabitIdsToday.size / habits.length : 0;
  const habitPoints = Math.round(habitRatio * 25);
  const habitDetail =
    habits.length > 0
      ? `${completedHabitIdsToday.size}/${habits.length} habits checked today`
      : 'No habits tracked yet';

  // 3. Focus Sessions (20 pts): Target 60 focus minutes today
  const focusMinutesToday = focusSessions
    .filter((s) => s.mode === 'focus' && s.completedAt.startsWith(today))
    .reduce((acc, s) => acc + s.durationMinutes, 0);
  const focusRatio = Math.min(1, focusMinutesToday / 60);
  const focusPoints = Math.round(focusRatio * 20);
  const focusDetail = `${focusMinutesToday} / 60 focus min logged today`;

  // 4. Goals (15 pts): Average progress of active/daily goals
  const activeGoals = goals.filter((g) => g.status !== 'paused');
  const avgGoalProgress =
    activeGoals.length > 0
      ? activeGoals.reduce((acc, g) => acc + g.progress, 0) / activeGoals.length
      : 0;
  const goalPoints = Math.round((avgGoalProgress / 100) * 15);
  const goalDetail =
    activeGoals.length > 0
      ? `${Math.round(avgGoalProgress)}% avg across ${activeGoals.length} active goals`
      : 'No active goals yet';

  return {
    totalScore: taskPoints + habitPoints + focusPoints + goalPoints,
    taskPoints,
    taskMax: 40,
    taskDetail,
    habitPoints,
    habitMax: 25,
    habitDetail,
    focusPoints,
    focusMax: 20,
    focusDetail,
    goalPoints,
    goalMax: 15,
    goalDetail,
  };
}
