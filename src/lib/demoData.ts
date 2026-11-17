import {
  Budget,
  CalendarEvent,
  DEFAULT_WIDGET_ORDER,
  FocusSession,
  Goal,
  Habit,
  HabitRecord,
  Note,
  NotificationItem,
  SavingsGoal,
  Task,
  Transaction,
  UserProfile,
} from '../types/dayflow';
import { addDaysISO, getTodayISO } from './formatters';

export function buildDemoWorkspace(uid = 'demo_user') {
  const today = getTodayISO();
  const yesterday = addDaysISO(today, -1);
  const twoDaysAgo = addDaysISO(today, -2);
  const tomorrow = addDaysISO(today, 1);
  const inThreeDays = addDaysISO(today, 3);
  const monthPrefix = today.slice(0, 7);

  const profile: UserProfile = {
    uid,
    displayName: 'Alex Mercer',
    email: 'alex@dayflow.app',
    photoURL: '/src/assets/images/avatar_default_profile_1794907513338.jpg',
    roleTitle: 'Product Lead',
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

  const tasks: Task[] = [
    {
      id: 'task_demo_1',
      userId: uid,
      title: 'Finalize Q4 product roadmap brief',
      description: 'Consolidate sprint metrics, customer interview highlights, and milestone owners.',
      status: 'in_progress',
      priority: 'urgent',
      category: 'Work',
      tags: ['roadmap', 'strategy'],
      dueDate: today,
      dueTime: '11:30',
      recurrence: 'none',
      subtasks: [
        { id: 'sub_1', title: 'Review engineering capacity', completed: true },
        { id: 'sub_2', title: 'Attach retention benchmarks', completed: false },
      ],
      order: 1,
    },
    {
      id: 'task_demo_2',
      userId: uid,
      title: 'Reconcile monthly utility & SaaS subscriptions',
      description: 'Verify recurring charges and update November category budgets.',
      status: 'todo',
      priority: 'high',
      category: 'Finance',
      tags: ['budget'],
      dueDate: today,
      dueTime: '16:00',
      recurrence: 'monthly',
      subtasks: [],
      order: 2,
    },
    {
      id: 'task_demo_3',
      userId: uid,
      title: 'Submit quarterly tax advance estimate',
      description: 'Double-check invoice receipts before filing.',
      status: 'todo',
      priority: 'high',
      category: 'Finance',
      tags: ['tax'],
      dueDate: yesterday,
      dueTime: '18:00',
      recurrence: 'none',
      subtasks: [],
      order: 3,
    },
    {
      id: 'task_demo_4',
      userId: uid,
      title: 'Morning mobility & 5km run',
      status: 'done',
      priority: 'medium',
      category: 'Health',
      tags: ['fitness'],
      dueDate: today,
      dueTime: '07:00',
      recurrence: 'daily',
      completedAt: `${today}T07:45:00.000Z`,
      subtasks: [],
      order: 4,
    },
    {
      id: 'task_demo_5',
      userId: uid,
      title: 'Prepare design critique slides',
      description: 'Walk through calendar week view interactions and mobile navigation.',
      status: 'todo',
      priority: 'medium',
      category: 'Work',
      tags: ['design'],
      dueDate: tomorrow,
      dueTime: '10:00',
      recurrence: 'none',
      subtasks: [],
      order: 5,
    },
    {
      id: 'task_demo_6',
      userId: uid,
      title: 'Read 2 chapters of Designing Data-Intensive Apps',
      status: 'todo',
      priority: 'low',
      category: 'Learning',
      tags: ['reading'],
      dueDate: inThreeDays,
      recurrence: 'none',
      subtasks: [],
      order: 6,
    },
  ];

  const events: CalendarEvent[] = [
    {
      id: 'evt_demo_1',
      userId: uid,
      title: 'Product Architecture Sync',
      description: 'Review database schema and real-time sync latency.',
      startDate: today,
      startTime: '10:00',
      durationMinutes: 45,
      category: 'work',
      recurrence: 'weekly',
      reminderMinutes: 15,
      location: 'Studio Room B / Meet',
    },
    {
      id: 'evt_demo_2',
      userId: uid,
      title: 'Deep Work Block: Roadmap Writing',
      description: 'Distraction-free writing sprint.',
      startDate: today,
      startTime: '14:00',
      durationMinutes: 90,
      category: 'work',
      recurrence: 'none',
      reminderMinutes: 10,
    },
    {
      id: 'evt_demo_3',
      userId: uid,
      title: 'Strength & Conditioning Session',
      startDate: today,
      startTime: '18:30',
      durationMinutes: 60,
      category: 'health',
      recurrence: 'weekly',
      reminderMinutes: 30,
      location: 'Ironwood Athletics',
    },
    {
      id: 'evt_demo_4',
      userId: uid,
      title: 'Monthly Portfolio Review',
      startDate: tomorrow,
      startTime: '11:00',
      durationMinutes: 45,
      category: 'finance',
      recurrence: 'monthly',
      reminderMinutes: 15,
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx_demo_1',
      userId: uid,
      type: 'income',
      amount: 145000,
      category: 'Salary',
      description: 'Monthly product engineering retainer',
      paymentMethod: 'Bank Transfer',
      date: `${monthPrefix}-01`,
    },
    {
      id: 'tx_demo_2',
      userId: uid,
      type: 'income',
      amount: 24000,
      category: 'Freelance',
      description: 'Design system advisory sprint',
      paymentMethod: 'UPI',
      date: `${monthPrefix}-08`,
    },
    {
      id: 'tx_demo_3',
      userId: uid,
      type: 'expense',
      amount: 32000,
      category: 'Housing',
      description: 'Apartment rent & maintenance',
      paymentMethod: 'Bank Transfer',
      date: `${monthPrefix}-02`,
    },
    {
      id: 'tx_demo_4',
      userId: uid,
      type: 'expense',
      amount: 6450,
      category: 'Groceries',
      description: 'Weekly organic groceries & coffee beans',
      paymentMethod: 'UPI',
      date: yesterday,
    },
    {
      id: 'tx_demo_5',
      userId: uid,
      type: 'expense',
      amount: 3200,
      category: 'Software',
      description: 'Cloud hosting & productivity subscriptions',
      paymentMethod: 'Credit Card',
      date: twoDaysAgo,
    },
    {
      id: 'tx_demo_6',
      userId: uid,
      type: 'expense',
      amount: 1850,
      category: 'Dining',
      description: 'Team lunch',
      paymentMethod: 'Credit Card',
      date: today,
    },
    {
      id: 'tx_demo_7',
      userId: uid,
      type: 'expense',
      amount: 2400,
      category: 'Transport',
      description: 'Metro pass & airport cab',
      paymentMethod: 'UPI',
      date: `${monthPrefix}-05`,
    },
  ];

  const budgets: Budget[] = [
    { id: 'bdg_demo_1', userId: uid, category: 'Housing', month: monthPrefix, limit: 35000 },
    { id: 'bdg_demo_2', userId: uid, category: 'Groceries', month: monthPrefix, limit: 12000 },
    { id: 'bdg_demo_3', userId: uid, category: 'Dining', month: monthPrefix, limit: 6000 },
    { id: 'bdg_demo_4', userId: uid, category: 'Software', month: monthPrefix, limit: 5000 },
    { id: 'bdg_demo_5', userId: uid, category: 'Transport', month: monthPrefix, limit: 5000 },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'sav_demo_1',
      userId: uid,
      title: 'Emergency Reserve Fund',
      targetAmount: 600000,
      currentAmount: 420000,
      targetDate: addDaysISO(today, 180),
    },
    {
      id: 'sav_demo_2',
      userId: uid,
      title: 'Kyoto Autumn Trip',
      targetAmount: 180000,
      currentAmount: 112000,
      targetDate: addDaysISO(today, 120),
    },
  ];

  const notes: Note[] = [
    {
      id: 'note_demo_1',
      userId: uid,
      title: 'Weekly Executive Synthesis',
      content: `# Focus Pillars for This Week\n\nShip the unified dashboard layout and complete user onboarding polish.\n\n## Action Checklist\n- [x] Audit dark and light mode contrast ratios\n- [ ] Finalize Q4 roadmap narrative\n- [ ] Confirm Friday sprint demo agenda\n\n## Key Insight\nKeep morning deep work blocks strictly protected before 12:30 PM.`,
      folder: 'Work',
      tags: ['strategy', 'weekly'],
      pinned: true,
      favorite: true,
      archived: false,
      attachments: [],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'note_demo_2',
      userId: uid,
      title: 'Reading Highlights — Systems Thinking',
      content: `## Core Principles\n1. Optimize the bottleneck, not isolated subsystems.\n2. Feedback loops determine long-term stability.\n3. Simplicity scales better than cleverness.\n\n- [ ] Revisit Chapter 4 summary`,
      folder: 'Learning',
      tags: ['books', 'notes'],
      pinned: false,
      favorite: false,
      archived: false,
      attachments: [],
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const habits: Habit[] = [
    { id: 'hab_demo_1', userId: uid, name: 'Deep Work (90 min)', category: 'Productivity', frequency: 'daily', targetPerWeek: 6, color: '#8B7CFF' },
    { id: 'hab_demo_2', userId: uid, name: 'Morning Workout', category: 'Health', frequency: 'daily', targetPerWeek: 5, color: '#34D399' },
    { id: 'hab_demo_3', userId: uid, name: 'Read 20 Pages', category: 'Learning', frequency: 'daily', targetPerWeek: 7, color: '#60A5FA' },
    { id: 'hab_demo_4', userId: uid, name: 'Zero Impulse Spend', category: 'Finance', frequency: 'daily', targetPerWeek: 6, color: '#FBBF24' },
  ];

  const habitRecords: HabitRecord[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const d = addDaysISO(today, -offset);
    if (offset !== 3 && offset !== 9) {
      habitRecords.push({ id: `hr_1_${d}`, userId: uid, habitId: 'hab_demo_1', date: d, completed: true });
    }
    if (offset % 2 === 0 || offset < 3) {
      habitRecords.push({ id: `hr_2_${d}`, userId: uid, habitId: 'hab_demo_2', date: d, completed: true });
    }
    if (offset < 6) {
      habitRecords.push({ id: `hr_3_${d}`, userId: uid, habitId: 'hab_demo_3', date: d, completed: true });
    }
    if (offset > 0 && offset < 8) {
      habitRecords.push({ id: `hr_4_${d}`, userId: uid, habitId: 'hab_demo_4', date: d, completed: true });
    }
  }

  const focusSessions: FocusSession[] = [
    {
      id: 'foc_demo_1',
      userId: uid,
      mode: 'focus',
      durationMinutes: 25,
      taskId: 'task_demo_1',
      taskTitle: 'Finalize Q4 product roadmap brief',
      completedAt: `${today}T09:30:00.000Z`,
    },
    {
      id: 'foc_demo_2',
      userId: uid,
      mode: 'focus',
      durationMinutes: 25,
      taskId: 'task_demo_1',
      taskTitle: 'Finalize Q4 product roadmap brief',
      completedAt: `${yesterday}T15:10:00.000Z`,
    },
  ];

  const goals: Goal[] = [
    {
      id: 'goal_demo_1',
      userId: uid,
      title: 'Ship DAYFLOW Workspace v1.0',
      description: 'Complete end-to-end polish across productivity, finance, and AI tools.',
      horizon: 'monthly',
      targetDate: addDaysISO(today, 18),
      progress: 75,
      status: 'active',
      milestones: [
        { id: 'm1', title: 'Design token system & dark/light theme', completed: true },
        { id: 'm2', title: 'Task board + calendar integration', completed: true },
        { id: 'm3', title: 'Finance charts & CSV reporting', completed: true },
        { id: 'm4', title: 'Final QA & deployment', completed: false },
      ],
    },
    {
      id: 'goal_demo_2',
      userId: uid,
      title: 'Complete 20-Day Mindfulness & Running Streak',
      description: 'Maintain consistent morning cardio and 10-minute breathwork.',
      horizon: 'weekly',
      targetDate: addDaysISO(today, 6),
      progress: 60,
      status: 'active',
      milestones: [
        { id: 'm5', title: 'Week 1 complete (5 workouts)', completed: true },
        { id: 'm6', title: 'Week 2 complete (5 workouts)', completed: false },
      ],
    },
    {
      id: 'goal_demo_3',
      userId: uid,
      title: 'Build 6-Month Liquid Reserve',
      description: 'Reach ₹6,00,000 in dedicated high-yield savings.',
      horizon: 'yearly',
      targetDate: addDaysISO(today, 180),
      progress: 70,
      status: 'active',
      milestones: [
        { id: 'm7', title: 'Reach ₹3,00,000 milestone', completed: true },
        { id: 'm8', title: 'Reach ₹4,50,000 milestone', completed: false },
      ],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_demo_1',
      userId: uid,
      title: 'Overdue Task Reminder',
      message: 'Submit quarterly tax advance estimate was due yesterday.',
      category: 'task',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif_demo_2',
      userId: uid,
      title: 'Upcoming Sync at 10:00',
      message: 'Product Architecture Sync starts today in Studio Room B.',
      category: 'event',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
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
    notifications,
  };
}
