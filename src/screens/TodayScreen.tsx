import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  BookPlus,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  FolderCog,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import {
  getCompletedTodayRevisions,
  getDueTodayRevisions,
  getOverdueRevisions,
  getUpcomingRevisions,
} from '../utils/revisions';
import { formatDisplayDate, formatHeaderDate, getTodayISO } from '../utils/dates';
import { getTopicRevisionStatus, getTopicStudyStatus } from '../utils/studyStatus';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications';
import { RevisionItemRow } from '../components/RevisionItemRow';
import { RevisionStatusBadge, StudyStatusBadge } from '../components/TopicStatusBadges';
import { SubjectManager } from '../components/SubjectManager';

export const TodayScreen: React.FC = () => {
  const {
    state,
    activeProfile,
    streaks,
    setActiveScreen,
    markRevisionDone,
    undoRevisionDone,
    snoozeRevision,
    markTopicStudied,
    openRevisionSession,
    openNewTopicSession,
    openExistingTopicSession,
    startExistingTopicSession,
    updateSettings,
  } = useStudy();

  const hour = new Date().getHours();
  const greetingPrefix =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayISO = getTodayISO();
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermission());
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const topicMap = useMemo(
    () => new Map(state.topics.map((t) => [t.id, t])),
    [state.topics]
  );
  const subjectMap = useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects]
  );

  // Filter helper by academic subject selected in Dashboard
  const matchesSubject = (subjId?: string) =>
    selectedSubjectId === 'all' || subjId === selectedSubjectId;

  const overdue = useMemo(
    () =>
      getOverdueRevisions(state.revisions, todayISO).filter((r) =>
        matchesSubject(r.subjectId)
      ),
    [state.revisions, todayISO, selectedSubjectId]
  );
  const dueToday = useMemo(
    () =>
      getDueTodayRevisions(state.revisions, todayISO).filter((r) =>
        matchesSubject(r.subjectId)
      ),
    [state.revisions, todayISO, selectedSubjectId]
  );
  const completedToday = useMemo(
    () =>
      getCompletedTodayRevisions(state.revisions, todayISO).filter((r) =>
        matchesSubject(r.subjectId)
      ),
    [state.revisions, todayISO, selectedSubjectId]
  );
  const upcoming = useMemo(
    () =>
      getUpcomingRevisions(state.revisions, todayISO)
        .filter((r) => matchesSubject(r.subjectId))
        .slice(0, 5),
    [state.revisions, todayISO, selectedSubjectId]
  );

  const todaySessions = useMemo(
    () =>
      state.sessions
        .filter((s) => s.date === todayISO && matchesSubject(s.subjectId))
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
    [state.sessions, todayISO, selectedSubjectId]
  );

  const todayTopicsLogged = useMemo(
    () =>
      state.topics.filter(
        (t) => t.studyDate === todayISO && matchesSubject(t.subjectId)
      ),
    [state.topics, todayISO, selectedSubjectId]
  );

  const todayTopicsWithStatus = useMemo(() => {
    return state.topics
      .filter((t) => matchesSubject(t.subjectId))
      .map((topic) => {
        const studyStatus = getTopicStudyStatus(topic, state.sessions, todayISO);
        const revisionStatus = getTopicRevisionStatus(topic.id, state.revisions, todayISO);
        return { topic, studyStatus, revisionStatus };
      })
      .filter(
        ({ topic, studyStatus }) =>
          topic.studyDate === todayISO || studyStatus.studiedDate === todayISO
      )
      .sort((a, b) => b.topic.createdAt.localeCompare(a.topic.createdAt));
  }, [state.topics, state.sessions, state.revisions, todayISO, selectedSubjectId]);

  const studiedTodayCount = useMemo(
    () => todayTopicsWithStatus.filter((item) => item.studyStatus.kind === 'studied').length,
    [todayTopicsWithStatus]
  );
  const notStudiedTodayCount = useMemo(
    () =>
      todayTopicsWithStatus.filter((item) => item.studyStatus.kind !== 'studied').length,
    [todayTopicsWithStatus]
  );

  const totalActionable = overdue.length + dueToday.length;
  const todayTotalForRing = totalActionable + completedToday.length;
  const todayCompletionPct =
    todayTotalForRing > 0
      ? Math.round((completedToday.length / todayTotalForRing) * 100)
      : 0;

  const todayMinutes = useMemo(
    () => todaySessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [todaySessions]
  );

  const goalPct = Math.min(
    100,
    Math.round((streaks.currentStreak / Math.max(1, state.goal.targetDays)) * 100)
  );

  const handleEnableNotifications = async () => {
    const result = await requestNotificationPermission();
    setNotifPerm(result);
    if (result === 'granted') {
      updateSettings({ notificationsEnabled: true });
      await sendBrowserNotification(
        'RecallFlow Alerts Enabled',
        'You will be reminded when spaced revisions are due.'
      );
    }
  };

  const ringR = 18;
  const ringCirc = 2 * Math.PI * ringR;
  const revDashOffset = ringCirc - (todayCompletionPct / 100) * ringCirc;
  const goalDashOffset = ringCirc - (goalPct / 100) * ringCirc;

  return (
    <div className="space-y-6">
      {/* Header + Personalized Profile Welcome + Primary Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {activeProfile.subtitle ? `${activeProfile.subtitle} · ` : ''}
            {formatHeaderDate()}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {greetingPrefix}, {activeProfile.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              openRevisionSession(
                true,
                selectedSubjectId === 'all' ? undefined : selectedSubjectId
              )
            }
            className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Revision ({state.settings.revisionDurationMinutes}m)</span>
          </button>

          <button
            type="button"
            onClick={openNewTopicSession}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookPlus className="w-4 h-4" />
            <span>Study New Topic ({state.settings.newTopicDurationMinutes}m)</span>
          </button>

          <button
            type="button"
            onClick={() => openExistingTopicSession()}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Study Existing Topic ({state.settings.newTopicDurationMinutes}m)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('add-topic')}
            className="hidden sm:inline-flex min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* Subject Categorization Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedSubjectId('all')}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedSubjectId === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            All Subjects
          </button>

          {state.subjects.map((subject) => {
            const active = selectedSubjectId === subject.id;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSelectedSubjectId(subject.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
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
        </div>

        <button
          type="button"
          onClick={() => setShowSubjectModal(true)}
          className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FolderCog className="w-4 h-4 text-indigo-500" />
          <span>Manage Subjects</span>
        </button>
      </div>

      {/* Summary Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Due & Overdue</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {totalActionable}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {completedToday.length} done today
            </p>
          </div>
          <svg className="w-12 h-12 shrink-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r={ringR}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-slate-800"
            />
            <circle
              cx="24"
              cy="24"
              r={ringR}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={revDashOffset}
              className="text-emerald-500 transition-all duration-300"
            />
          </svg>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('goals')}
          className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between gap-3 text-left hover:border-indigo-500/40 transition-colors cursor-pointer"
        >
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Study Streak</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {streaks.currentStreak}d
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Goal: {state.goal.targetDays}d
            </p>
          </div>
          <svg className="w-12 h-12 shrink-0 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle
              cx="24"
              cy="24"
              r={ringR}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-slate-200 dark:text-slate-800"
            />
            <circle
              cx="24"
              cy="24"
              r={ringR}
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCirc}
              strokeDashoffset={goalDashOffset}
              className="text-amber-500 transition-all duration-300"
            />
          </svg>
        </button>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Focus Time Today</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {todayMinutes}m
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {todaySessions.length} {todaySessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('subjects')}
          className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 text-left hover:border-indigo-500/40 transition-colors cursor-pointer"
        >
          <p className="text-xs text-slate-500 dark:text-slate-400">Topics Logged</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {selectedSubjectId === 'all'
              ? state.topics.length
              : state.topics.filter((t) => t.subjectId === selectedSubjectId).length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {todayTopicsLogged.length} added today
          </p>
        </button>
      </div>

      {/* Browser Notification Permission Prompt */}
      {isNotificationSupported() && notifPerm === 'default' && !state.settings.notificationsEnabled && (
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Enable revision reminders
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Get browser notifications when Day 1, 4, 7, or 10 revisions are due.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Allow Notifications
          </button>
        </div>
      )}

      {/* Main Two-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Today's Topics + Overdue & Due Today Revision Queue */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today's Topics + Studied / Not Studied Summary */}
          <section aria-labelledby="today-topics-heading">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <h2
                  id="today-topics-heading"
                  className="text-sm font-bold text-slate-900 dark:text-slate-100"
                >
                  Today&apos;s Topics
                </h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  Studied {studiedTodayCount} / Not studied {notStudiedTodayCount} today
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActiveScreen('study-plan')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Study Plan</span>
              </button>
            </div>

            {todayTopicsWithStatus.length > 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                {todayTopicsWithStatus.map(({ topic, studyStatus, revisionStatus }) => {
                  const subj = subjectMap.get(topic.subjectId);
                  const isStudied = studyStatus.kind === 'studied';

                  return (
                    <div
                      key={topic.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                          style={{ backgroundColor: subj?.color || '#6366F1' }}
                          aria-hidden="true"
                        >
                          {(subj?.name || 'S').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {topic.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                            {subj?.name || 'General'}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <StudyStatusBadge status={studyStatus} showDetail />
                            <RevisionStatusBadge status={revisionStatus} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => startExistingTopicSession(topic.id)}
                          className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                          <span>{state.settings.newTopicDurationMinutes}m</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => markTopicStudied(topic.id, !isStudied, todayISO)}
                          className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                            isStudied
                              ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isStudied ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Unmark</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Studied</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 px-4 py-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No topics assigned to today yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveScreen('add-topic')}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  + Add Topic
                </button>
              </div>
            )}
          </section>

          {overdue.length > 0 && (
            <section aria-labelledby="overdue-heading">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h2
                  id="overdue-heading"
                  className="text-sm font-bold text-amber-600 dark:text-amber-400"
                >
                  Overdue Revisions · {overdue.length}
                </h2>
              </div>
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-amber-500/30 overflow-hidden">
                {overdue.map((rev) => {
                  const topic = topicMap.get(rev.topicId);
                  return (
                    <RevisionItemRow
                      key={rev.id}
                      revision={rev}
                      topic={topic}
                      subject={subjectMap.get(rev.subjectId)}
                      studyStatus={
                        topic
                          ? getTopicStudyStatus(topic, state.sessions, todayISO)
                          : undefined
                      }
                      revisionStatus={
                        topic
                          ? getTopicRevisionStatus(topic.id, state.revisions, todayISO)
                          : undefined
                      }
                      onMarkDone={markRevisionDone}
                      onSnooze={snoozeRevision}
                    />
                  );
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="due-today-heading">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2
                id="due-today-heading"
                className="text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                Due Today · {dueToday.length}
              </h2>
              {dueToday.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    openRevisionSession(
                      true,
                      selectedSubjectId === 'all' ? undefined : selectedSubjectId
                    )
                  }
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Open in {state.settings.revisionDurationMinutes}m timer
                </button>
              )}
            </div>

            {dueToday.length > 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                {dueToday.map((rev) => {
                  const topic = topicMap.get(rev.topicId);
                  return (
                    <RevisionItemRow
                      key={rev.id}
                      revision={rev}
                      topic={topic}
                      subject={subjectMap.get(rev.subjectId)}
                      studyStatus={
                        topic
                          ? getTopicStudyStatus(topic, state.sessions, todayISO)
                          : undefined
                      }
                      revisionStatus={
                        topic
                          ? getTopicRevisionStatus(topic.id, state.revisions, todayISO)
                          : undefined
                      }
                      onMarkDone={markRevisionDone}
                      onSnooze={snoozeRevision}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 text-center">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  {state.topics.length === 0 ? (
                    <Sparkles className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-slate-100">
                  {state.topics.length === 0
                    ? 'Ready to start your study log'
                    : 'All caught up for today'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {state.subjects.length === 0
                    ? 'Define your academic subjects first, or add a topic directly and RecallFlow will schedule revisions on Day 1, 4, 7, and 10.'
                    : overdue.length > 0
                      ? 'You still have overdue items above to clear when ready.'
                      : 'Log a new topic or start a focused study session to extend your streak.'}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  {state.subjects.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setShowSubjectModal(true)}
                      className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                    >
                      <FolderCog className="w-4 h-4" />
                      <span>Define Subjects</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveScreen('add-topic')}
                    className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Studied Topic</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {completedToday.length > 0 && (
            <section aria-labelledby="completed-today-heading">
              <h2
                id="completed-today-heading"
                className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2.5 px-1"
              >
                Completed Today · {completedToday.length}
              </h2>
              <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                {completedToday.map((rev) => {
                  const topic = topicMap.get(rev.topicId);
                  return (
                    <RevisionItemRow
                      key={rev.id}
                      revision={rev}
                      topic={topic}
                      subject={subjectMap.get(rev.subjectId)}
                      studyStatus={
                        topic
                          ? getTopicStudyStatus(topic, state.sessions, todayISO)
                          : undefined
                      }
                      revisionStatus={
                        topic
                          ? getTopicRevisionStatus(topic.id, state.revisions, todayISO)
                          : undefined
                      }
                      onMarkDone={markRevisionDone}
                      onUndoDone={undoRevisionDone}
                      onSnooze={snoozeRevision}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Today's Categorized Sessions, Upcoming, Streak */}
        <div className="space-y-5">
          {/* Today's Sessions Categorized by Subject */}
          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Today&apos;s Sessions
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {todayMinutes}m total
              </span>
            </div>

            {todaySessions.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {todaySessions.map((sess) => {
                  const subj = sess.subjectId ? subjectMap.get(sess.subjectId) : undefined;
                  return (
                    <div key={sess.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: subj?.color || '#64748B' }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                            {sess.topicName ||
                              (sess.type === 'revision' ? 'Revision Session' : 'Study Session')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {subj?.name || 'All Subjects'} ·{' '}
                            {sess.type === 'revision' ? 'Revision' : 'New Topic'}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sess.durationMinutes}m
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                No completed timer sessions today yet.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Upcoming Revisions
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">Next up</span>
            </div>

            {upcoming.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {upcoming.map((rev) => {
                  const topic = topicMap.get(rev.topicId);
                  const subject = subjectMap.get(rev.subjectId);
                  if (!topic) return null;
                  return (
                    <div key={rev.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {topic.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {subject?.name || 'General'} · Day {rev.stepDay}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 shrink-0">
                        {formatDisplayDate(rev.dueDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-1">
                No upcoming revisions scheduled yet.
              </p>
            )}
          </section>

          <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {state.goal.title}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {streaks.currentStreak} of {state.goal.targetDays} days · {goalPct}%
                </p>
              </div>
              <Flame className="w-5 h-5 text-amber-500 shrink-0" />
            </div>

            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${goalPct}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setActiveScreen('goals')}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                View heatmap & rewards
              </button>
              <button
                type="button"
                onClick={() => setActiveScreen('analytics')}
                className="font-semibold text-slate-600 dark:text-slate-300 hover:underline cursor-pointer"
              >
                Analytics
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Quick Subject Management Modal from Dashboard */}
      {showSubjectModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => setShowSubjectModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Subject Management"
        >
          <div
            className="w-full sm:max-w-xl max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <SubjectManager onClose={() => setShowSubjectModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
