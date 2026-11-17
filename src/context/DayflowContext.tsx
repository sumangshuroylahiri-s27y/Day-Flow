import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
  testConnection,
} from '../lib/firebase';
import { buildDemoWorkspace } from '../lib/demoData';
import { getTodayISO } from '../lib/formatters';
import { useTaskReminders } from '../hooks/useTaskReminders';
import {
  AiConversation,
  Budget,
  CalendarEvent,
  DEFAULT_WIDGET_ORDER,
  FocusSession,
  generateSafeId,
  Goal,
  Habit,
  HabitRecord,
  NavSectionId,
  Note,
  NotificationItem,
  SavingsGoal,
  Task,
  ThemeMode,
  ToastMessage,
  Transaction,
  UserProfile,
  VALIDATION_LIMITS,
} from '../types/dayflow';

type AppMode = 'landing' | 'demo' | 'auth';

interface DayflowContextValue {
  mode: AppMode;
  authReady: boolean;
  authUser: User | null;
  activeNav: NavSectionId;
  setActiveNav: (nav: NavSectionId) => void;
  enterDemoMode: () => void;
  exitToLanding: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  loadingData: boolean;

  profile: UserProfile;
  updateProfileSettings: (patch: Partial<UserProfile>) => Promise<void>;
  toggleTheme: () => void;

  tasks: Task[];
  addTask: (input: Omit<Task, 'id' | 'userId'>) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  events: CalendarEvent[];
  addEvent: (input: Omit<CalendarEvent, 'id' | 'userId'>) => Promise<CalendarEvent>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;

  transactions: Transaction[];
  addTransaction: (input: Omit<Transaction, 'id' | 'userId'>) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  budgets: Budget[];
  upsertBudget: (category: string, month: string, limit: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  savingsGoals: SavingsGoal[];
  addSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'userId'>) => Promise<void>;
  updateSavingsGoal: (id: string, patch: Partial<SavingsGoal>) => Promise<void>;
  deleteSavingsGoal: (id: string) => Promise<void>;

  notes: Note[];
  addNote: (input: Omit<Note, 'id' | 'userId'>) => Promise<Note>;
  updateNote: (id: string, patch: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;

  habits: Habit[];
  addHabit: (input: Omit<Habit, 'id' | 'userId'>) => Promise<Habit>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  habitRecords: HabitRecord[];
  toggleHabitDate: (habitId: string, date: string) => Promise<void>;

  focusSessions: FocusSession[];
  logFocusSession: (input: Omit<FocusSession, 'id' | 'userId'>) => Promise<void>;

  goals: Goal[];
  addGoal: (input: Omit<Goal, 'id' | 'userId'>) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  notifications: NotificationItem[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  aiConversations: AiConversation[];
  saveAiConversation: (conv: AiConversation) => Promise<void>;
  deleteAiConversation: (id: string) => Promise<void>;

  seedStarterWorkspace: () => Promise<void>;
  deleteUserAccountData: () => Promise<void>;

  commandSearchOpen: boolean;
  setCommandSearchOpen: (open: boolean) => void;
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
  quickAddDefaultTab: 'task' | 'event' | 'note' | 'transaction' | 'habit' | 'goal';
  openQuickAdd: (tab?: 'task' | 'event' | 'note' | 'transaction' | 'habit' | 'goal') => void;

  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
}

const DayflowContext = createContext<DayflowContextValue | null>(null);

function cleanUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

export function DayflowProvider({ children }: { children: React.ReactNode }) {
  const initialDemo = useMemo(() => buildDemoWorkspace('demo_user'), []);
  const [mode, setMode] = useState<AppMode>('landing');
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [activeNav, setActiveNav] = useState<NavSectionId>('dashboard');

  const [profile, setProfile] = useState<UserProfile>(initialDemo.profile);
  const [tasks, setTasks] = useState<Task[]>(initialDemo.tasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialDemo.events);
  const [transactions, setTransactions] = useState<Transaction[]>(initialDemo.transactions);
  const [budgets, setBudgets] = useState<Budget[]>(initialDemo.budgets);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(initialDemo.savingsGoals);
  const [notes, setNotes] = useState<Note[]>(initialDemo.notes);
  const [habits, setHabits] = useState<Habit[]>(initialDemo.habits);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>(initialDemo.habitRecords);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(initialDemo.focusSessions);
  const [goals, setGoals] = useState<Goal[]>(initialDemo.goals);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialDemo.notifications);
  const [aiConversations, setAiConversations] = useState<AiConversation[]>([]);

  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDefaultTab, setQuickAddDefaultTab] = useState<
    'task' | 'event' | 'note' | 'transaction' | 'habit' | 'goal'
  >('task');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateSafeId('toast');
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openQuickAdd = useCallback(
    (tab: 'task' | 'event' | 'note' | 'transaction' | 'habit' | 'goal' = 'task') => {
      setQuickAddDefaultTab(tab);
      setQuickAddOpen(true);
    },
    []
  );

  // Sync theme to <html class="dark">
  useEffect(() => {
    const root = document.documentElement;
    if (profile.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [profile.theme]);

  // Active Task & Habit Reminders engine
  useTaskReminders({
    tasks,
    notificationsEnabled: profile.notificationsEnabled,
    pushToast,
  });

  // Comprehensive Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode === 'landing') return;

      const target = e.target as HTMLElement | null;
      const isInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

      // Cmd+K or Ctrl+K: Toggle global search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandSearchOpen((v) => !v);
        return;
      }

      // Cmd+N or Ctrl+N: Trigger Quick Add
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openQuickAdd('task');
        return;
      }

      // Single-key shortcuts when not typing in input/textarea/select
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === '1') {
          e.preventDefault();
          setActiveNav('dashboard');
        } else if (key === '2' || key === 't') {
          e.preventDefault();
          setActiveNav('tasks');
        } else if (key === '3' || key === 'c') {
          e.preventDefault();
          setActiveNav('calendar');
        } else if (key === '4' || key === 'n') {
          e.preventDefault();
          setActiveNav('notes');
        } else if (key === '5' || key === 'h') {
          e.preventDefault();
          setActiveNav('habits');
        } else if (key === '6' || key === 'f') {
          e.preventDefault();
          setActiveNav('focus');
        } else if (key === '7' || key === 'p') {
          e.preventDefault();
          setActiveNav('finance');
        } else if (key === '8' || key === 'a') {
          e.preventDefault();
          setActiveNav('ai-assistant');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, openQuickAdd, setActiveNav, setCommandSearchOpen]);

  // Test Firestore connection once on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      setAuthReady(true);

      if (user && user.emailVerified) {
        setMode('auth');
        setLoadingData(true);
        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: (user.displayName || user.email?.split('@')[0] || 'DAYFLOW User').slice(
                0,
                VALIDATION_LIMITS.DISPLAY_NAME_MAX
              ),
              email: user.email || 'user@dayflow.app',
              photoURL: user.photoURL || '/src/assets/images/avatar_default_profile_1794907513338.jpg',
              roleTitle: 'Workspace Owner',
              theme: 'dark',
              currency: 'INR',
              dateFormat: 'DD/MM/YYYY',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
              language: 'English',
              weatherCity: 'Bengaluru',
              notificationsEnabled: true,
              widgetOrder: DEFAULT_WIDGET_ORDER,
              hiddenWidgets: [],
            };
            await setDoc(userRef, {
              ...cleanUndefined(newProfile as unknown as Record<string, unknown>),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('Profile initialization warning:', err);
        } finally {
          setLoadingData(false);
        }
      } else if (!user) {
        setMode((prev) => (prev === 'auth' ? 'landing' : prev));
      }
    });
    return () => unsub();
  }, []);

  // Attach real-time Firestore listeners only when authenticated & verified
  useEffect(() => {
    if (mode !== 'auth' || !authUser || !authUser.emailVerified) return;
    const uid = authUser.uid;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setProfile({
              ...data,
              widgetOrder: data.widgetOrder?.length ? data.widgetOrder : DEFAULT_WIDGET_ORDER,
              hiddenWidgets: data.hiddenWidgets || [],
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    const bindCollection = <T,>(
      subName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const path = `users/${uid}/${subName}`;
      unsubs.push(
        onSnapshot(
          collection(db, path),
          (snap) => {
            setter(snap.docs.map((d) => d.data() as T));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, path)
        )
      );
    };

    bindCollection<Task>('tasks', setTasks);
    bindCollection<CalendarEvent>('events', setEvents);
    bindCollection<Transaction>('transactions', setTransactions);
    bindCollection<Budget>('budgets', setBudgets);
    bindCollection<SavingsGoal>('savingsGoals', setSavingsGoals);
    bindCollection<Note>('notes', setNotes);
    bindCollection<Habit>('habits', setHabits);
    bindCollection<HabitRecord>('habitRecords', setHabitRecords);
    bindCollection<FocusSession>('focusSessions', setFocusSessions);
    bindCollection<Goal>('goals', setGoals);
    bindCollection<NotificationItem>('notifications', setNotifications);
    bindCollection<AiConversation>('aiConversations', setAiConversations);

    return () => unsubs.forEach((u) => u());
  }, [mode, authUser]);

  const enterDemoMode = useCallback(() => {
    const fresh = buildDemoWorkspace('demo_user');
    setProfile(fresh.profile);
    setTasks(fresh.tasks);
    setEvents(fresh.events);
    setTransactions(fresh.transactions);
    setBudgets(fresh.budgets);
    setSavingsGoals(fresh.savingsGoals);
    setNotes(fresh.notes);
    setHabits(fresh.habits);
    setHabitRecords(fresh.habitRecords);
    setFocusSessions(fresh.focusSessions);
    setGoals(fresh.goals);
    setNotifications(fresh.notifications);
    setAiConversations([]);
    setActiveNav('dashboard');
    setMode('demo');
  }, []);

  const exitToLanding = useCallback(() => {
    setMode('landing');
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithGoogle();
      setActiveNav('dashboard');
      pushToast({ title: 'Signed in to DAYFLOW', variant: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to complete sign-in.';
      pushToast({ title: 'Authentication failed', description: message, variant: 'error' });
      throw err;
    }
  }, [pushToast]);

  const logout = useCallback(async () => {
    if (mode === 'auth') {
      await signOutUser();
    }
    setMode('landing');
    pushToast({ title: 'Signed out', variant: 'info' });
  }, [mode, pushToast]);

  const isAuthLive = mode === 'auth' && Boolean(authUser?.emailVerified);
  const currentUid = isAuthLive && authUser ? authUser.uid : 'demo_user';

  const updateProfileSettings = useCallback(
    async (patch: Partial<UserProfile>) => {
      const merged: UserProfile = {
        ...profile,
        ...patch,
        displayName: (patch.displayName ?? profile.displayName).slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      };
      setProfile(merged);
      if (isAuthLive && authUser) {
        const path = `users/${authUser.uid}`;
        try {
          const updatePayload = cleanUndefined({
            displayName: merged.displayName,
            email: merged.email,
            photoURL: merged.photoURL,
            roleTitle: merged.roleTitle,
            theme: merged.theme,
            currency: merged.currency,
            dateFormat: merged.dateFormat,
            timezone: merged.timezone,
            language: merged.language,
            weatherCity: merged.weatherCity,
            notificationsEnabled: merged.notificationsEnabled,
            widgetOrder: merged.widgetOrder,
            hiddenWidgets: merged.hiddenWidgets,
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, path), updatePayload);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      }
    },
    [profile, isAuthLive, authUser]
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = profile.theme === 'dark' ? 'light' : 'dark';
    updateProfileSettings({ theme: next });
  }, [profile.theme, updateProfileSettings]);

  // TASKS CRUD
  const addTask = useCallback(
    async (input: Omit<Task, 'id' | 'userId'>): Promise<Task> => {
      const id = generateSafeId('task');
      const task: Task = {
        id,
        userId: currentUid,
        title: input.title.trim().slice(0, VALIDATION_LIMITS.TASK_TITLE_MAX),
        description: (input.description || '').slice(0, VALIDATION_LIMITS.TASK_DESC_MAX),
        status: input.status || 'todo',
        priority: input.priority || 'medium',
        category: (input.category || 'General').slice(0, VALIDATION_LIMITS.CATEGORY_MAX),
        tags: (input.tags || []).slice(0, VALIDATION_LIMITS.MAX_TAGS),
        dueDate: input.dueDate || '',
        dueTime: input.dueTime || '',
        recurrence: input.recurrence || 'none',
        reminderAt: input.reminderAt || '',
        subtasks: (input.subtasks || []).slice(0, VALIDATION_LIMITS.MAX_SUBTASKS),
        order: input.order ?? tasks.length + 1,
        completedAt: input.completedAt || '',
      };

      if (isAuthLive) {
        const path = `users/${currentUid}/tasks/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...task,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setTasks((prev) => [{ ...task, createdAt: new Date().toISOString() }, ...prev]);
      }
      return task;
    },
    [currentUid, isAuthLive, tasks.length]
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/tasks/${id}`;
        try {
          const cleanPatch = cleanUndefined({
            ...patch,
            updatedAt: serverTimestamp(),
          });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t))
        );
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/tasks/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // EVENTS CRUD
  const addEvent = useCallback(
    async (input: Omit<CalendarEvent, 'id' | 'userId'>): Promise<CalendarEvent> => {
      const id = generateSafeId('evt');
      const evt: CalendarEvent = {
        id,
        userId: currentUid,
        title: input.title.trim().slice(0, VALIDATION_LIMITS.EVENT_TITLE_MAX),
        description: (input.description || '').slice(0, VALIDATION_LIMITS.EVENT_DESC_MAX),
        startDate: input.startDate || getTodayISO(),
        startTime: input.startTime || '09:00',
        durationMinutes: Math.max(5, Math.min(1440, input.durationMinutes || 30)),
        category: input.category || 'work',
        recurrence: input.recurrence || 'none',
        reminderMinutes: input.reminderMinutes ?? 15,
        location: (input.location || '').slice(0, 200),
      };

      if (isAuthLive) {
        const path = `users/${currentUid}/events/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...evt,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setEvents((prev) => [...prev, { ...evt, createdAt: new Date().toISOString() }]);
      }
      return evt;
    },
    [currentUid, isAuthLive]
  );

  const updateEvent = useCallback(
    async (id: string, patch: Partial<CalendarEvent>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/events/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/events/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // TRANSACTIONS CRUD
  const addTransaction = useCallback(
    async (input: Omit<Transaction, 'id' | 'userId'>): Promise<Transaction> => {
      const id = generateSafeId('tx');
      const tx: Transaction = {
        id,
        userId: currentUid,
        type: input.type,
        amount: Math.max(0.01, Math.min(VALIDATION_LIMITS.MAX_AMOUNT, Number(input.amount))),
        category: input.category.trim().slice(0, VALIDATION_LIMITS.CATEGORY_MAX) || 'General',
        description: (input.description || '').slice(0, VALIDATION_LIMITS.TX_DESC_MAX),
        paymentMethod: (input.paymentMethod || 'UPI').slice(0, 60),
        date: input.date || getTodayISO(),
      };

      if (isAuthLive) {
        const path = `users/${currentUid}/transactions/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...tx,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setTransactions((prev) => [{ ...tx, createdAt: new Date().toISOString() }, ...prev]);
      }
      return tx;
    },
    [currentUid, isAuthLive]
  );

  const updateTransaction = useCallback(
    async (id: string, patch: Partial<Transaction>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/transactions/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/transactions/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setTransactions((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // BUDGETS
  const upsertBudget = useCallback(
    async (category: string, month: string, limit: number) => {
      const existing = budgets.find((b) => b.category === category && b.month === month);
      const id = existing ? existing.id : generateSafeId('bdg');
      const budget: Budget = {
        id,
        userId: currentUid,
        category: category.slice(0, 60),
        month: month.slice(0, 10),
        limit: Math.max(1, Number(limit)),
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/budgets/${id}`;
        try {
          if (existing) {
            await updateDoc(doc(db, path), { limit: budget.limit, updatedAt: serverTimestamp() });
          } else {
            await setDoc(doc(db, path), {
              ...budget,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, existing ? OperationType.UPDATE : OperationType.CREATE, path);
        }
      } else {
        setBudgets((prev) =>
          existing ? prev.map((b) => (b.id === id ? budget : b)) : [...prev, budget]
        );
      }
    },
    [budgets, currentUid, isAuthLive]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/budgets/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setBudgets((prev) => prev.filter((b) => b.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // SAVINGS GOALS
  const addSavingsGoal = useCallback(
    async (input: Omit<SavingsGoal, 'id' | 'userId'>) => {
      const id = generateSafeId('sav');
      const goal: SavingsGoal = {
        id,
        userId: currentUid,
        title: input.title.trim().slice(0, 120),
        targetAmount: Math.max(1, Number(input.targetAmount)),
        currentAmount: Math.max(0, Number(input.currentAmount || 0)),
        targetDate: input.targetDate || '',
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/savingsGoals/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...goal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setSavingsGoals((prev) => [...prev, goal]);
      }
    },
    [currentUid, isAuthLive]
  );

  const updateSavingsGoal = useCallback(
    async (id: string, patch: Partial<SavingsGoal>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/savingsGoals/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setSavingsGoals((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteSavingsGoal = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/savingsGoals/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setSavingsGoals((prev) => prev.filter((s) => s.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // NOTES CRUD
  const addNote = useCallback(
    async (input: Omit<Note, 'id' | 'userId'>): Promise<Note> => {
      const id = generateSafeId('note');
      const note: Note = {
        id,
        userId: currentUid,
        title: (input.title || 'Untitled Note').slice(0, VALIDATION_LIMITS.NOTE_TITLE_MAX),
        content: (input.content || '').slice(0, VALIDATION_LIMITS.NOTE_CONTENT_MAX),
        folder: (input.folder || 'General').slice(0, 80),
        tags: (input.tags || []).slice(0, 15),
        pinned: Boolean(input.pinned),
        favorite: Boolean(input.favorite),
        archived: Boolean(input.archived),
        attachments: (input.attachments || []).slice(0, 10),
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/notes/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...note,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setNotes((prev) => [{ ...note, updatedAt: new Date().toISOString() }, ...prev]);
      }
      return note;
    },
    [currentUid, isAuthLive]
  );

  const updateNote = useCallback(
    async (id: string, patch: Partial<Note>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/notes/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n))
        );
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/notes/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // HABITS CRUD
  const addHabit = useCallback(
    async (input: Omit<Habit, 'id' | 'userId'>): Promise<Habit> => {
      const id = generateSafeId('hab');
      const habit: Habit = {
        id,
        userId: currentUid,
        name: input.name.trim().slice(0, VALIDATION_LIMITS.HABIT_NAME_MAX),
        category: (input.category || 'Health').slice(0, 60),
        frequency: input.frequency || 'daily',
        targetPerWeek: Math.max(1, Math.min(7, input.targetPerWeek || 7)),
        color: input.color || '#8B7CFF',
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/habits/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...habit,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setHabits((prev) => [...prev, habit]);
      }
      return habit;
    },
    [currentUid, isAuthLive]
  );

  const updateHabit = useCallback(
    async (id: string, patch: Partial<Habit>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/habits/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteHabit = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/habits/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        setHabitRecords((prev) => prev.filter((r) => r.habitId !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  const toggleHabitDate = useCallback(
    async (habitId: string, date: string) => {
      const existing = habitRecords.find((r) => r.habitId === habitId && r.date === date);
      const id = existing ? existing.id : `${habitId}_${date}`;
      const nextCompleted = existing ? !existing.completed : true;
      if (isAuthLive) {
        const path = `users/${currentUid}/habitRecords/${id}`;
        try {
          if (existing) {
            await updateDoc(doc(db, path), {
              completed: nextCompleted,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, path), {
              id,
              userId: currentUid,
              habitId,
              date,
              completed: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, existing ? OperationType.UPDATE : OperationType.CREATE, path);
        }
      } else {
        if (existing) {
          setHabitRecords((prev) =>
            prev.map((r) => (r.id === existing.id ? { ...r, completed: nextCompleted } : r))
          );
        } else {
          setHabitRecords((prev) => [
            ...prev,
            { id, userId: currentUid, habitId, date, completed: true },
          ]);
        }
      }
    },
    [currentUid, habitRecords, isAuthLive]
  );

  // FOCUS SESSIONS
  const logFocusSession = useCallback(
    async (input: Omit<FocusSession, 'id' | 'userId'>) => {
      const id = generateSafeId('foc');
      const session: FocusSession = {
        id,
        userId: currentUid,
        mode: input.mode,
        durationMinutes: Math.max(1, Math.min(180, input.durationMinutes)),
        taskId: input.taskId || '',
        taskTitle: (input.taskTitle || '').slice(0, 240),
        completedAt: input.completedAt || new Date().toISOString(),
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/focusSessions/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...session,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setFocusSessions((prev) => [session, ...prev]);
      }
    },
    [currentUid, isAuthLive]
  );

  // GOALS
  const addGoal = useCallback(
    async (input: Omit<Goal, 'id' | 'userId'>): Promise<Goal> => {
      const id = generateSafeId('goal');
      const goal: Goal = {
        id,
        userId: currentUid,
        title: input.title.trim().slice(0, VALIDATION_LIMITS.GOAL_TITLE_MAX),
        description: (input.description || '').slice(0, VALIDATION_LIMITS.GOAL_DESC_MAX),
        horizon: input.horizon || 'monthly',
        targetDate: input.targetDate || '',
        progress: Math.max(0, Math.min(100, input.progress ?? 0)),
        status: input.status || 'active',
        milestones: (input.milestones || []).slice(0, VALIDATION_LIMITS.MAX_MILESTONES),
      };
      if (isAuthLive) {
        const path = `users/${currentUid}/goals/${id}`;
        try {
          await setDoc(doc(db, path), {
            ...goal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }
      } else {
        setGoals((prev) => [goal, ...prev]);
      }
      return goal;
    },
    [currentUid, isAuthLive]
  );

  const updateGoal = useCallback(
    async (id: string, patch: Partial<Goal>) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/goals/${id}`;
        try {
          const cleanPatch = cleanUndefined({ ...patch, updatedAt: serverTimestamp() });
          delete (cleanPatch as Record<string, unknown>).id;
          delete (cleanPatch as Record<string, unknown>).userId;
          delete (cleanPatch as Record<string, unknown>).createdAt;
          await updateDoc(doc(db, path), cleanPatch);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
      }
    },
    [currentUid, isAuthLive]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/goals/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setGoals((prev) => prev.filter((g) => g.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // NOTIFICATIONS
  const markNotificationRead = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/notifications/${id}`;
        try {
          await updateDoc(doc(db, path), { read: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
      } else {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
    },
    [currentUid, isAuthLive]
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (isAuthLive) {
      const batch = writeBatch(db);
      notifications
        .filter((n) => !n.read)
        .forEach((n) => {
          batch.update(doc(db, `users/${currentUid}/notifications/${n.id}`), { read: true });
        });
      await batch.commit();
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }, [currentUid, isAuthLive, notifications]);

  // AI CONVERSATIONS
  const saveAiConversation = useCallback(
    async (conv: AiConversation) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/aiConversations/${conv.id}`;
        const exists = aiConversations.some((c) => c.id === conv.id);
        try {
          if (exists) {
            await updateDoc(doc(db, path), {
              title: conv.title.slice(0, 180),
              messages: conv.messages.slice(-100),
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(doc(db, path), {
              id: conv.id,
              userId: currentUid,
              title: conv.title.slice(0, 180),
              messages: conv.messages.slice(-100),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, exists ? OperationType.UPDATE : OperationType.CREATE, path);
        }
      } else {
        setAiConversations((prev) => {
          const exists = prev.some((c) => c.id === conv.id);
          return exists ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev];
        });
      }
    },
    [aiConversations, currentUid, isAuthLive]
  );

  const deleteAiConversation = useCallback(
    async (id: string) => {
      if (isAuthLive) {
        const path = `users/${currentUid}/aiConversations/${id}`;
        try {
          await deleteDoc(doc(db, path));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, path);
        }
      } else {
        setAiConversations((prev) => prev.filter((c) => c.id !== id));
      }
    },
    [currentUid, isAuthLive]
  );

  // Seed starter workspace records for authenticated users who want sample data
  const seedStarterWorkspace = useCallback(async () => {
    if (!isAuthLive) return;
    const sample = buildDemoWorkspace(currentUid);
    const batch = writeBatch(db);
    sample.tasks.forEach((t) =>
      batch.set(doc(db, `users/${currentUid}/tasks/${t.id}`), {
        ...t,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.events.forEach((e) =>
      batch.set(doc(db, `users/${currentUid}/events/${e.id}`), {
        ...e,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.transactions.forEach((tx) =>
      batch.set(doc(db, `users/${currentUid}/transactions/${tx.id}`), {
        ...tx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.budgets.forEach((b) =>
      batch.set(doc(db, `users/${currentUid}/budgets/${b.id}`), {
        ...b,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.savingsGoals.forEach((s) =>
      batch.set(doc(db, `users/${currentUid}/savingsGoals/${s.id}`), {
        ...s,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.notes.forEach((n) =>
      batch.set(doc(db, `users/${currentUid}/notes/${n.id}`), {
        ...n,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.habits.forEach((h) =>
      batch.set(doc(db, `users/${currentUid}/habits/${h.id}`), {
        ...h,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.habitRecords.forEach((hr) =>
      batch.set(doc(db, `users/${currentUid}/habitRecords/${hr.id}`), {
        ...hr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    sample.goals.forEach((g) =>
      batch.set(doc(db, `users/${currentUid}/goals/${g.id}`), {
        ...g,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    await batch.commit();
    pushToast({ title: 'Starter sample workspace loaded', variant: 'success' });
  }, [currentUid, isAuthLive, pushToast]);

  const deleteUserAccountData = useCallback(async () => {
    if (!isAuthLive || !authUser) {
      enterDemoMode();
      setMode('landing');
      return;
    }
    const uid = authUser.uid;
    const subcollections = [
      'tasks',
      'events',
      'transactions',
      'budgets',
      'savingsGoals',
      'notes',
      'habitRecords',
      'habits',
      'focusSessions',
      'goals',
      'notifications',
      'aiConversations',
    ];
    const batch = writeBatch(db);
    for (const sub of subcollections) {
      const snap = await getDocs(collection(db, `users/${uid}/${sub}`));
      snap.docs.forEach((d) => batch.delete(d.ref));
    }
    batch.delete(doc(db, `users/${uid}`));
    await batch.commit();
    await signOutUser();
    setMode('landing');
    pushToast({ title: 'Workspace data deleted', variant: 'info' });
  }, [authUser, enterDemoMode, isAuthLive, pushToast]);

  const value: DayflowContextValue = {
    mode,
    authReady,
    authUser,
    activeNav,
    setActiveNav,
    enterDemoMode,
    exitToLanding,
    loginWithGoogle,
    logout,
    loadingData,
    profile,
    updateProfileSettings,
    toggleTheme,
    tasks,
    addTask,
    updateTask,
    deleteTask,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    budgets,
    upsertBudget,
    deleteBudget,
    savingsGoals,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    notes,
    addNote,
    updateNote,
    deleteNote,
    habits,
    addHabit,
    updateHabit,
    deleteHabit,
    habitRecords,
    toggleHabitDate,
    focusSessions,
    logFocusSession,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    aiConversations,
    saveAiConversation,
    deleteAiConversation,
    seedStarterWorkspace,
    deleteUserAccountData,
    commandSearchOpen,
    setCommandSearchOpen,
    quickAddOpen,
    setQuickAddOpen,
    quickAddDefaultTab,
    openQuickAdd,
    toasts,
    pushToast,
    dismissToast,
  };

  return <DayflowContext.Provider value={value}>{children}</DayflowContext.Provider>;
}

export function useDayflow() {
  const ctx = useContext(DayflowContext);
  if (!ctx) {
    throw new Error('useDayflow must be used inside DayflowProvider');
  }
  return ctx;
}
