import { useMemo } from 'react';
import { Download, FileText, FolderOpen, Paperclip, Wrench } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { downloadFile, getTodayISO } from '../../lib/formatters';

export function DocumentsView() {
  const { notes, tasks, events, transactions, goals, setActiveNav, pushToast } = useDayflow();

  const attachments = useMemo(() => {
    const items: Array<{ noteId: string; noteTitle: string; name: string; size: number; type: string }> = [];
    notes.forEach((n) => {
      (n.attachments || []).forEach((att) => {
        items.push({
          noteId: n.id,
          noteTitle: n.title || 'Untitled Note',
          name: att.name,
          size: att.size,
          type: att.type,
        });
      });
    });
    return items;
  }, [notes]);

  const exportFullArchive = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks,
      events,
      transactions,
      notes,
      goals,
    };
    downloadFile(
      `dayflow-workspace-${getTodayISO()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    pushToast({ title: 'Workspace JSON exported', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Documents & Workspace Files</h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Manage note attachments, export workspace archives, or process PDFs in Document Utilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportFullArchive}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export JSON Archive
          </button>
          <button
            type="button"
            onClick={() => setActiveNav('utilities')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" /> PDF & Document Tools
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Paperclip className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-display font-semibold text-base">Note Attachments</h3>
          </div>
          {attachments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] py-8 text-center">
              No files attached to notes yet. Open any note to attach documents.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div
                  key={`${att.noteId}_${idx}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#121620] text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{att.name}</p>
                    <p className="text-slate-500 dark:text-[#94A3B8] truncate">
                      Attached to: {att.noteTitle}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-slate-400 shrink-0">
                    {Math.max(1, Math.round(att.size / 1024))} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-4 h-4 text-[#60A5FA]" />
            <h3 className="font-display font-semibold text-base">Markdown Notes Library</h3>
          </div>
          <div className="space-y-2">
            {notes.slice(0, 6).map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#121620] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-[#8B7CFF] shrink-0" />
                  <span className="font-medium truncate">{n.title || 'Untitled Note'}</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    downloadFile(`${(n.title || 'note').replace(/\s+/g, '_')}.md`, n.content, 'text/markdown')
                  }
                  className="text-[#8B7CFF] hover:underline shrink-0 cursor-pointer"
                >
                  Download .md
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
