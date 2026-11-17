import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  CheckSquare,
  Calendar,
  Wallet,
  FileText,
  Flame,
  Timer,
  Wrench,
  Sun,
  Moon,
} from 'lucide-react';
import { useDayflow } from '../context/DayflowContext';
import { AuthModal } from './modals/AuthModal';

const FAQS = [
  {
    q: 'How does DAYFLOW keep my personal and financial data private?',
    a: 'Every record is strictly isolated under your authenticated account ID and protected by per-user Firestore security rules. Financial tracking is 100% manual—DAYFLOW never requests bank credentials or initiates payments.',
  },
  {
    q: 'How does DAYFLOW AI work?',
    a: 'DAYFLOW AI connects to Google Gemini through a secure server-side endpoint. It reads only the workspace summary you authorize and proposes structured schedules, tasks, or spending analyses that require your explicit confirmation before saving.',
  },
  {
    q: 'Can I explore DAYFLOW without creating an account first?',
    a: 'Yes. Click "Explore DAYFLOW" to open the interactive demonstration workspace immediately. You can test task Kanban boards, calendar views, finance charts, PDF utilities, and the Pomodoro timer before signing in with Google.',
  },
  {
    q: 'Which currencies and document utilities are supported?',
    a: 'DAYFLOW defaults to INR (₹) and supports USD, EUR, GBP, JPY, AUD, CAD, and SGD. Built-in document tools let you merge PDFs, split PDF page ranges, render PDFs to PNG images, and convert images into PDFs directly in your browser.',
  },
];

export function LandingPage() {
  const { enterDemoMode, profile, toggleTheme } = useDayflow();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [aiImgFailed, setAiImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D12] text-slate-900 dark:text-[#F8FAFC] transition-colors">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-white/[0.06] bg-[#F8FAFC]/85 dark:bg-[#0B0D12]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            DAYFLOW
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-[#94A3B8]">
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#assistant" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              AI Assistant
            </a>
            <a href="#utilities" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Utilities
            </a>
            <a href="#security" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              Security
            </a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="top" className="max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[#8B7CFF] mb-4">
            Make every day count
          </p>
          <h1
            className="font-display font-bold tracking-tight text-slate-900 dark:text-[#F8FAFC] leading-[1.08]"
            style={{ fontSize: 'clamp(2.25rem, 4.4vw, 3.75rem)', textWrap: 'balance' }}
          >
            Your entire day. One intelligent workspace.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] leading-relaxed max-w-2xl">
            Organise your work, manage your money, build better habits and simplify everyday life. Everything you need, beautifully connected.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={enterDemoMode}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#121620] hover:bg-slate-50 dark:hover:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Explore DAYFLOW</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="inline-flex items-center gap-2 px-3.5 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-medium cursor-pointer"
            >
              {profile.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{profile.theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
            </button>
          </div>
        </div>

        {/* Hero Visual Showcase */}
        <div className="mt-14 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] overflow-hidden shadow-2xl">
          {!heroImgFailed ? (
            <img
              src="/src/assets/images/dayflow_hero_workspace_1794907512217.jpg"
              alt="DAYFLOW unified productivity workspace preview showing task timeline, analytics, and calendar"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-auto max-h-[560px] object-cover"
            />
          ) : (
            <div className="h-[420px] flex flex-col items-center justify-center bg-[#121620] text-[#F8FAFC] p-8 text-center">
              <Sparkles className="w-10 h-10 text-[#8B7CFF] mb-3" />
              <p className="font-display text-xl font-semibold">DAYFLOW Unified Workspace</p>
              <p className="text-sm text-[#94A3B8] mt-1">Tasks · Calendar · Finance · Notes · Habits · AI</p>
            </div>
          )}
        </div>
      </section>

      {/* Feature Showcase (Asymmetric Bento Grid) */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.06]">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-[#60A5FA] mb-2">Connected Modules</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
            Built to replace six disconnected apps
          </h2>
          <p className="mt-3 text-slate-600 dark:text-[#94A3B8]">
            Every schedule block, financial ledger entry, note checklist, and focus timer feeds one coherent daily rhythm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#8B7CFF]">01. Smart Task & Calendar System</span>
                <CheckSquare className="w-5 h-5 text-[#8B7CFF]" />
              </div>
              <h3 className="font-display text-xl font-semibold">
                List, Kanban drag-and-drop, and time-blocked calendars in sync
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                Manage subtasks, recurring schedules, priority tiers, and deadlines side-by-side with your daily, weekly, and monthly calendar events.
              </p>
            </div>
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-mono-tabular font-semibold text-lg">3 Views</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">List · Kanban · Calendar</p>
              </div>
              <div>
                <p className="font-mono-tabular font-semibold text-lg">4 Priorities</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Low to Urgent</p>
              </div>
              <div>
                <p className="font-mono-tabular font-semibold text-lg">Cmd+K</p>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Instant Jump & Add</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#34D399]">02. Personal Finance</span>
              <Wallet className="w-5 h-5 text-[#34D399]" />
            </div>
            <h3 className="font-display text-xl font-semibold">Manual money clarity</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Track income, expenses, monthly category budgets, and savings goals in INR (₹) or any major currency with CSV export and live charts.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#60A5FA]">03. Notes & Knowledge</span>
              <FileText className="w-5 h-5 text-[#60A5FA]" />
            </div>
            <h3 className="font-display text-xl font-semibold">Auto-saving rich notes</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Organize by folders, tags, pins, and interactive checklists with distraction-free writing mode and document attachments.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#FBBF24]">04. Habits & Streaks</span>
              <Flame className="w-5 h-5 text-[#FBBF24]" />
            </div>
            <h3 className="font-display text-xl font-semibold">90-day visual heatmaps</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Build consistency with daily and weekly targets, automatic streak counters, and transparent productivity scoring.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-7">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-[#8B7CFF]">05. Focus & Goals</span>
              <Timer className="w-5 h-5 text-[#8B7CFF]" />
            </div>
            <h3 className="font-display text-xl font-semibold">Pomodoro tied to tasks</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Link 25-minute deep work sessions directly to active tasks and track daily, weekly, and yearly goal milestones.
            </p>
          </div>
        </div>
      </section>

      {/* AI Assistant Showcase */}
      <section id="assistant" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.06]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-[#8B7CFF] mb-2">DAYFLOW AI · Powered by Gemini</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">
              Plan your day and query your life in plain language
            </h2>
            <p className="mt-4 text-slate-600 dark:text-[#94A3B8] leading-relaxed">
              Ask DAYFLOW AI to structure your afternoon around a 3 PM meeting, extract action items from a note, or explain your monthly spending patterns—with explicit confirmation before saving any changes.
            </p>
            <div className="mt-6 space-y-3 text-sm">
              {[
                '"I have a meeting at 3 PM, two assignments and the gym. Plan my day."',
                '"Add a high-priority task to submit my presentation by Friday."',
                '"Show me all incomplete tasks due this week and summarize my spending."',
              ].map((prompt) => (
                <div
                  key={prompt}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] px-4 py-3 text-slate-700 dark:text-[#F8FAFC]"
                >
                  {prompt}
                </div>
              ))}
            </div>
            <div className="mt-7">
              <button
                type="button"
                onClick={enterDemoMode}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Try Workspace & AI Demo</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] overflow-hidden">
            {!aiImgFailed ? (
              <img
                src="/src/assets/images/dayflow_ai_preview_1794907513368.jpg"
                alt="DAYFLOW AI intelligent schedule and workspace overview"
                referrerPolicy="no-referrer"
                onError={() => setAiImgFailed(true)}
                className="w-full h-full object-cover min-h-[320px]"
              />
            ) : (
              <div className="h-full min-h-[320px] flex items-center justify-center bg-[#121620] p-8">
                <Calendar className="w-12 h-12 text-[#8B7CFF]" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Everyday Utilities */}
      <section id="utilities" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-medium text-[#60A5FA] mb-2">Everyday Utility Toolkit</p>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              20+ built-in utilities ready when you need them
            </h2>
          </div>
          <Wrench className="w-6 h-6 text-[#60A5FA] hidden md:block" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: 'Financial & Math Calculators',
              items: 'Standard, Percentage, Discount, GST, EMI, Loan Interest',
            },
            {
              title: 'Text & Writing Tools',
              items: 'Word & character count, Case converter, Deduplicator, Find & Replace',
            },
            {
              title: 'Unit & Currency Converters',
              items: 'Length, Weight, Temperature, Storage, Time, Live Exchange Rates',
            },
            {
              title: 'PDF & Security Utilities',
              items: 'PDF Merge, Split, PDF-to-PNG, Image-to-PDF, QR & Password Generator',
            },
          ].map((group) => (
            <div
              key={group.title}
              className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-5"
            >
              <h3 className="font-display font-semibold text-base">{group.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                {group.items}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Security & Privacy */}
      <section id="security" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.06]">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <ShieldCheck className="w-8 h-8 text-[#34D399] mb-3" />
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Private by architecture
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8]">
              Designed from the ground up with strict per-user isolation and server-side API protection.
            </p>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Strict User Data Isolation</h3>
              <p className="mt-1 text-slate-600 dark:text-[#94A3B8]">
                Authenticated Firestore rules guarantee only your verified UID can read or modify your records.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Server-Side AI Proxy</h3>
              <p className="mt-1 text-slate-600 dark:text-[#94A3B8]">
                Gemini API keys stay exclusively on the backend and never reach browser bundles.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Manual Finance Only</h3>
              <p className="mt-1 text-slate-600 dark:text-[#94A3B8]">
                Zero bank scraping or payment initiation—your ledger remains completely under your control.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-[#F8FAFC]">Full Data Portability</h3>
              <p className="mt-1 text-slate-600 dark:text-[#94A3B8]">
                Export your transactions to CSV or download your entire workspace archive in JSON anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-20 border-t border-slate-200/80 dark:border-white/[0.06]">
        <h2 className="font-display text-3xl font-bold tracking-tight mb-8">Frequently asked questions</h2>
        <div className="divide-y divide-slate-200 dark:divide-white/10 border-y border-slate-200 dark:border-white/10">
          {FAQS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 py-1 cursor-pointer"
                >
                  <span className="font-medium text-base text-slate-900 dark:text-[#F8FAFC]">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-[#94A3B8]">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-slate-900 dark:text-[#F8FAFC]">DAYFLOW</span>
            <span aria-hidden="true">·</span>
            <span>Make every day count.</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={enterDemoMode}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Demo Workspace
            </button>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
