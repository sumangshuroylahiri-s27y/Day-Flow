import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Plus, Trash2, X } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { addDaysISO, formatDateDisplay, getTodayISO } from '../../lib/formatters';
import { CalendarEvent, EventCategory, RecurrenceType } from '../../types/dayflow';

type CalView = 'daily' | 'weekly' | 'monthly' | 'agenda';

const CATEGORY_COLORS: Record<EventCategory, string> = {
  work: 'bg-[#8B7CFF]/15 text-[#7C6BFF] dark:text-[#8B7CFF] border-[#8B7CFF]/30',
  personal: 'bg-[#60A5FA]/15 text-blue-600 dark:text-[#60A5FA] border-[#60A5FA]/30',
  health: 'bg-[#34D399]/15 text-emerald-600 dark:text-[#34D399] border-[#34D399]/30',
  finance: 'bg-[#FBBF24]/15 text-amber-600 dark:text-[#FBBF24] border-[#FBBF24]/30',
  learning: 'bg-purple-500/15 text-purple-500 border-purple-500/30',
};

export function CalendarView() {
  const { events, addEvent, updateEvent, deleteEvent, tasks, profile, pushToast } = useDayflow();
  const today = getTodayISO();

  const [view, setView] = useState<CalView>('monthly');
  const [anchorDate, setAnchorDate] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [category, setCategory] = useState<EventCategory>('work');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [location, setLocation] = useState('');

  const openCreate = (dateStr = anchorDate) => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setStartDate(dateStr);
    setStartTime('10:00');
    setDurationMinutes(45);
    setCategory('work');
    setRecurrence('none');
    setReminderMinutes(15);
    setLocation('');
    setModalOpen(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditing(ev);
    setTitle(ev.title);
    setDescription(ev.description || '');
    setStartDate(ev.startDate);
    setStartTime(ev.startTime);
    setDurationMinutes(ev.durationMinutes);
    setCategory(ev.category);
    setRecurrence(ev.recurrence || 'none');
    setReminderMinutes(ev.reminderMinutes ?? 15);
    setLocation(ev.location || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (editing) {
      await updateEvent(editing.id, {
        title: title.trim(),
        description,
        startDate,
        startTime,
        durationMinutes,
        category,
        recurrence,
        reminderMinutes,
        location,
      });
      pushToast({ title: 'Event updated', variant: 'success' });
    } else {
      await addEvent({
        title: title.trim(),
        description,
        startDate,
        startTime,
        durationMinutes,
        category,
        recurrence,
        reminderMinutes,
        location,
      });
      pushToast({ title: 'Event scheduled', variant: 'success' });
    }
    setModalOpen(false);
  };

  const shiftDate = (dir: -1 | 1) => {
    if (view === 'daily') {
      setAnchorDate(addDaysISO(anchorDate, dir));
    } else if (view === 'weekly') {
      setAnchorDate(addDaysISO(anchorDate, dir * 7));
    } else {
      const [y, m] = anchorDate.split('-').map(Number);
      const dt = new Date(y, (m || 1) - 1 + dir, 1);
      setAnchorDate(
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
      );
    }
  };

  const monthCells = useMemo(() => {
    const [y, m] = anchorDate.split('-').map(Number);
    const first = new Date(y, (m || 1) - 1, 1);
    const startDay = first.getDay();
    const totalDays = new Date(y, m || 1, 0).getDate();
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const cells: Array<{ iso: string | null; day: number | null }> = [];
    for (let i = 0; i < startDay; i++) cells.push({ iso: null, day: null });
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ iso: `${ym}-${String(d).padStart(2, '0')}`, day: d });
    }
    return cells;
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const [y, m, d] = anchorDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const sundayOffset = -dt.getDay();
    return Array.from({ length: 7 }, (_, i) => addDaysISO(anchorDate, sundayOffset + i));
  }, [anchorDate]);

  const agendaItems = useMemo(() => {
    return events
      .filter((e) => e.startDate >= today)
      .sort((a, b) => `${a.startDate} ${a.startTime}`.localeCompare(`${b.startDate} ${b.startTime}`));
  }, [events, today]);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            aria-label="Previous period"
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(today)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            aria-label="Next period"
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 font-display font-semibold text-base font-mono-tabular">
            {view === 'monthly' ? anchorDate.slice(0, 7) : formatDateDisplay(anchorDate, profile.dateFormat)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-[#121620] border border-slate-200 dark:border-white/[0.06]">
            {(['daily', 'weekly', 'monthly', 'agenda'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                  view === v
                    ? 'bg-white dark:bg-[#171D29] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-[#94A3B8]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openCreate(anchorDate)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* MONTHLY VIEW */}
      {view === 'monthly' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-4">
          <div className="grid grid-cols-7 gap-2 text-xs font-medium text-slate-400 mb-2 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthCells.map((cell, idx) => {
              if (!cell.iso) {
                return <div key={`blank_${idx}`} className="min-h-[96px] rounded-lg bg-slate-50/40 dark:bg-[#121620]/40" />;
              }
              const dayEvs = events
                .filter((e) => e.startDate === cell.iso)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const dayTasks = tasks.filter((t) => t.dueDate === cell.iso && t.status !== 'done');
              const isToday = cell.iso === today;

              return (
                <div
                  key={cell.iso}
                  className={`min-h-[96px] rounded-lg border p-2 flex flex-col ${
                    isToday
                      ? 'border-[#8B7CFF] bg-[#8B7CFF]/5'
                      : 'border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#121620]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-tabular text-xs font-semibold">{cell.day}</span>
                    <button
                      type="button"
                      onClick={() => openCreate(cell.iso!)}
                      aria-label={`Add event on ${cell.iso}`}
                      className="text-slate-400 hover:text-[#8B7CFF] cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayEvs.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => openEdit(ev)}
                        className={`w-full text-left px-1.5 py-0.5 rounded border text-[11px] truncate cursor-pointer ${CATEGORY_COLORS[ev.category]}`}
                      >
                        {ev.startTime} {ev.title}
                      </button>
                    ))}
                    {dayTasks.slice(0, 1).map((t) => (
                      <div
                        key={t.id}
                        className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/5 text-[11px] truncate text-slate-600 dark:text-[#94A3B8]"
                      >
                        Task: {t.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {view === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dayIso) => {
            const dayEvs = events
              .filter((e) => e.startDate === dayIso)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            const dayTasks = tasks.filter((t) => t.dueDate === dayIso);
            const isToday = dayIso === today;

            return (
              <div
                key={dayIso}
                className={`rounded-xl border p-3 min-h-[260px] ${
                  isToday
                    ? 'border-[#8B7CFF] bg-[#8B7CFF]/5'
                    : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29]'
                }`}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-white/[0.06]">
                  <span className="font-mono-tabular text-xs font-semibold">
                    {formatDateDisplay(dayIso, profile.dateFormat)}
                  </span>
                  <button
                    type="button"
                    onClick={() => openCreate(dayIso)}
                    className="text-xs text-[#8B7CFF] cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="space-y-2">
                  {dayEvs.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEdit(ev)}
                      className={`w-full text-left p-2 rounded-lg border text-xs cursor-pointer ${CATEGORY_COLORS[ev.category]}`}
                    >
                      <p className="font-mono-tabular font-semibold">{ev.startTime}</p>
                      <p className="truncate font-medium mt-0.5">{ev.title}</p>
                    </button>
                  ))}
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-[#121620] text-xs text-slate-600 dark:text-[#94A3B8]"
                    >
                      Task: {t.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DAILY VIEW */}
      {view === 'daily' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-base">
              Schedule for {formatDateDisplay(anchorDate, profile.dateFormat)}
            </h3>
            <button
              type="button"
              onClick={() => openCreate(anchorDate)}
              className="text-xs text-[#8B7CFF] hover:underline cursor-pointer"
            >
              + Schedule on this day
            </button>
          </div>

          {events.filter((e) => e.startDate === anchorDate).length === 0 &&
          tasks.filter((t) => t.dueDate === anchorDate).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-8 text-center">
              No events or tasks due on this date.
            </p>
          ) : (
            <div className="space-y-2.5">
              {events
                .filter((e) => e.startDate === anchorDate)
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => openEdit(ev)}
                    className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between gap-4 ${CATEGORY_COLORS[ev.category]}`}
                  >
                    <div>
                      <p className="text-sm font-semibold">{ev.title}</p>
                      <p className="text-xs opacity-80 mt-0.5">
                        {ev.startTime} · {ev.durationMinutes} min
                        {ev.location ? ` · ${ev.location}` : ''}
                      </p>
                    </div>
                    <span className="text-xs capitalize">{ev.category}</span>
                  </div>
                ))}
              {tasks
                .filter((t) => t.dueDate === anchorDate)
                .map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] flex items-center justify-between text-sm"
                  >
                    <span>Task due: {t.title}</span>
                    <span className="text-xs text-slate-400 capitalize">{t.priority}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* AGENDA VIEW */}
      {view === 'agenda' && (
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] divide-y divide-slate-100 dark:divide-white/[0.06]">
          {agendaItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-12 text-center">
              No upcoming events scheduled.
            </p>
          ) : (
            agendaItems.map((ev) => (
              <div
                key={ev.id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    className="text-sm font-semibold text-left hover:text-[#8B7CFF] cursor-pointer"
                  >
                    {ev.title}
                  </button>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
                    <span className="font-mono-tabular">
                      {formatDateDisplay(ev.startDate, profile.dateFormat)} · {ev.startTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{ev.durationMinutes} min</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{ev.category}</span>
                    {ev.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {ev.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    deleteEvent(ev.id);
                    pushToast({ title: 'Event deleted', variant: 'info' });
                  }}
                  aria-label={`Delete ${ev.title}`}
                  className="p-2 text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121620] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">
                {editing ? 'Edit Event' : 'Schedule Event'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={1440}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="work">Work</option>
                    <option value="personal">Personal</option>
                    <option value="health">Health</option>
                    <option value="finance">Finance</option>
                    <option value="learning">Learning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                    Reminder (min before)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-[#94A3B8] mb-1">
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#171D29]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                {editing ? (
                  <button
                    type="button"
                    onClick={() => {
                      deleteEvent(editing.id);
                      setModalOpen(false);
                      pushToast({ title: 'Event deleted', variant: 'info' });
                    }}
                    className="px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                  >
                    Delete Event
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium cursor-pointer"
                  >
                    Save Event
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
