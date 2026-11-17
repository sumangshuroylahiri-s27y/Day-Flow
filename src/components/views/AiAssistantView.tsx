import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { getTodayISO } from '../../lib/formatters';
import {
  AiConversation,
  AiMessage,
  AiProposedAction,
  EventCategory,
  generateSafeId,
  NavSectionId,
  TaskPriority,
} from '../../types/dayflow';

const STARTER_PROMPTS = [
  'I have a meeting at 3 PM, two assignments and need to go to the gym. Plan my day.',
  'Add a high-priority task to complete my presentation by Friday.',
  'Summarize my notes and extract key action items.',
  'Analyse my spending patterns and productivity score.',
  'Show me all incomplete tasks due this week.',
];

export function AiAssistantView() {
  const {
    mode,
    authUser,
    profile,
    tasks,
    events,
    transactions,
    budgets,
    notes,
    habits,
    goals,
    focusSessions,
    aiConversations,
    saveAiConversation,
    deleteAiConversation,
    addTask,
    addEvent,
    addNote,
    addTransaction,
    setActiveNav,
    pushToast,
  } = useDayflow();

  const today = getTodayISO();
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    () => aiConversations[0]?.id || null
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [localDraftConv, setLocalDraftConv] = useState<AiConversation | null>(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d?.configured)))
      .catch(() => setAiConfigured(false));
  }, []);

  const currentConv = useMemo(() => {
    if (activeConvId) {
      return aiConversations.find((c) => c.id === activeConvId) || localDraftConv;
    }
    return localDraftConv;
  }, [activeConvId, aiConversations, localDraftConv]);

  const startNewChat = () => {
    setActiveConvId(null);
    setLocalDraftConv(null);
    setErrorMsg('');
  };

  const buildWorkspaceContext = () => {
    const focusMinutesToday = focusSessions
      .filter((s) => s.mode === 'focus' && s.completedAt.startsWith(today))
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    return {
      userUid: mode === 'auth' && authUser ? authUser.uid : 'demo_user',
      isDemo: mode !== 'auth',
      today,
      currency: profile.currency,
      tasks: tasks.slice(0, 40).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        dueTime: t.dueTime,
        category: t.category,
      })),
      events: events.slice(0, 30).map((e) => ({
        title: e.title,
        startDate: e.startDate,
        startTime: e.startTime,
        durationMinutes: e.durationMinutes,
        category: e.category,
      })),
      transactions: transactions.slice(0, 40).map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: tx.date,
      })),
      budgets: budgets.map((b) => ({
        category: b.category,
        month: b.month,
        limit: b.limit,
      })),
      notes: notes.slice(0, 15).map((n) => ({
        title: n.title,
        folder: n.folder,
        contentSnippet: n.content.slice(0, 500),
      })),
      habits: habits.map((h) => ({
        name: h.name,
        targetPerWeek: h.targetPerWeek,
      })),
      goals: goals.map((g) => ({
        title: g.title,
        horizon: g.horizon,
        progress: g.progress,
        status: g.status,
      })),
      focusMinutesToday,
    };
  };

  const sendMessage = async (promptText?: string) => {
    const text = (promptText ?? input).trim();
    if (!text || loading) return;

    setErrorMsg('');
    setInput('');
    setLoading(true);

    const userMsg: AiMessage = {
      id: generateSafeId('msg'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    const baseConv: AiConversation = currentConv || {
      id: generateSafeId('conv'),
      userId: mode === 'auth' && authUser ? authUser.uid : 'demo_user',
      title: text.slice(0, 60),
      messages: [],
    };

    const updatedWithUser: AiConversation = {
      ...baseConv,
      messages: [...baseConv.messages, userMsg],
    };
    setLocalDraftConv(updatedWithUser);
    setActiveConvId(updatedWithUser.id);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (mode === 'auth' && authUser) {
        const token = await authUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          history: baseConv.messages.map((m) => ({ role: m.role, content: m.content })),
          workspaceContext: buildWorkspaceContext(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data?.configured === false) setAiConfigured(false);
        setErrorMsg(data?.error || 'DAYFLOW AI request failed.');
        setLoading(false);
        return;
      }

      const assistantMsg: AiMessage = {
        id: generateSafeId('msg'),
        role: 'assistant',
        content: data.reply || 'Done.',
        createdAt: new Date().toISOString(),
        proposedActions: Array.isArray(data.proposedActions) ? data.proposedActions : [],
      };

      const finalConv: AiConversation = {
        ...updatedWithUser,
        messages: [...updatedWithUser.messages, assistantMsg],
      };
      setLocalDraftConv(finalConv);
      await saveAiConversation(finalConv);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach DAYFLOW AI server.');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (msgId: string, actionIdx: number, action: AiProposedAction) => {
    if (action.applied) return;

    if (action.type === 'create_task' && action.title) {
      const validPriority: TaskPriority = ['low', 'medium', 'high', 'urgent'].includes(
        action.priority || ''
      )
        ? (action.priority as TaskPriority)
        : 'medium';
      await addTask({
        title: action.title,
        description: action.description || '',
        status: 'todo',
        priority: validPriority,
        category: action.category || 'General',
        dueDate: action.dueDate || today,
        dueTime: action.dueTime || '',
        recurrence: 'none',
        tags: ['ai-created'],
        subtasks: [],
      });
      pushToast({ title: `Task created: ${action.title}`, variant: 'success' });
    } else if (action.type === 'create_event' && action.title) {
      const validCat: EventCategory = ['work', 'personal', 'health', 'finance', 'learning'].includes(
        action.category || ''
      )
        ? (action.category as EventCategory)
        : 'work';
      await addEvent({
        title: action.title,
        description: action.description || '',
        startDate: action.startDate || today,
        startTime: action.startTime || '14:00',
        durationMinutes: action.durationMinutes || 45,
        category: validCat,
        recurrence: 'none',
        reminderMinutes: 15,
      });
      pushToast({ title: `Event scheduled: ${action.title}`, variant: 'success' });
    } else if (action.type === 'create_note') {
      await addNote({
        title: action.title || 'AI Summary Note',
        content: action.content || action.description || '',
        folder: action.folder || 'General',
        tags: ['ai-summary'],
        pinned: false,
        favorite: false,
        archived: false,
      });
      pushToast({ title: 'Note saved', variant: 'success' });
    } else if (action.type === 'log_transaction' && action.amount && action.amount > 0) {
      await addTransaction({
        type: action.txType === 'income' ? 'income' : 'expense',
        amount: Number(action.amount),
        category: action.category || 'General',
        description: action.description || action.title || '',
        paymentMethod: action.paymentMethod || 'UPI',
        date: action.dueDate || today,
      });
      pushToast({ title: 'Transaction recorded', variant: 'success' });
    } else if (action.type === 'navigate_view' && action.view) {
      setActiveNav(action.view as NavSectionId);
    }

    if (currentConv) {
      const updatedMsgs = currentConv.messages.map((m) =>
        m.id === msgId
          ? {
              ...m,
              proposedActions: (m.proposedActions || []).map((a, i) =>
                i === actionIdx ? { ...a, applied: true } : a
              ),
            }
          : m
      );
      const nextConv = { ...currentConv, messages: updatedMsgs };
      setLocalDraftConv(nextConv);
      await saveAiConversation(nextConv);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[75vh]">
      {/* Conversation History Sidebar */}
      <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-4 flex flex-col">
        <button
          type="button"
          onClick={startNewChat}
          className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium mb-4 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Conversation
        </button>

        <p className="text-xs font-medium text-slate-400 mb-2">Saved Conversations</p>
        <div className="flex-1 overflow-y-auto space-y-1">
          {aiConversations.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-6 text-center">
              No saved chats yet.
            </p>
          ) : (
            aiConversations.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs ${
                  currentConv?.id === c.id
                    ? 'bg-[#8B7CFF]/15 text-[#7C6BFF] dark:text-[#8B7CFF]'
                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-[#94A3B8]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveConvId(c.id);
                    setLocalDraftConv(c);
                  }}
                  className="flex-1 text-left truncate cursor-pointer"
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteAiConversation(c.id);
                    if (currentConv?.id === c.id) startNewChat();
                  }}
                  aria-label="Delete conversation"
                  className="text-slate-400 hover:text-rose-500 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="lg:col-span-9 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] flex flex-col overflow-hidden">
        {aiConfigured === false && (
          <div className="m-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3 text-xs text-amber-700 dark:text-[#FBBF24]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gemini API is not configured</p>
              <p className="mt-0.5">
                Configure <code>GEMINI_API_KEY</code> in AI Studio <strong>Settings &gt; Secrets</strong> to enable DAYFLOW AI.
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!currentConv || currentConv.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10 space-y-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#8B7CFF]/15 text-[#8B7CFF] flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="font-display text-xl font-bold">DAYFLOW AI Personal Assistant</h2>
                <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
                  Grounded strictly in your workspace tasks, events, notes, habits, and manual finances.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => sendMessage(p)}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] hover:border-[#8B7CFF]/50 text-left text-xs text-slate-700 dark:text-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            currentConv.messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#8B7CFF] text-white'
                      : 'bg-slate-100 dark:bg-[#121620] text-slate-900 dark:text-[#F8FAFC] border border-slate-200 dark:border-white/[0.06]'
                  }`}
                >
                  {m.content}
                </div>

                {m.proposedActions && m.proposedActions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-2 max-w-3xl">
                    {m.proposedActions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={act.applied}
                        onClick={() => executeAction(m.id, idx, act)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                          act.applied
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-[#34D399]'
                            : 'border-[#8B7CFF]/40 bg-[#8B7CFF]/10 text-[#7C6BFF] dark:text-[#8B7CFF] hover:bg-[#8B7CFF]/20'
                        }`}
                      >
                        {act.applied ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {act.applied
                            ? `Applied: ${act.label}`
                            : act.requiresConfirmation
                            ? `Confirm & Apply: ${act.label}`
                            : act.label}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
              <Sparkles className="w-4 h-4 text-[#8B7CFF] animate-spin" />
              <span>Analyzing your workspace...</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-500">
              {errorMsg}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="p-4 border-t border-slate-200 dark:border-white/[0.08] flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask DAYFLOW AI to plan your day, create tasks, or analyze spending..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] focus:outline-none focus:ring-2 focus:ring-[#8B7CFF]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
