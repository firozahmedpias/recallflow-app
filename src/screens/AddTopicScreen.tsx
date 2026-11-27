import React, { useMemo, useState } from 'react';
import { Calendar, Check, Plus } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_COLORS } from '../types/study';
import { addDaysISO, formatDisplayDate, getTodayISO } from '../utils/dates';
import { REVISION_INTERVALS } from '../utils/revisions';

export const AddTopicScreen: React.FC = () => {
  const { state, addSubject, addTopic, setActiveScreen } = useStudy();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => state.subjects[0]?.id || '__new__'
  );
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState<string>(SUBJECT_COLORS[0]);
  const [topicName, setTopicName] = useState('');
  const [studyDate, setStudyDate] = useState(() => getTodayISO());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const previewDates = useMemo(
    () =>
      REVISION_INTERVALS.map((day) => ({
        day,
        date: addDaysISO(studyDate || getTodayISO(), day),
      })),
    [studyDate]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!topicName.trim()) {
      setError('Please enter a topic name.');
      return;
    }

    let subjectId = selectedSubjectId;
    if (subjectId === '__new__' || state.subjects.length === 0) {
      if (!newSubjectName.trim()) {
        setError('Please enter a subject name.');
        return;
      }
      const created = addSubject(newSubjectName.trim(), newSubjectColor);
      subjectId = created.id;
    }

    addTopic({
      subjectId,
      name: topicName.trim(),
      studyDate: studyDate || getTodayISO(),
      notes,
    });

    setTopicName('');
    setNotes('');
    setNewSubjectName('');
    setActiveScreen('today');
  };

  const creatingNewSubject =
    selectedSubjectId === '__new__' || state.subjects.length === 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Log Studied Topic
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Assign a topic to today or a future date in your Study Plan. Revisions are scheduled automatically on Day 1, 4, 7, and 10.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5"
      >
        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
            Subject
          </label>

          {state.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {state.subjects.map((subject) => {
                const active = selectedSubjectId === subject.id;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: active ? '#FFFFFF' : subject.color }}
                      aria-hidden="true"
                    />
                    <span>{subject.name}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setSelectedSubjectId('__new__')}
                className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedSubjectId === '__new__'
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Subject</span>
              </button>
            </div>
          )}

          {creatingNewSubject && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g., Organic Chemistry, Algorithms, Anatomy"
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Color:</span>
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewSubjectColor(color)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                      newSubjectColor === color ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                  >
                    {newSubjectColor === color && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Topic Name */}
        <div>
          <label
            htmlFor="topic-name-input"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            Topic Name
          </label>
          <input
            id="topic-name-input"
            type="text"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="e.g., Nucleophilic Substitution (SN1 vs SN2)"
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Study Date */}
        <div>
          <label
            htmlFor="study-date-input"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            Study Date
          </label>
          <div className="relative">
            <input
              id="study-date-input"
              type="date"
              value={studyDate}
              onChange={(e) => setStudyDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label
            htmlFor="topic-notes-input"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="topic-notes-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key formulas, tricky edge cases, or textbook pages..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] p-3.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Auto-Scheduled Revision Preview */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Auto-scheduled spaced revisions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {previewDates.map((item) => (
              <div
                key={item.day}
                className="rounded-lg bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 px-3 py-2"
              >
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Day {item.day}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 tabular-nums mt-0.5">
                  {formatDisplayDate(item.date)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-rose-500">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => setActiveScreen('today')}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all cursor-pointer"
          >
            Save Topic & Schedule
          </button>
        </div>
      </form>
    </div>
  );
};
