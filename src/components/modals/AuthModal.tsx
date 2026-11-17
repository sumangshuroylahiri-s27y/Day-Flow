import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { loginWithEmail, registerWithEmail, resetUserPassword } from '../../lib/firebase';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'reset';
}

export function AuthModal({ open, onClose, initialMode = 'login' }: AuthModalProps) {
  const { loginWithGoogle, enterDemoMode, pushToast } = useDayflow();
  const [tab, setTab] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  if (!open) return null;

  const handleGoogle = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'reset') {
        await resetUserPassword(email.trim());
        setInfoMsg('Password reset link sent if an account exists for this email.');
      } else if (tab === 'register') {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        await registerWithEmail(email.trim(), password, displayName);
        setInfoMsg('Account created. Please check your inbox and verify your email before signing in.');
      } else {
        const cred = await loginWithEmail(email.trim(), password);
        if (!cred.user.emailVerified) {
          setInfoMsg('Please verify your email address from the verification link sent to your inbox.');
        } else {
          pushToast({ title: 'Welcome back to DAYFLOW', variant: 'success' });
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in the Firebase Console. Use "Continue with Google" or enable Email/Password under Firebase Console > Authentication > Sign-in method.'
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-[#F8FAFC]">
              {tab === 'login' ? 'Sign in to DAYFLOW' : tab === 'register' ? 'Create your workspace' : 'Reset password'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] mt-0.5">
              Your tasks, finances, and notes stay isolated to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69F5] text-white font-medium text-sm transition-colors disabled:opacity-60 cursor-pointer"
        >
          <span>Continue with Google</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-[#121620] px-3 text-slate-500 dark:text-[#94A3B8]">
              or use email
            </span>
          </div>
        </div>

        <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#171D29] mb-4">
          {(['login', 'register', 'reset'] as const).map((modeKey) => (
            <button
              key={modeKey}
              type="button"
              onClick={() => {
                setTab(modeKey);
                setErrorMsg('');
                setInfoMsg('');
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                tab === modeKey
                  ? 'bg-white dark:bg-[#0B0D12] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {modeKey === 'login' ? 'Sign In' : modeKey === 'register' ? 'Register' : 'Reset'}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#94A3B8] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29] text-slate-900 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              {errorMsg}
            </p>
          )}
          {infoMsg && (
            <div className="flex items-start gap-2 text-xs text-emerald-600 dark:text-[#34D399] bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-900 dark:bg-[#171D29] text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-[#1E2636] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading
              ? 'Please wait...'
              : tab === 'login'
              ? 'Sign In with Email'
              : tab === 'register'
              ? 'Create Account'
              : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8]">
          <span>Want to try before signing in?</span>
          <button
            type="button"
            onClick={() => {
              enterDemoMode();
              onClose();
            }}
            className="text-[#8B7CFF] hover:underline font-medium cursor-pointer"
          >
            Explore Interactive Demo
          </button>
        </div>
      </div>
    </div>
  );
}
