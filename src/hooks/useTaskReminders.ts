import { useEffect, useRef } from 'react';
import { Task, NotificationItem } from '../types/dayflow';

interface UseTaskRemindersParams {
  tasks: Task[];
  notificationsEnabled: boolean;
  addNotification?: (item: Omit<NotificationItem, 'id' | 'userId' | 'createdAt'>) => void;
  pushToast: (toast: { title: string; description?: string; variant: 'success' | 'info' | 'warning' | 'error' }) => void;
}

export function useTaskReminders({ tasks, notificationsEnabled, pushToast }: UseTaskRemindersParams) {
  const triggeredKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!notificationsEnabled) return;

    // Request notification permission on mount if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const checkReminders = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const todayISO = `${yyyy}-${mm}-${dd}`;
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;

      tasks.forEach((task) => {
        if (task.status === 'done') return;

        // Check dueTime or reminderAt
        const targetDate = task.dueDate || todayISO;
        const targetTime = task.dueTime || (task.reminderAt ? task.reminderAt.slice(11, 16) : '');

        if (targetDate === todayISO && targetTime === currentTimeStr) {
          const key = `${task.id}_${todayISO}_${targetTime}`;
          if (!triggeredKeysRef.current.has(key)) {
            triggeredKeysRef.current.add(key);

            // Trigger browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Task Reminder: ${task.title}`, {
                  body: task.description || `Due at ${targetTime} today.`,
                  icon: '/icon.svg',
                });
              } catch (err) {
                console.error('Browser notification error:', err);
              }
            }

            // Push in-app toast
            pushToast({
              title: `Reminder: ${task.title}`,
              description: `Due at ${targetTime}`,
              variant: 'info',
            });
          }
        }
      });
    };

    const interval = window.setInterval(checkReminders, 30000); // Check every 30s
    return () => window.clearInterval(interval);
  }, [tasks, notificationsEnabled, pushToast]);
}
