import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  SunMedium,
  Activity,
  CheckSquare,
  Calendar,
  FileText,
  Flame,
  Timer,
  Wallet,
  Target,
  FolderOpen,
  Sparkles,
  Wrench,
  Search,
  User,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogIn,
} from 'lucide-react';
import { useDayflow } from '../context/DayflowContext';
import { NavSectionId } from '../types/dayflow';
import { AuthModal } from './modals/AuthModal';
import { PWAInstallButton } from './PWAInstallButton';

interface NavGroup {
  label: string;
  items: Array<{ id: NavSectionId; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'my-day', label: 'My Day', icon: SunMedium },
      { id: 'activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    label: 'Productivity',
    items: [
      { id: 'tasks', label: 'Tasks', icon: CheckSquare },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'habits', label: 'Habits', icon: Flame },
      { id: 'focus', label: 'Focus Timer', icon: Timer },
    ],
  },
  {
    label: 'Personal Management',
    items: [
      { id: 'finance', label: 'Finance Tracker', icon: Wallet },
      { id: 'goals', label: 'Goals', icon: Target },
      { id: 'documents', label: 'Documents', icon: FolderOpen },
    ],
  },
  {
    label: 'Smart Tools',
    items: [
      { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
      { id: 'utilities', label: 'Utilities', icon: Wrench },
      { id: 'smart-search', label: 'Smart Search', icon: Search },
    ],
  },
  {
    label: 'Personal',
    items: [
      { id: 'profile', label: 'Profile', icon: User },
      { id: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

const NAV_TITLES: Record<NavSectionId, string> = {
  dashboard: 'Dashboard',
  'my-day': 'My Day',
  activity: 'Activity',
  tasks: 'Tasks',
  calendar: 'Calendar',
  notes: 'Notes',
  habits: 'Habits',
  focus: 'Focus Timer',
  finance: 'Finance Tracker',
  goals: 'Goals',
  documents: 'Documents',
  'ai-assistant': 'DAYFLOW AI',
  utilities: 'Utilities',
  'smart-search': 'Smart Search',
  profile: 'Profile',
  settings: 'Settings',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    mode,
    activeNav,
    setActiveNav,
    profile,
    toggleTheme,
    setCommandSearchOpen,
    openQuickAdd,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    exitToLanding,
    loadingData,
  } = useDayflow();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const handleSelectNav = (id: NavSectionId) => {
    setActiveNav(id);
    setMobileOpen(false);
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#121620] border-r border-slate-200 dark:border-white/[0.07] select-none">
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-white/[0.07]">
        {(!collapsed || isMobile) && (
          <button
            type="button"
            onClick={exitToLanding}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] hover:text-[#8B7CFF] transition-colors cursor-pointer whitespace-nowrap"
          >
            DAYFLOW
          </button>
        )}
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer mx-auto"
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {(!collapsed || isMobile) && (
              <p className="px-3 mb-1.5 text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={collapsed && !isMobile ? item.label : undefined}
                    onClick={() => handleSelectNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#8B7CFF]/15 text-[#7C6BFF] dark:text-[#8B7CFF]'
                        : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-[#F8FAFC] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-white/[0.07]">
        {mode === 'demo' ? (
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            title="Sign in to sync data"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            {(!collapsed || isMobile) && <span>Sign in to sync</span>}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSelectNav('profile')}
            className="w-full flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            {!avatarFailed && profile.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#8B7CFF]/20 text-[#8B7CFF] flex items-center justify-center text-xs font-semibold shrink-0">
                {profile.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            {(!collapsed || isMobile) && (
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC] truncate">
                  {profile.displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] truncate">
                  {profile.email}
                </p>
              </div>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#0B0D12] text-slate-900 dark:text-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 ${
          collapsed ? 'w-[68px]' : 'w-[248px]'
        } sticky top-0 h-screen`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-black/50 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-72 h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-white/[0.07] bg-white/85 dark:bg-[#0B0D12]/85 backdrop-blur-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-semibold truncate">
              {NAV_TITLES[activeNav]}
            </h1>
            {mode === 'demo' && (
              <span className="hidden sm:inline-block text-xs text-slate-500 dark:text-[#94A3B8]">
                · Demo Workspace
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] text-xs text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search...</span>
              <kbd className="ml-2 font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-white/10">
                ⌘K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setCommandSearchOpen(true)}
              aria-label="Search workspace"
              className="sm:hidden p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => openQuickAdd('task')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quick Add</span>
            </button>

            <PWAInstallButton />

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
                className="relative p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#8B7CFF] text-white text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] shadow-xl p-3 z-40">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-4 text-center">
                        You are all caught up.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => markNotificationRead(n.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            n.read
                              ? 'border-transparent opacity-70'
                              : 'border-[#8B7CFF]/30 bg-[#8B7CFF]/5'
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900 dark:text-[#F8FAFC]">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5">
                            {n.message}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {profile.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-xl bg-slate-200/70 dark:bg-[#171D29]"
                />
              ))}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
