import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useDayflow } from '../context/DayflowContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useDayflow();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const Icon =
          toast.variant === 'success'
            ? CheckCircle2
            : toast.variant === 'warning'
            ? AlertTriangle
            : toast.variant === 'error'
            ? XCircle
            : Info;
        const iconColor =
          toast.variant === 'success'
            ? 'text-emerald-500 dark:text-[#34D399]'
            : toast.variant === 'warning'
            ? 'text-amber-500 dark:text-[#FBBF24]'
            : toast.variant === 'error'
            ? 'text-rose-500'
            : 'text-[#8B7CFF]';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#171D29] p-3.5 shadow-lg transition-all"
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-[#F8FAFC]">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] mt-0.5 break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
