import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coffee,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_COLORS } from '../types/study';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import {
  getCompletedTodayRevisions,
  getDueTodayRevisions,
  getOverdueRevisions,
} from '../utils/revisions';
import { RevisionItemRow } from '../components/RevisionItemRow';

function formatMMSS(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const TimerScreen: React.FC = () => {
  const {
    state,
    timer,
    setActiveScreen,
    addSubject,
    openRevisionSession,
    openNewTopicSession,
    startRevisionTimer,
    startNewTopicSession,
    pauseTimer,
    resumeTimer,
    resetTimer,
    completeTimerEarly,
    startBreakTimer,
    skipBreak,
    markRevisionDone,
    undoRevisionDone,
    snoozeRevision,
  } = useStudy();

  const todayISO = getTodayISO();

  // Revision subject categorization filter
  const [revisionSubjectId, setRevisionSubjectId] = useState<string>(
    () => timer.subjectId || 'all'
  );

  useEffect(() => {
    setRevisionSubjectId(timer.subjectId || 'all');
  }, [timer.subjectId]);

  // New topic setup local state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    () => state.subjects[0]?.id || '__new__'
  );
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicNotes, setNewTopicNotes] = useState('');
  const [logOnComplete, setLogOnComplete] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const topicMap = useMemo(
    () => new Map(state.topics.map((t) => [t.id, t])),
    [state.topics]
  );
  const subjectMap = useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects]
  );

  const overdue = useMemo(
    () =>
      getOverdueRevisions(state.revisions, todayISO).filter(
        (r) => revisionSubjectId === 'all' || r.subjectId === revisionSubjectId
      ),
    [state.revisions, todayISO, revisionSubjectId]
  );
  const dueToday = useMemo(
    () =>
      getDueTodayRevisions(state.revisions, todayISO).filter(
        (r) => revisionSubjectId === 'all' || r.subjectId === revisionSubjectId
      ),
    [state.revisions, todayISO, revisionSubjectId]
  );
  const reviseQueue = useMemo(() => [...overdue, ...dueToday], [overdue, dueToday]);

  const revisedToday = useMemo(
    () =>
      getCompletedTodayRevisions(state.revisions, todayISO)
        .filter((r) => revisionSubjectId === 'all' || r.subjectId === revisionSubjectId)
        .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || '')),
    [state.revisions, todayISO, revisionSubjectId]
  );

  const nextPendingByTopic = useMemo(() => {
    const map = new Map<string, { dueDate: string; stepDay: number }>();
    const pendingSorted = state.revisions
      .filter((r) => r.status !== 'done')
      .sort((a, b) => a.stepDay - b.stepDay);
    for (const r of pendingSorted) {
      if (!map.has(r.topicId)) {
        map.set(r.topicId, { dueDate: r.dueDate, stepDay: r.stepDay });
      }
    }
    return map;
  }, [state.revisions]);

  const isRunning = timer.phase === 'running' || timer.phase === 'break_running';
  const isPaused = timer.phase === 'paused' || timer.phase === 'break_paused';
  const isBreak =
    timer.phase === 'break_prompt' ||
    timer.phase === 'break_running' ||
    timer.phase === 'break_paused';

  const totalSeconds =
    isBreak
      ? state.settings.breakDurationMinutes * 60
      : timer.plannedMinutes * 60;
  const progress =
    totalSeconds > 0
      ? Math.min(1, Math.max(0, 1 - timer.remainingSeconds / totalSeconds))
      : 0;

  const radius = 104;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  const handleStartNewTopic = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newTopicName.trim()) {
      setFormError('Enter the topic you want to study.');
      return;
    }
    let subjId = selectedSubjectId;
    if (subjId === '__new__' || state.subjects.length === 0) {
      if (!newSubjectName.trim()) {
        setFormError('Enter a subject name first.');
        return;
      }
      const created = addSubject(
        newSubjectName.trim(),
        SUBJECT_COLORS[state.subjects.length % SUBJECT_COLORS.length]
      );
      subjId = created.id;
      setSelectedSubjectId(subjId);
      setNewSubjectName('');
    }
    startNewTopicSession({
      subjectId: subjId,
      topicName: newTopicName.trim(),
      notes: newTopicNotes.trim(),
      logTopicOnComplete: logOnComplete,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Focus Timer
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Completed sessions are logged automatically and count toward your daily streak.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('settings')}
          className="min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 self-start cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Edit Durations</span>
        </button>
      </div>

      {/* Mode Switcher (disabled while active session runs so timer isn't accidentally lost) */}
      <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80">
        <button
          type="button"
          disabled={isRunning || isPaused}
          onClick={() => openRevisionSession(false)}
          className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 ${
            timer.mode === 'revision'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Revise Session ({state.settings.revisionDurationMinutes}m)
        </button>
        <button
          type="button"
          disabled={isRunning || isPaused}
          onClick={() => openNewTopicSession()}
          className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 ${
            timer.mode === 'new_topic'
              ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Study New Topic ({state.settings.newTopicDurationMinutes}m)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Timer Dial Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col items-center text-center">
          {/* Break Prompt Overlay inside card */}
          {timer.phase === 'break_prompt' ? (
            <div className="py-8 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
                <Coffee className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Session Complete
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Take a {state.settings.breakDurationMinutes}-minute break to let your recall consolidate.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startBreakTimer}
                  className="min-h-[44px] px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer"
                >
                  Start {state.settings.breakDurationMinutes}m Break
                </button>
                <button
                  type="button"
                  onClick={skipBreak}
                  className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Skip Break
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {isBreak
                  ? 'Short Break'
                  : timer.mode === 'revision'
                    ? 'Spaced Revision Session'
                    : timer.topicName
                      ? `Studying: ${timer.topicName}`
                      : 'New Topic Deep Focus'}
              </p>

              {/* Circular Countdown Ring */}
              <div className="relative my-5 w-60 h-60 flex items-center justify-center">
                <svg className="w-60 h-60 -rotate-90" viewBox="0 0 240 240" aria-hidden="true">
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-slate-200 dark:text-slate-800"
                  />
                  <circle
                    cx="120"
                    cy="120"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className={`transition-all duration-300 ${
                      isBreak ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-500'
                    }`}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-5xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
                    {formatMMSS(timer.remainingSeconds)}
                  </span>
                  <span className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {isRunning ? 'Running' : isPaused ? 'Paused' : 'Ready'}
                  </span>
                </div>
              </div>

              {/* Timer Controls */}
              {timer.phase === 'idle' && timer.mode === 'revision' && state.subjects.length > 0 && (
                <div className="w-full mb-4 text-left">
                  <label
                    htmlFor="revise-subject-select"
                    className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
                  >
                    Categorize session under subject
                  </label>
                  <select
                    id="revise-subject-select"
                    value={revisionSubjectId}
                    onChange={(e) => setRevisionSubjectId(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] px-3 text-sm text-slate-900 dark:text-slate-100"
                  >
                    <option value="all">All Due Subjects</option>
                    {state.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2.5 w-full">
                {timer.phase === 'idle' && timer.mode === 'revision' && (
                  <button
                    type="button"
                    onClick={() =>
                      startRevisionTimer(
                        revisionSubjectId === 'all' ? undefined : revisionSubjectId
                      )
                    }
                    className="min-h-[48px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start {state.settings.revisionDurationMinutes}m Revision</span>
                  </button>
                )}

                {isRunning && (
                  <button
                    type="button"
                    onClick={pauseTimer}
                    className="min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Pause className="w-4 h-4" />
                    <span>Pause</span>
                  </button>
                )}

                {isPaused && (
                  <button
                    type="button"
                    onClick={resumeTimer}
                    className="min-h-[48px] px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Resume</span>
                  </button>
                )}

                {(isRunning || isPaused) && (
                  <>
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset</span>
                    </button>

                    {!isBreak && (
                      <button
                        type="button"
                        onClick={completeTimerEarly}
                        className="min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Finish & Log</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Mode-Specific Companion Panel */}
        <div className="lg:col-span-7">
          {timer.mode === 'revision' ? (
            <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    {reviseQueue.length}{' '}
                    {reviseQueue.length === 1 ? 'topic' : 'topics'} to revise
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {reviseQueue.length > 0
                      ? 'Includes today’s due and overdue topics. Mark Revised to schedule your next recall.'
                      : 'All due and overdue revisions are clear.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScreen('add-topic')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {reviseQueue.length > 0 ? (
                <div>
                  {reviseQueue.map((rev) => (
                    <RevisionItemRow
                      key={rev.id}
                      revision={rev}
                      topic={topicMap.get(rev.topicId)}
                      subject={subjectMap.get(rev.subjectId)}
                      doneLabel="Revised"
                      onMarkDone={markRevisionDone}
                      onSnooze={snoozeRevision}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    0 topics to revise
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {revisedToday.length > 0
                      ? 'Great job — you cleared every due and overdue topic on your list.'
                      : 'No revisions are due or overdue right now. Log a new topic or switch to Study New Topic.'}
                  </p>
                </div>
              )}

              {revisedToday.length > 0 && (
                <div className="border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1120]/50">
                  <div className="px-5 py-2.5 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Revised Today · {revisedToday.length}
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Next interval auto-scheduled
                    </span>
                  </div>
                  <div>
                    {revisedToday.map((rev) => {
                      const next = nextPendingByTopic.get(rev.topicId);
                      const nextText = next
                        ? `Revised · Next: ${formatDisplayDate(next.dueDate)} (Day ${next.stepDay})`
                        : 'Revised · All 4 done';
                      return (
                        <RevisionItemRow
                          key={rev.id}
                          revision={rev}
                          topic={topicMap.get(rev.topicId)}
                          subject={subjectMap.get(rev.subjectId)}
                          nextRevisionText={nextText}
                          onMarkDone={markRevisionDone}
                          onUndoDone={undoRevisionDone}
                          onSnooze={snoozeRevision}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleStartNewTopic}
              className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4"
            >
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Study New Topic ({state.settings.newTopicDurationMinutes}m)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter what you&apos;re learning to start the countdown automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject
                </label>
                {state.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2.5">
                    {state.subjects.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isRunning || isPaused}
                        onClick={() => setSelectedSubjectId(s.id)}
                        className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                          selectedSubjectId === s.id
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isRunning || isPaused}
                      onClick={() => setSelectedSubjectId('__new__')}
                      className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                        selectedSubjectId === '__new__'
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      + New Subject
                    </button>
                  </div>
                )}

                {(selectedSubjectId === '__new__' || state.subjects.length === 0) && (
                  <input
                    type="text"
                    disabled={isRunning || isPaused}
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="Subject name (e.g., Physics)"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              <div>
                <label
                  htmlFor="timer-topic-name"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Topic Name
                </label>
                <input
                  id="timer-topic-name"
                  type="text"
                  disabled={isRunning || isPaused}
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="e.g., Thermodynamics Second Law"
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="timer-topic-notes"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="timer-topic-notes"
                  rows={2}
                  disabled={isRunning || isPaused}
                  value={newTopicNotes}
                  onChange={(e) => setNewTopicNotes(e.target.value)}
                  placeholder="Key objectives for this session..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] p-3 text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer min-h-[40px]">
                <input
                  type="checkbox"
                  disabled={isRunning || isPaused}
                  checked={logOnComplete}
                  onChange={(e) => setLogOnComplete(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  Automatically log this topic and schedule Day 1, 4, 7, 10 revisions when done
                </span>
              </label>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-500">
                  {formError}
                </p>
              )}

              {timer.phase === 'idle' && (
                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start {state.settings.newTopicDurationMinutes}m Study Timer</span>
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
