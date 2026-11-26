import React, { useMemo, useState } from 'react';
import { Check, Edit3, FolderPlus, Trash2, X } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_COLORS, Subject } from '../types/study';

interface SubjectManagerProps {
  /** Optional callback when used inside a modal or quick drawer */
  onClose?: () => void;
  /** Compact mode hides the outer page title when embedded inside another screen */
  compact?: boolean;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
  onClose,
  compact = false,
}) => {
  const { state, addSubject, updateSubject, deleteSubject } = useStudy();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editColor, setEditColor] = useState<string>(SUBJECT_COLORS[0]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Per-subject categorization stats (topics, completed revisions, session minutes)
  const subjectStats = useMemo(() => {
    const map = new Map<
      string,
      { topics: number; sessions: number; minutes: number; exams: number }
    >();

    for (const s of state.subjects) {
      map.set(s.id, { topics: 0, sessions: 0, minutes: 0, exams: 0 });
    }
    for (const t of state.topics) {
      const entry = map.get(t.subjectId);
      if (entry) entry.topics += 1;
    }
    for (const sess of state.sessions) {
      if (sess.subjectId) {
        const entry = map.get(sess.subjectId);
        if (entry) {
          entry.sessions += 1;
          entry.minutes += sess.durationMinutes;
        }
      }
    }
    for (const ex of state.exams) {
      const entry = map.get(ex.subjectId);
      if (entry) entry.exams += 1;
    }

    return map;
  }, [state.subjects, state.topics, state.sessions, state.exams]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Enter an academic subject name.');
      return;
    }

    const duplicate = state.subjects.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setFormError(`"${trimmed}" already exists.`);
      return;
    }

    addSubject(trimmed, color, code.trim() || undefined);
    setName('');
    setCode('');
    setColor(SUBJECT_COLORS[(state.subjects.length + 1) % SUBJECT_COLORS.length]);
  };

  const beginEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setEditName(subject.name);
    setEditCode(subject.code || '');
    setEditColor(subject.color);
    setConfirmDeleteId(null);
  };

  const saveEdit = (subjectId: string) => {
    if (!editName.trim()) return;
    updateSubject(subjectId, {
      name: editName.trim(),
      code: editCode.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-5">
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Subject Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Define academic subjects to organize topics, focus sessions, and exam analytics.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Close subject management"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Create Subject Form */}
      <form
        onSubmit={handleCreate}
        className="rounded-2xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <FolderPlus className="w-4 h-4 text-indigo-500" />
          <span>Add Academic Subject</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <label htmlFor="subject-mgr-name" className="sr-only">
              Subject name
            </label>
            <input
              id="subject-mgr-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Subject name (e.g., Data Structures, Biochemistry)"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="subject-mgr-code" className="sr-only">
              Course code (optional)
            </label>
            <input
              id="subject-mgr-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code (e.g., CS-201)"
              maxLength={16}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Color:</span>
            {SUBJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                  color === c
                    ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#0E1422]'
                    : ''
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              >
                {color === c && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer"
          >
            Add Subject
          </button>
        </div>

        {formError && (
          <p role="alert" className="text-xs font-medium text-rose-500">
            {formError}
          </p>
        )}
      </form>

      {/* Existing Subjects Directory */}
      {state.subjects.length > 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
          {state.subjects.map((subject) => {
            const stats = subjectStats.get(subject.id) || {
              topics: 0,
              sessions: 0,
              minutes: 0,
              exams: 0,
            };
            const isEditing = editingId === subject.id;
            const isConfirmingDelete = confirmDeleteId === subject.id;

            return (
              <div key={subject.id} className="p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Subject name"
                        className="sm:col-span-2 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 text-sm text-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="text"
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value)}
                        placeholder="Course code"
                        maxLength={16}
                        className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3 text-sm font-mono text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        {SUBJECT_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setEditColor(c)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                              editColor === c
                                ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#111827]'
                                : ''
                            }`}
                            style={{ backgroundColor: c }}
                            aria-label={`Color ${c}`}
                          >
                            {editColor === c && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(subject.id)}
                          className="min-h-[40px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: subject.color }}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                            {subject.name}
                          </h3>
                          {subject.code && (
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                              · {subject.code}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {stats.topics} {stats.topics === 1 ? 'topic' : 'topics'}
                          {' · '}
                          {stats.sessions} {stats.sessions === 1 ? 'session' : 'sessions'} ({stats.minutes}m)
                          {stats.exams > 0 ? ` · ${stats.exams} exams` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              deleteSubject(subject.id);
                              setConfirmDeleteId(null);
                            }}
                            className="min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[40px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => beginEdit(subject)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            aria-label={`Edit ${subject.name}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(subject.id)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            aria-label={`Delete ${subject.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No academic subjects defined yet
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Add your courses or exam subjects above to categorize topics, sessions, and test scores.
          </p>
        </div>
      )}
    </div>
  );
};
