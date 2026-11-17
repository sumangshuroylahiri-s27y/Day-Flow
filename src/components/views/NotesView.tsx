import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bold,
  CheckSquare,
  Eye,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Paperclip,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';
import { generateSafeId, NoteAttachment } from '../../types/dayflow';

export function NotesView() {
  const { notes, addNote, updateNote, deleteNote, pushToast } = useDayflow();

  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => notes[0]?.id || null);
  const [distractionFree, setDistractionFree] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Local controlled draft for smooth typing + debounced autosave
  const selectedNote = useMemo(() => notes.find((n) => n.id === selectedId) || null, [notes, selectedId]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('General');
  const [tagsInput, setTagsInput] = useState('');
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedId && notes.length > 0) {
      setSelectedId(notes[0].id);
    }
  }, [notes, selectedId]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setFolder(selectedNote.folder);
      setTagsInput((selectedNote.tags || []).join(', '));
      setSaveState('Saved');
    }
  }, [selectedNote?.id]);

  const scheduleAutosave = (nextTitle: string, nextContent: string, nextFolder: string, nextTags: string) => {
    if (!selectedNote) return;
    setSaveState('Saving...');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const parsedTags = nextTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 15);
      await updateNote(selectedNote.id, {
        title: nextTitle,
        content: nextContent,
        folder: nextFolder.trim() || 'General',
        tags: parsedTags,
      });
      setSaveState('Saved');
    }, 500);
  };

  const folders = useMemo(() => {
    const set = new Set<string>(['General', 'Work', 'Learning', 'Personal']);
    notes.forEach((n) => {
      if (n.folder) set.add(n.folder);
    });
    return Array.from(set);
  }, [notes]);

  const visibleNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (folderFilter === 'archived') {
          if (!n.archived) return false;
        } else {
          if (n.archived) return false;
          if (folderFilter === 'favorites' && !n.favorite) return false;
          if (folderFilter === 'pinned' && !n.pinned) return false;
          if (
            folderFilter !== 'all' &&
            folderFilter !== 'favorites' &&
            folderFilter !== 'pinned' &&
            n.folder !== folderFilter
          ) {
            return false;
          }
        }
        if (q) {
          return (
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            (n.tags || []).some((t) => t.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [notes, folderFilter, search]);

  const createNewNote = async () => {
    const created = await addNote({
      title: 'Untitled Note',
      content: '# New Note\n\nStart writing...',
      folder:
        folderFilter !== 'all' && folderFilter !== 'favorites' && folderFilter !== 'pinned' && folderFilter !== 'archived'
          ? folderFilter
          : 'General',
      tags: [],
      pinned: false,
      favorite: false,
      archived: false,
      attachments: [],
    });
    setSelectedId(created.id);
    setPreviewMode(false);
    pushToast({ title: 'New note created', variant: 'success' });
  };

  const insertFormatting = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      const next = `${content}\n${snippet}`;
      setContent(next);
      scheduleAutosave(title, next, folder, tagsInput);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);
    const replacement = snippet.includes('{{sel}}')
      ? snippet.replace('{{sel}}', selected || 'text')
      : snippet;
    const next = content.slice(0, start) + replacement + content.slice(end);
    setContent(next);
    scheduleAutosave(title, next, folder, tagsInput);
  };

  const toggleChecklistLine = (lineIdx: number) => {
    const lines = content.split('\n');
    const line = lines[lineIdx];
    if (!line) return;
    if (line.includes('- [ ] ')) {
      lines[lineIdx] = line.replace('- [ ] ', '- [x] ');
    } else if (line.includes('- [x] ')) {
      lines[lineIdx] = line.replace('- [x] ', '- [ ] ');
    }
    const next = lines.join('\n');
    setContent(next);
    scheduleAutosave(title, next, folder, tagsInput);
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedNote || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    let previewText = '';
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      previewText = (await file.text()).slice(0, 600);
    }
    const nextAtt: NoteAttachment = {
      id: generateSafeId('att'),
      name: file.name.slice(0, 120),
      size: file.size,
      type: file.type || 'application/octet-stream',
      previewText,
    };
    const nextList = [...(selectedNote.attachments || []), nextAtt].slice(0, 10);
    await updateNote(selectedNote.id, { attachments: nextList });
    pushToast({ title: `Attached ${file.name}`, variant: 'success' });
  };

  return (
    <div className={`grid gap-4 ${distractionFree ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
      {/* Left Column: Folders & Notes List */}
      {!distractionFree && (
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-4 flex flex-col max-h-[78vh]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
              />
            </div>
            <button
              type="button"
              onClick={createNewNote}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New
            </button>
          </div>

          <div className="flex flex-wrap gap-1 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
            {[
              ['all', 'All'],
              ['pinned', 'Pinned'],
              ['favorites', 'Starred'],
              ['archived', 'Archived'],
              ...folders.map((f) => [f, f] as [string, string]),
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFolderFilter(id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  folderFilter === id
                    ? 'bg-[#8B7CFF]/15 text-[#7C6BFF] dark:text-[#8B7CFF]'
                    : 'text-slate-500 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {visibleNotes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] py-8 text-center">
                No notes in this view.
              </p>
            ) : (
              visibleNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedNote?.id === n.id
                      ? 'border-[#8B7CFF]/40 bg-[#8B7CFF]/10'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{n.title || 'Untitled Note'}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {n.pinned && <Pin className="w-3 h-3 text-[#8B7CFF]" />}
                      {n.favorite && <Star className="w-3 h-3 text-[#FBBF24] fill-[#FBBF24]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-1">
                    {n.folder} · {n.content.replace(/[#*\-\[\]]/g, '').slice(0, 60)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Right Column: Rich Editor */}
      <div
        className={`${
          distractionFree ? 'max-w-4xl mx-auto w-full' : 'lg:col-span-8'
        } rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 flex flex-col min-h-[70vh]`}
      >
        {!selectedNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-3">
              Select a note or create a fresh page to start writing.
            </p>
            <button
              type="button"
              onClick={createNewNote}
              className="px-4 py-2 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
            >
              Create First Note
            </button>
          </div>
        ) : (
          <>
            {/* Top Meta & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => {
                    setFolder(e.target.value);
                    scheduleAutosave(title, content, e.target.value, tagsInput);
                  }}
                  aria-label="Note folder"
                  className="w-28 px-2 py-1 rounded bg-slate-100 dark:bg-[#121620] text-xs font-medium"
                />
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => {
                    setTagsInput(e.target.value);
                    scheduleAutosave(title, content, folder, e.target.value);
                  }}
                  placeholder="tags, comma, separated"
                  aria-label="Note tags"
                  className="w-40 px-2 py-1 rounded bg-slate-100 dark:bg-[#121620] text-xs"
                />
                <span className="text-[11px]">{saveState}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateNote(selectedNote.id, { pinned: !selectedNote.pinned })}
                  title="Pin note"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    selectedNote.pinned ? 'text-[#8B7CFF] bg-[#8B7CFF]/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateNote(selectedNote.id, { favorite: !selectedNote.favorite })}
                  title="Favorite note"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    selectedNote.favorite ? 'text-[#FBBF24] bg-[#FBBF24]/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Star className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateNote(selectedNote.id, { archived: !selectedNote.archived })}
                  title={selectedNote.archived ? 'Unarchive' : 'Archive'}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    selectedNote.archived ? 'text-[#60A5FA]' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode((p) => !p)}
                  title="Toggle rich preview"
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    previewMode ? 'text-[#8B7CFF] bg-[#8B7CFF]/10' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDistractionFree((d) => !d)}
                  title={distractionFree ? 'Exit distraction-free mode' : 'Distraction-free mode'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  {distractionFree ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteNote(selectedNote.id);
                    setSelectedId(null);
                    pushToast({ title: 'Note deleted', variant: 'info' });
                  }}
                  title="Delete note"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            {!previewMode && (
              <div className="flex flex-wrap items-center gap-1 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
                {[
                  { icon: Heading1, label: 'H1', snip: '\n# {{sel}}' },
                  { icon: Heading2, label: 'H2', snip: '\n## {{sel}}' },
                  { icon: Bold, label: 'Bold', snip: '**{{sel}}**' },
                  { icon: Italic, label: 'Italic', snip: '*{{sel}}*' },
                  { icon: List, label: 'Bullet', snip: '\n- {{sel}}' },
                  { icon: ListOrdered, label: 'Numbered', snip: '\n1. {{sel}}' },
                  { icon: CheckSquare, label: 'Checklist', snip: '\n- [ ] {{sel}}' },
                ].map((tool) => (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={() => insertFormatting(tool.snip)}
                    title={tool.label}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <tool.icon className="w-3.5 h-3.5" />
                  </button>
                ))}

                <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer ml-auto">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Attach</span>
                  <input type="file" onChange={handleAttachFile} className="hidden" />
                </label>
              </div>
            )}

            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                scheduleAutosave(e.target.value, content, folder, tagsInput);
              }}
              placeholder="Note title..."
              className="font-display text-2xl font-bold bg-transparent focus:outline-none mb-3"
            />

            {previewMode ? (
              <div className="flex-1 space-y-2 text-sm leading-relaxed overflow-y-auto">
                {content.split('\n').map((line, i) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={i} className="font-display text-2xl font-bold pt-2">{line.slice(2)}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={i} className="font-display text-lg font-semibold pt-2">{line.slice(3)}</h2>;
                  }
                  if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
                    const checked = line.startsWith('- [x] ');
                    return (
                      <label key={i} className="flex items-center gap-2 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecklistLine(i)}
                        />
                        <span className={checked ? 'line-through text-slate-400' : ''}>
                          {line.slice(6)}
                        </span>
                      </label>
                    );
                  }
                  if (line.startsWith('- ')) {
                    return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
                  }
                  if (/^\d+\.\s/.test(line)) {
                    return <p key={i} className="ml-2">{line}</p>;
                  }
                  return line.trim() ? <p key={i}>{line}</p> : <div key={i} className="h-2" />;
                })}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  scheduleAutosave(title, e.target.value, folder, tagsInput);
                }}
                placeholder="Write in plain text or Markdown..."
                className="flex-1 w-full bg-transparent text-sm leading-relaxed resize-none focus:outline-none font-body min-h-[340px]"
              />
            )}

            {selectedNote.attachments && selectedNote.attachments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                <p className="text-xs font-medium text-slate-400 mb-2">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {selectedNote.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#8B7CFF]" />
                      <span>{att.name}</span>
                      <span className="text-slate-400 font-mono-tabular">
                        ({Math.max(1, Math.round(att.size / 1024))} KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
