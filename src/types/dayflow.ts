export type NavSectionId =
  | 'dashboard'
  | 'my-day'
  | 'activity'
  | 'tasks'
  | 'calendar'
  | 'notes'
  | 'habits'
  | 'focus'
  | 'finance'
  | 'goals'
  | 'documents'
  | 'ai-assistant'
  | 'utilities'
  | 'smart-search'
  | 'profile'
  | 'settings';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'SGD';
export type DateFormatType = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type ThemeMode = 'dark' | 'light';

export type WidgetId =
  | 'today-overview'
  | 'my-day'
  | 'productivity-score'
  | 'financial-snapshot'
  | 'habit-overview'
  | 'upcoming-events'
  | 'quick-notes'
  | 'focus-widget';

export const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'today-overview',
  'productivity-score',
  'financial-snapshot',
  'focus-widget',
  'my-day',
  'habit-overview',
  'upcoming-events',
  'quick-notes',
];

export const VALIDATION_LIMITS = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  ID_MAX: 128,
  DISPLAY_NAME_MAX: 120,
  TASK_TITLE_MAX: 240,
  TASK_DESC_MAX: 4000,
  EVENT_TITLE_MAX: 200,
  EVENT_DESC_MAX: 2000,
  NOTE_TITLE_MAX: 240,
  NOTE_CONTENT_MAX: 50000,
  HABIT_NAME_MAX: 120,
  GOAL_TITLE_MAX: 200,
  GOAL_DESC_MAX: 2000,
  TX_DESC_MAX: 300,
  CATEGORY_MAX: 60,
  MAX_TAGS: 12,
  MAX_SUBTASKS: 30,
  MAX_MILESTONES: 30,
  MAX_AMOUNT: 1000000000,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  roleTitle?: string;
  theme: ThemeMode;
  currency: CurrencyCode;
  dateFormat: DateFormatType;
  timezone: string;
  language: string;
  weatherCity: string;
  notificationsEnabled: boolean;
  widgetOrder: WidgetId[];
  hiddenWidgets: WidgetId[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category?: string;
  tags?: string[];
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  recurrence?: RecurrenceType;
  reminderAt?: string;
  subtasks?: Subtask[];
  order?: number;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type EventCategory = 'work' | 'personal' | 'health' | 'finance' | 'learning';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  category: EventCategory;
  recurrence?: RecurrenceType;
  reminderMinutes?: number;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  paymentMethod: string;
  date: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  month: string; // YYYY-MM
  limit: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  previewText?: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  folder: string;
  tags?: string[];
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  attachments?: NoteAttachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  category?: string;
  frequency: 'daily' | 'weekly';
  targetPerWeek: number;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HabitRecord {
  id: string;
  userId: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type FocusMode = 'focus' | 'short_break' | 'long_break';

export interface FocusSession {
  id: string;
  userId: string;
  mode: FocusMode;
  durationMinutes: number;
  taskId?: string;
  taskTitle?: string;
  completedAt: string;
  createdAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export type GoalHorizon = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'long_term';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  horizon: GoalHorizon;
  targetDate?: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
  milestones?: Milestone[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'task' | 'event' | 'finance' | 'habit' | 'system';
  read: boolean;
  createdAt?: string;
}

export interface AiProposedAction {
  type: 'create_task' | 'create_event' | 'create_note' | 'log_transaction' | 'navigate_view';
  label: string;
  requiresConfirmation: boolean;
  applied?: boolean;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
  category?: string;
  startDate?: string;
  startTime?: string;
  durationMinutes?: number;
  txType?: 'income' | 'expense';
  amount?: number;
  paymentMethod?: string;
  folder?: string;
  content?: string;
  view?: NavSectionId;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  proposedActions?: AiProposedAction[];
}

export interface AiConversation {
  id: string;
  userId: string;
  title: string;
  messages: AiMessage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'info' | 'warning' | 'error';
}

export function generateSafeId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'id';
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${cleanPrefix}_${ts}_${rand}`;
}
