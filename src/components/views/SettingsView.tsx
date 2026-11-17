import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Database,
  Download,
  Eye,
  EyeOff,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { downloadFile, exportTransactionsToCSV, getTodayISO } from '../../lib/formatters';
import {
  CurrencyCode,
  DateFormatType,
  DEFAULT_WIDGET_ORDER,
  ThemeMode,
  WidgetId,
} from '../../types/dayflow';

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

const CURRENCIES: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'JPY', label: 'JPY (¥) — Japanese Yen' },
  { code: 'AUD', label: 'AUD (A$) — Australian Dollar' },
  { code: 'CAD', label: 'CAD (C$) — Canadian Dollar' },
  { code: 'SGD', label: 'SGD (S$) — Singapore Dollar' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export function SettingsView() {
  const {
    mode,
    profile,
    updateProfileSettings,
    tasks,
    events,
    transactions,
    budgets,
    savingsGoals,
    notes,
    habits,
    habitRecords,
    focusSessions,
    goals,
    seedStarterWorkspace,
    deleteUserAccountData,
    pushToast,
  } = useDayflow();

  const [weatherCity, setWeatherCity] = useState(profile.weatherCity || 'Bengaluru');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const widgetOrder = profile.widgetOrder?.length ? profile.widgetOrder : DEFAULT_WIDGET_ORDER;
  const hiddenWidgets = profile.hiddenWidgets || [];

  const handleSaveWeatherCity = async () => {
    await updateProfileSettings({ weatherCity: weatherCity.trim() || 'Bengaluru' });
    pushToast({ title: 'Weather city updated', description: weatherCity.trim() || 'Bengaluru', variant: 'success' });
  };

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    const idx = widgetOrder.indexOf(id);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= widgetOrder.length) return;
    const copy = [...widgetOrder];
    const [removed] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, removed);
    updateProfileSettings({ widgetOrder: copy });
  };

  const toggleWidgetVisibility = (id: WidgetId) => {
    const isHidden = hiddenWidgets.includes(id);
    const nextHidden = isHidden
      ? hiddenWidgets.filter((w) => w !== id)
      : [...hiddenWidgets, id];
    updateProfileSettings({ hiddenWidgets: nextHidden });
  };

  const resetWidgets = () => {
    updateProfileSettings({
      widgetOrder: DEFAULT_WIDGET_ORDER,
      hiddenWidgets: [],
    });
    pushToast({ title: 'Dashboard layout reset to default', variant: 'info' });
  };

  const handleExportJSON = () => {
    const archive = {
      exportedAt: new Date().toISOString(),
      workspaceMode: mode,
      profile,
      tasks,
      events,
      transactions,
      budgets,
      savingsGoals,
      notes,
      habits,
      habitRecords,
      focusSessions,
      goals,
    };
    downloadFile(
      `dayflow-workspace-${getTodayISO()}.json`,
      JSON.stringify(archive, null, 2),
      'application/json;charset=utf-8'
    );
    pushToast({ title: 'Workspace archive exported (JSON)', variant: 'success' });
  };

  const handleExportCSV = () => {
    exportTransactionsToCSV(transactions, profile.currency);
    pushToast({ title: 'Transactions exported (CSV)', variant: 'success' });
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteUserAccountData();
      setConfirmDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Appearance & Regional Preferences */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
            Workspace Preferences
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Configure appearance, currency, date formatting, timezone, and weather location.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Color Theme
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as ThemeMode[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateProfileSettings({ theme: t })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize cursor-pointer ${
                    profile.theme === t
                      ? 'border-[#8B7CFF] bg-[#8B7CFF]/15 text-[#8B7CFF]'
                      : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94A3B8]'
                  }`}
                >
                  {t} Mode
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Default Currency
            </label>
            <select
              value={profile.currency}
              onChange={(e) => updateProfileSettings({ currency: e.target.value as CurrencyCode })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Date Format
            </label>
            <select
              value={profile.dateFormat}
              onChange={(e) =>
                updateProfileSettings({ dateFormat: e.target.value as DateFormatType })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Timezone
            </label>
            <select
              value={profile.timezone}
              onChange={(e) => updateProfileSettings({ timezone: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            >
              {!TIMEZONES.includes(profile.timezone) && (
                <option value={profile.timezone}>{profile.timezone}</option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Language
            </label>
            <select
              value={profile.language}
              onChange={(e) => updateProfileSettings({ language: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Dashboard Weather City
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={weatherCity}
                onChange={(e) => setWeatherCity(e.target.value)}
                placeholder="Bengaluru, London, New York..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
              />
              <button
                type="button"
                onClick={handleSaveWeatherCity}
                className="px-3 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Update
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/70 dark:border-white/[0.06]">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
              Workspace & Browser Notifications
            </p>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Receive time-based reminders for tasks and habits even when DAYFLOW is in the background.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const perm = await Notification.requestPermission();
                  if (perm === 'granted') {
                    pushToast({ title: 'Browser notifications allowed!', variant: 'success' });
                  } else {
                    pushToast({ title: 'Permission denied', variant: 'warning' });
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-[#8B7CFF]/15 text-[#8B7CFF] hover:bg-[#8B7CFF]/25 text-xs font-medium transition-colors cursor-pointer"
              >
                Allow Browser PUSH
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                updateProfileSettings({ notificationsEnabled: !profile.notificationsEnabled })
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                profile.notificationsEnabled
                  ? 'bg-[#34D399]/15 text-[#34D399]'
                  : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-[#94A3B8]'
              }`}
            >
              {profile.notificationsEnabled ? 'Reminders Active' : 'Reminders Muted'}
            </button>
          </div>
        </div>
      </section>

      {/* Dashboard Widget Customization */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Dashboard Widget Layout
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
              Reorder or hide individual widgets on your home dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={resetWidgets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Defaults</span>
          </button>
        </div>

        <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
          {widgetOrder.map((id, idx) => {
            const hidden = hiddenWidgets.includes(id);
            return (
              <div key={id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono-tabular text-xs text-slate-400 w-5">{idx + 1}.</span>
                  <span
                    className={`text-sm font-medium ${
                      hidden
                        ? 'text-slate-400 line-through'
                        : 'text-slate-900 dark:text-[#F8FAFC]'
                    }`}
                  >
                    {WIDGET_LABELS[id] || id}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveWidget(id, -1)}
                    aria-label={`Move ${WIDGET_LABELS[id]} up`}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === widgetOrder.length - 1}
                    onClick={() => moveWidget(id, 1)}
                    aria-label={`Move ${WIDGET_LABELS[id]} down`}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWidgetVisibility(id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{hidden ? 'Hidden' : 'Visible'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Data Portability & Account Management */}
      <section className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-[#F8FAFC]">
            Data Portability & Workspace Control
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            Export your entire workspace anytime or manage your stored records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#121620] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#8B7CFF]" />
            <span>Export Full Workspace (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-[#121620] hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-medium text-slate-800 dark:text-[#F8FAFC] transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#34D399]" />
            <span>Export Transactions (CSV)</span>
          </button>

          {mode === 'auth' && (
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                try {
                  await seedStarterWorkspace();
                } finally {
                  setSeeding(false);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#8B7CFF]/40 text-xs font-medium text-[#8B7CFF] hover:bg-[#8B7CFF]/10 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>{seeding ? 'Loading Sample Data...' : 'Load Starter Sample Data'}</span>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200/70 dark:border-white/[0.06]">
          {!confirmDeleteOpen ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-rose-500">
                  {mode === 'auth' ? 'Delete Account Workspace Data' : 'Reset Demo Workspace'}
                </p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  {mode === 'auth'
                    ? 'Permanently removes your tasks, events, notes, finances, habits, goals, and AI history from Firestore.'
                    : 'Clears local demonstration changes and returns to the landing screen.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium self-start sm:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{mode === 'auth' ? 'Delete Workspace' : 'Reset Demo'}</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-500">
                    Confirm permanent deletion
                  </p>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-1">
                    {mode === 'auth'
                      ? 'This action cannot be undone. All your Firestore subcollections and profile settings will be erased and you will be signed out.'
                      : 'This will reset all demo edits and exit back to the landing page.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-[#94A3B8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAll}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
