import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Play,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { addDaysISO, formatDisplayDate, getTodayISO, parseLocalDateISO } from '../utils/dates';
import { getTopicRevisionStatus, getTopicStudyStatus } from '../utils/studyStatus';
import { RevisionStatusBadge, StudyStatusBadge } from '../components/TopicStatusBadges';

export const StudyPlanScreen: React.FC = () => {
  const {
    state,
    setActiveScreen,
    markTopicStudied,
    startExistingTopicSession,
  } = useStudy();

  const todayISO = getTodayISO();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const subjectMap = useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects]
  );

  // Build scrollable day strip centered around selectedDate (-5 to +9 days)
  const scrollableDays = useMemo(() => {
    const days: string[] = [];
    for (let offset = -5; offset <= 9; offset++) {
      days.push(addDaysISO(selectedDate, offset));
    }
    return days;
  }, [selectedDate]);

  // Group topics by their assigned studyDate
  const topicsByDate = useMemo(() => {
    const map = new Map<string, typeof state.topics>();
    for (const topic of state.topics) {
      if (subjectFilter !== 'all' && topic.subjectId !== subjectFilter) continue;
      const list = map.get(topic.studyDate) || [];
      list.push(topic);
      map.set(topic.studyDate, list);
    }
    return map;
  }, [state.topics, subjectFilter]);

  const selectedTopics = useMemo(() => {
    return (topicsByDate.get(selectedDate) || []).slice().sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [topicsByDate, selectedDate]);

  const selectedSummary = useMemo(() => {
    let studied = 0;
    let notStudied = 0;
    let pending = 0;

    for (const topic of selectedTopics) {
      const status = getTopicStudyStatus(topic, state.sessions, todayISO);
      if (status.kind === 'studied') studied += 1;
      else if (status.kind === 'not_studied') notStudied += 1;
      else pending += 1;
    }

    return { studied, notStudied, pending };
  }, [selectedTopics, state.sessions, todayISO]);

  // All dates that have assigned topics, sorted newest/future first
  const scheduledDatesOverview = useMemo(() => {
    return Array.from(topicsByDate.entries())
      .map(([date, topics]) => {
        let studied = 0;
        let notStudied = 0;
        let pending = 0;
        for (const t of topics) {
          const st = getTopicStudyStatus(t, state.sessions, todayISO);
          if (st.kind === 'studied') studied += 1;
          else if (st.kind === 'not_studied') notStudied += 1;
          else pending += 1;
        }
        return { date, total: topics.length, studied, notStudied, pending };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [topicsByDate, state.sessions, todayISO]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Study Plan
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track date-wise study completion across past, today&apos;s, and upcoming topics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveScreen('add-topic')}
          className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-1.5 self-start whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Topic</span>
        </button>
      </div>

      {/* Date Picker & Subject Filter Controls */}
      <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedDate(addDaysISO(selectedDate, -1))}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                aria-label="Pick study plan date"
                className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] pl-9 pr-3 text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(addDaysISO(selectedDate, 1))}
              className="min-h-[40px] min-w-[40px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {selectedDate !== todayISO && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayISO)}
                className="min-h-[40px] px-3 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-600/20 cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {state.subjects.length > 0 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filter study plan by subject"
              className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] px-3 text-xs font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Subjects</option>
              {state.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Scrollable Day Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {scrollableDays.map((iso) => {
            const d = parseLocalDateISO(iso);
            const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
            const dayNum = d.getDate();
            const isSelected = iso === selectedDate;
            const isToday = iso === todayISO;
            const dayTopics = topicsByDate.get(iso) || [];

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`min-w-[58px] min-h-[64px] px-2.5 py-2 rounded-2xl border flex flex-col items-center justify-center gap-0.5 shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isToday
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <span className="text-[11px] font-medium opacity-80">{weekday}</span>
                <span className="text-base font-bold tabular-nums leading-tight">
                  {dayNum}
                </span>
                <span
                  className={`text-[10px] font-semibold tabular-nums ${
                    isSelected
                      ? 'text-indigo-100'
                      : dayTopics.length > 0
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'opacity-40'
                  }`}
                >
                  {dayTopics.length > 0 ? `${dayTopics.length}t` : '·'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Topics List */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatDisplayDate(selectedDate)}
              <span className="ml-2 text-xs font-mono font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                ({selectedDate})
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {selectedTopics.length === 0
                ? 'No topics assigned to this date'
                : `${selectedSummary.studied} Studied · ${selectedSummary.notStudied} Not studied · ${selectedSummary.pending} Pending`}
            </p>
          </div>
        </div>

        {selectedTopics.length > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {selectedTopics.map((topic) => {
              const subject = subjectMap.get(topic.subjectId);
              const studyStatus = getTopicStudyStatus(topic, state.sessions, todayISO);
              const revisionStatus = getTopicRevisionStatus(
                topic.id,
                state.revisions,
                todayISO
              );
              const isStudied = studyStatus.kind === 'studied';

              return (
                <div
                  key={topic.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                      style={{ backgroundColor: subject?.color || '#6366F1' }}
                      aria-hidden="true"
                    >
                      {(subject?.name || 'S').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {topic.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        {subject?.name || 'General'}
                        {topic.notes ? ` · ${topic.notes}` : ''}
                      </p>

                      {/* Separate Study Status + Revision Status Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StudyStatusBadge status={studyStatus} showDetail />
                        <RevisionStatusBadge status={revisionStatus} />
                      </div>
                    </div>
                  </div>

                  {/* Manual Toggle + Start 90m Timer */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => startExistingTopicSession(topic.id)}
                      className="min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-500 fill-current" />
                      <span>Study ({state.settings.newTopicDurationMinutes}m)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        markTopicStudied(
                          topic.id,
                          !isStudied,
                          selectedDate <= todayISO ? selectedDate : todayISO
                        )
                      }
                      className={`min-h-[42px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
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
                          <Check className="w-4 h-4" />
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
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No topics assigned to {formatDisplayDate(selectedDate)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Add a topic with this study date or select another day above.
            </p>
          </div>
        )}
      </section>

      {/* All Scheduled Dates Quick Jump */}
      {scheduledDatesOverview.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              All Assigned Dates ({scheduledDatesOverview.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {scheduledDatesOverview.map((entry) => {
              const isSelected = entry.date === selectedDate;
              return (
                <button
                  key={entry.date}
                  type="button"
                  onClick={() => setSelectedDate(entry.date)}
                  className={`w-full min-h-[52px] px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/8'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatDisplayDate(entry.date)}
                      <span className="ml-2 text-xs font-mono font-normal text-slate-500 dark:text-slate-400 tabular-nums">
                        {entry.date}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-semibold tabular-nums">
                    {entry.studied > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {entry.studied} Studied
                      </span>
                    )}
                    {entry.notStudied > 0 && (
                      <span className="text-rose-600 dark:text-rose-400">
                        {entry.notStudied} Not studied
                      </span>
                    )}
                    {entry.pending > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {entry.pending} Pending
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
