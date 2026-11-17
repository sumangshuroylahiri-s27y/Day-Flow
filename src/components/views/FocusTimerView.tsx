import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { getTodayISO } from '../../lib/formatters';
import { FocusMode } from '../../types/dayflow';

function playCompletionChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // AudioContext blocked or unsupported
  }
}

export function FocusTimerView() {
  const { tasks, focusSessions, logFocusSession, pushToast } = useDayflow();
  const today = getTodayISO();

  const [durations, setDurations] = useState({
    focus: 25,
    short_break: 5,
    long_break: 15,
  });
  const [mode, setMode] = useState<FocusMode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [linkedTaskId, setLinkedTaskId] = useState('');

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== 'done'), [tasks]);

  const switchMode = (nextMode: FocusMode) => {
    setRunning(false);
    setMode(nextMode);
    setSecondsLeft(durations[nextMode] * 60);
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (soundEnabled) playCompletionChime();
          const linked = tasks.find((t) => t.id === linkedTaskId);
          logFocusSession({
            mode,
            durationMinutes: durations[mode],
            taskId: linked?.id || '',
            taskTitle: linked?.title || '',
            completedAt: new Date().toISOString(),
          });
          pushToast({
            title: `${durations[mode]}-minute ${mode.replace('_', ' ')} completed!`,
            variant: 'success',
          });
          return durations[mode] * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, soundEnabled, mode, durations, linkedTaskId, tasks, logFocusSession, pushToast]);

  const todayStats = useMemo(() => {
    const todayFocus = focusSessions.filter((s) => s.mode === 'focus' && s.completedAt.startsWith(today));
    const minutes = todayFocus.reduce((a, b) => a + b.durationMinutes, 0);
    return { count: todayFocus.length, minutes };
  }, [focusSessions, today]);

  const totalDurationSec = durations[mode] * 60;
  const progressPct = Math.round(((totalDurationSec - secondsLeft) / totalDurationSec) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Main Timer Card */}
      <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-6 sm:p-8 flex flex-col items-center justify-between">
        <div className="flex flex-wrap items-center justify-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#121620]">
          {(
            [
              ['focus', 'Focus'],
              ['short_break', 'Short Break'],
              ['long_break', 'Long Break'],
            ] as const
          ).map(([mId, label]) => (
            <button
              key={mId}
              type="button"
              onClick={() => switchMode(mId)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                mode === mId
                  ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-[#94A3B8]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="my-10 text-center">
          <p className="font-mono-tabular text-6xl sm:text-7xl font-bold tracking-tight">
            {mm}:{ss}
          </p>
          <div className="w-64 h-1.5 rounded-full bg-slate-100 dark:bg-[#121620] mx-auto mt-5 overflow-hidden">
            <div
              className="h-full bg-[#8B7CFF] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
              Associate Task (optional)
            </label>
            <select
              value={linkedTaskId}
              onChange={(e) => setLinkedTaskId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            >
              <option value="">No specific task</option>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRunning((r) => !r)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium cursor-pointer"
            >
              {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{running ? 'Pause' : secondsLeft < totalDurationSec ? 'Resume' : 'Start'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(durations[mode] * 60);
              }}
              aria-label="Reset timer"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Settings, Stats & History */}
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-3">Daily Focus Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620]">
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Focus Sprints Today</p>
              <p className="font-mono-tabular text-2xl font-bold text-[#8B7CFF] mt-1">
                {todayStats.count}
              </p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#121620]">
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">Focus Minutes Today</p>
              <p className="font-mono-tabular text-2xl font-bold text-[#34D399] mt-1">
                {todayStats.minutes}m
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-3">Custom Durations (min)</h3>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['focus', 'Focus'],
                ['short_break', 'Short Break'],
                ['long_break', 'Long Break'],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <label className="block text-[11px] text-slate-500 dark:text-[#94A3B8] mb-1">
                  {label}
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durations[k]}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(180, Number(e.target.value) || 1));
                    setDurations((prev) => ({ ...prev, [k]: val }));
                    if (mode === k && !running) setSecondsLeft(val * 60);
                  }}
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <h3 className="font-display font-semibold text-base mb-3">Session History</h3>
          {focusSessions.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-6 text-center">
              Complete a focus sprint to record your session history.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {focusSessions.slice(0, 15).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-[#121620] text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium capitalize">
                      {s.mode.replace('_', ' ')} · {s.durationMinutes}m
                    </p>
                    {s.taskTitle && (
                      <p className="text-slate-500 dark:text-[#94A3B8] truncate">{s.taskTitle}</p>
                    )}
                  </div>
                  <span className="font-mono-tabular text-slate-400 shrink-0">
                    {s.completedAt.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
