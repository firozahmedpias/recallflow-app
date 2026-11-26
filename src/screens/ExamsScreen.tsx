import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_COLORS } from '../types/study';
import { formatDisplayDate, getTodayISO } from '../utils/dates';

export const ExamsScreen: React.FC = () => {
  const { state, addSubject, addExamResult, deleteExamResult, setActiveScreen } = useStudy();

  const [subjectId, setSubjectId] = useState<string>(
    () => state.subjects[0]?.id || '__new__'
  );
  const [newSubjectName, setNewSubjectName] = useState('');
  const [topicId, setTopicId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => getTodayISO());
  const [marksObtained, setMarksObtained] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [notes, setNotes] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const subjectMap = useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects]
  );
  const topicMap = useMemo(
    () => new Map(state.topics.map((t) => [t.id, t])),
    [state.topics]
  );

  const topicsForSelectedSubject = useMemo(
    () => state.topics.filter((t) => t.subjectId === subjectId),
    [state.topics, subjectId]
  );

  const filteredExams = useMemo(() => {
    const list =
      filterSubject === 'all'
        ? state.exams
        : state.exams.filter((e) => e.subjectId === filterSubject);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [state.exams, filterSubject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const obtained = Number(marksObtained);
    const total = Number(totalMarks);

    if (!title.trim()) {
      setError('Enter an exam or quiz title.');
      return;
    }
    if (!Number.isFinite(obtained) || !Number.isFinite(total) || total <= 0 || obtained < 0 || obtained > total) {
      setError('Enter valid marks (0 to total marks, and total > 0).');
      return;
    }

    let resolvedSubjectId = subjectId;
    if (resolvedSubjectId === '__new__' || state.subjects.length === 0) {
      if (!newSubjectName.trim()) {
        setError('Enter a subject name.');
        return;
      }
      const created = addSubject(
        newSubjectName.trim(),
        SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length]
      );
      resolvedSubjectId = created.id;
      setSubjectId(resolvedSubjectId);
      setNewSubjectName('');
    }

    addExamResult({
      subjectId: resolvedSubjectId,
      topicId: topicId || undefined,
      title: title.trim(),
      date: date || getTodayISO(),
      marksObtained: obtained,
      totalMarks: total,
      notes,
    });

    setTitle('');
    setMarksObtained('');
    setNotes('');
    setTopicId('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Exams & Tests
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Record test scores per subject or topic to track improvement and weak areas.
          </p>
        </div>

        {state.exams.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveScreen('analytics')}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 self-start cursor-pointer"
          >
            View Analytics Charts
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Record Exam Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Record Exam Result
          </h2>

          <div>
            <label
              htmlFor="exam-subject"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject
            </label>
            <select
              id="exam-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setTopicId('');
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3 text-sm text-slate-900 dark:text-slate-100"
            >
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="__new__">+ New Subject</option>
            </select>

            {(subjectId === '__new__' || state.subjects.length === 0) && (
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="New subject name"
                className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
              />
            )}
          </div>

          {topicsForSelectedSubject.length > 0 && (
            <div>
              <label
                htmlFor="exam-topic"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Topic <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <select
                id="exam-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3 text-sm text-slate-900 dark:text-slate-100"
              >
                <option value="">All / General subject test</option>
                {topicsForSelectedSubject.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              htmlFor="exam-title"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Exam / Quiz Title
            </label>
            <input
              id="exam-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midterm Mock Test 2"
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="exam-marks"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Marks Obtained
              </label>
              <input
                id="exam-marks"
                type="number"
                step="0.5"
                min={0}
                value={marksObtained}
                onChange={(e) => setMarksObtained(e.target.value)}
                placeholder="82"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="exam-total"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Total Marks
              </label>
              <input
                id="exam-total"
                type="number"
                step="0.5"
                min={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="100"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="exam-date"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Date
            </label>
            <input
              id="exam-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="exam-notes"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Notes (optional)
            </label>
            <input
              id="exam-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mistakes to review..."
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-rose-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Save Exam Result</span>
          </button>
        </form>

        {/* Exam Results List */}
        <div className="lg:col-span-7 space-y-3">
          {state.subjects.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilterSubject('all')}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  filterSubject === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All Subjects
              </button>
              {state.subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFilterSubject(s.id)}
                  className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    filterSubject === s.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {filteredExams.length > 0 ? (
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
              {filteredExams.map((exam) => {
                const subject = subjectMap.get(exam.subjectId);
                const topic = exam.topicId ? topicMap.get(exam.topicId) : undefined;
                const pct = Math.round((exam.marksObtained / exam.totalMarks) * 100);

                return (
                  <div
                    key={exam.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                        style={{ backgroundColor: subject?.color || '#6366F1' }}
                      >
                        {(subject?.name || 'E').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {exam.title}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {subject?.name || 'General'}
                          {topic ? ` · ${topic.name}` : ''}
                          {' · '}
                          {formatDisplayDate(exam.date)}
                        </p>
                        {exam.notes && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {exam.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right tabular-nums">
                        <p
                          className={`font-mono text-base font-bold ${
                            pct >= 80
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : pct >= 60
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {pct}%
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {exam.marksObtained}/{exam.totalMarks}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteExamResult(exam.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        aria-label={`Delete ${exam.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
              <ClipboardCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                No exam results recorded yet
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Log quiz or mock exam scores to unlock score trends and weak-topic detection.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
