import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Database,
  Flame,
  LogIn,
  LogOut,
  Save,
  Settings,
  Timer,
  Wallet,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { calculateProductivityScore, formatCurrency, getTodayISO } from '../../lib/formatters';

const DEFAULT_AVATAR = '/src/assets/images/avatar_default_profile_1794907513338.jpg';

export function ProfileView() {
  const {
    mode,
    profile,
    updateProfileSettings,
    loginWithGoogle,
    logout,
    seedStarterWorkspace,
    setActiveNav,
    tasks,
    notes,
    habits,
    habitRecords,
    focusSessions,
    goals,
    transactions,
    pushToast,
  } = useDayflow();

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [roleTitle, setRoleTitle] = useState(profile.roleTitle || 'Workspace Owner');
  const [photoURL, setPhotoURL] = useState(profile.photoURL || DEFAULT_AVATAR);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setRoleTitle(profile.roleTitle || 'Workspace Owner');
    setPhotoURL(profile.photoURL || DEFAULT_AVATAR);
    setAvatarFailed(false);
  }, [profile.displayName, profile.roleTitle, profile.photoURL]);

  const today = getTodayISO();

  const stats = useMemo(() => {
    const completedTasks = tasks.filter((t) => t.status === 'done').length;
    const totalFocusMinutes = focusSessions
      .filter((s) => s.mode === 'focus')
      .reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const score = calculateProductivityScore({
      tasks,
      habits,
      habitRecords,
      focusSessions,
      goals,
      today,
    });
    return {
      completedTasks,
      totalTasks: tasks.length,
      totalFocusMinutes,
      totalNotes: notes.length,
      totalHabits: habits.length,
      totalExpense,
      score: score.totalScore,
    };
  }, [tasks, habits, habitRecords, focusSessions, goals, notes.length, transactions, today]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      pushToast({ title: 'Display name cannot be empty', variant: 'warning' });
      return;
    }
    setSaving(true);
    try {
      await updateProfileSettings({
        displayName: displayName.trim(),
        roleTitle: roleTitle.trim() || 'Workspace Owner',
        photoURL: photoURL.trim() || DEFAULT_AVATAR,
      });
      pushToast({ title: 'Profile updated', variant: 'success' });
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedStarterWorkspace();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Profile Identity Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          {!avatarFailed && (photoURL || profile.photoURL) ? (
            <img
              src={photoURL || profile.photoURL || DEFAULT_AVATAR}
              alt={profile.displayName}
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
              className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-white/15 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#8B7CFF]/20 text-[#8B7CFF] flex items-center justify-center text-lg font-bold shrink-0">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
              {profile.displayName}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] truncate">
              {profile.roleTitle || 'Workspace Owner'} · {profile.email}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {mode === 'auth' ? 'Cloud Sync Active (Firestore)' : 'Interactive Demo Workspace'} ·{' '}
              {profile.timezone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveNav('settings')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences</span>
          </button>
          {mode === 'demo' ? (
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in with Google</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Workspace Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>Tasks Completed</span>
            <CheckSquare className="w-4 h-4 text-[#8B7CFF]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">
            {stats.completedTasks}/{stats.totalTasks}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>Focus Logged</span>
            <Timer className="w-4 h-4 text-[#60A5FA]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">
            {stats.totalFocusMinutes}m
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>Today Score</span>
            <Flame className="w-4 h-4 text-[#34D399]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">
            {stats.score}/100
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
            <span>Tracked Spend</span>
            <Wallet className="w-4 h-4 text-[#FBBF24]" />
          </div>
          <p className="font-mono-tabular text-2xl font-bold mt-2 text-slate-900 dark:text-[#F8FAFC]">
            {formatCurrency(stats.totalExpense, profile.currency)}
          </p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 space-y-4"
      >
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
          Personal Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
              Role or Focus Title
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="Product Designer, Student, Founder..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1.5">
            Avatar Image URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={photoURL}
              onChange={(e) => {
                setPhotoURL(e.target.value);
                setAvatarFailed(false);
              }}
              placeholder={DEFAULT_AVATAR}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC]"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoURL(DEFAULT_AVATAR);
                setAvatarFailed(false);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Use Default Avatar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500 dark:text-[#94A3B8]">
            {stats.totalNotes} notes · {stats.totalHabits} habits · {goals.length} goals in workspace
          </span>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </form>

      {/* Starter Sample Data Loader for Fresh Auth Workspaces */}
      {mode === 'auth' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">
              Starter Sample Workspace
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
              Populate your new account with realistic tasks, calendar events, notes, habits, and sample transactions so you can explore every dashboard chart immediately.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeed}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#8B7CFF]/40 text-[#8B7CFF] hover:bg-[#8B7CFF]/10 text-xs font-medium whitespace-nowrap disabled:opacity-60 cursor-pointer shrink-0"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'Loading...' : 'Load Starter Sample Data'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
