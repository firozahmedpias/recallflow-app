import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatDisplayDate, getTodayISO } from '../utils/dates';
import {
  buildTopicExportRows,
  downloadTopicsCSV,
  downloadTopicsPDF,
  slugifyFilename,
} from '../utils/exportReports';
import { SubjectManager } from '../components/SubjectManager';

export const SubjectsScreen: React.FC = () => {
  const { state, deleteTopic, setActiveScreen } = useStudy();
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [showManager, setShowManager] = useState(() => state.subjects.length === 0);
  const [activeTabBySubject, setActiveTabBySubject] = useState<
    Record<string, 'topics' | 'sessions'>
  >({});
  const [topicFilterBySubject, setTopicFilterBySubject] = useState<
    Record<string, 'all' | 'completed'>
  >({});

  const revisionsByTopic = useMemo(() => {
    const map = new Map<string, typeof state.revisions>();
    for (const rev of state.revisions) {
      const list = map.get(rev.topicId) || [];
      list.push(rev);
      map.set(rev.topicId, list);
    }
    return map;
  }, [state.revisions]);

  const sessionsBySubject = useMemo(() => {
    const map = new Map<string, typeof state.sessions>();
    for (const sess of state.sessions) {
      if (!sess.subjectId) continue;
      const list = map.get(sess.subjectId) || [];
      list.push(sess);
      map.set(sess.subjectId, list);
    }
    return map;
  }, [state.sessions]);

  const examsBySubject = useMemo(() => {
    const map = new Map<string, typeof state.exams>();
    for (const exam of state.exams) {
      const list = map.get(exam.subjectId) || [];
      list.push(exam);
      map.set(exam.subjectId, list);
    }
    return map;
  }, [state.exams]);

  const examsByTopic = useMemo(() => {
    const map = new Map<string, typeof state.exams>();
    for (const exam of state.exams) {
      if (!exam.topicId) continue;
      const list = map.get(exam.topicId) || [];
      list.push(exam);
      map.set(exam.topicId, list);
    }
    return map;
  }, [state.exams]);

  const query = search.trim().toLowerCase();

  const subjectReports = useMemo(() => {
    return state.subjects
      .map((subject) => {
        const allTopics = state.topics
          .filter((t) => t.subjectId === subject.id)
          .sort((a, b) => b.studyDate.localeCompare(a.studyDate));

        let revisionsDone = 0;
        let revisionsPending = 0;
        let topicsCompleted = 0;

        for (const topic of allTopics) {
          const revs = revisionsByTopic.get(topic.id) || [];
          const done = revs.filter((r) => r.status === 'done').length;
          const pending = revs.length - done;
          revisionsDone += done;
          revisionsPending += pending;
          if (revs.length > 0 && pending === 0) {
            topicsCompleted += 1;
          }
        }

        const totalRevisions = revisionsDone + revisionsPending;
        const progressPct =
          totalRevisions > 0 ? Math.round((revisionsDone / totalRevisions) * 100) : 0;

        const subjectExams = examsBySubject.get(subject.id) || [];
        const avgExamPct =
          subjectExams.length > 0
            ? Math.round(
                subjectExams.reduce(
                  (sum, ex) =>
                    sum + (ex.totalMarks > 0 ? (ex.marksObtained / ex.totalMarks) * 100 : 0),
                  0
                ) / subjectExams.length
              )
            : null;

        const subjectSessions = (sessionsBySubject.get(subject.id) || []).sort((a, b) =>
          b.completedAt.localeCompare(a.completedAt)
        );
        const totalMinutes = subjectSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

        const matchingTopics = query
          ? allTopics.filter(
              (t) =>
                t.name.toLowerCase().includes(query) ||
                (t.notes || '').toLowerCase().includes(query) ||
                subject.name.toLowerCase().includes(query) ||
                (subject.code || '').toLowerCase().includes(query)
            )
          : allTopics;

        return {
          subject,
          allTopicsCount: allTopics.length,
          topicsCompleted,
          revisionsDone,
          revisionsPending,
          progressPct,
          avgExamPct,
          examCount: subjectExams.length,
          topics: matchingTopics,
          sessions: subjectSessions,
          totalMinutes,
        };
      })
      .filter(
        (entry) =>
          !query ||
          entry.topics.length > 0 ||
          entry.subject.name.toLowerCase().includes(query) ||
          (entry.subject.code || '').toLowerCase().includes(query)
      );
  }, [
    state.subjects,
    state.topics,
    revisionsByTopic,
    examsBySubject,
    sessionsBySubject,
    query,
  ]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? false),
    }));
  };

  const handleDownloadAll = (format: 'csv' | 'pdf') => {
    const { rows, summaries } = buildTopicExportRows(
      state.subjects,
      state.topics,
      state.revisions,
      state.exams
    );
    const today = getTodayISO();
    if (format === 'csv') {
      downloadTopicsCSV(`recallflow-all-subjects-${today}.csv`, rows);
    } else {
      downloadTopicsPDF(
        `recallflow-all-subjects-${today}.pdf`,
        'RecallFlow - All Subjects & Progress Report',
        summaries,
        rows
      );
    }
  };

  const handleDownloadSubject = (
    subjectId: string,
    subjectName: string,
    format: 'csv' | 'pdf'
  ) => {
    const { rows, summaries } = buildTopicExportRows(
      state.subjects,
      state.topics,
      state.revisions,
      state.exams,
      subjectId
    );
    const slug = slugifyFilename(subjectName);
    const today = getTodayISO();
    if (format === 'csv') {
      downloadTopicsCSV(`recallflow-${slug}-topics-${today}.csv`, rows);
    } else {
      downloadTopicsPDF(
        `recallflow-${slug}-topics-${today}.pdf`,
        `RecallFlow - ${subjectName} Progress Report`,
        summaries,
        rows
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Subjects &amp; Progress
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Expand any subject to inspect topics, revision status, exam averages, or download reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.subjects.length > 0 && (
            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] overflow-hidden">
              <button
                type="button"
                onClick={() => handleDownloadAll('csv')}
                className="min-h-[44px] px-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Download all subjects</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadAll('pdf')}
                className="min-h-[44px] px-3 border-l border-slate-200 dark:border-slate-700 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                aria-label="Download all subjects as PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowManager((v) => !v)}
            className={`min-h-[44px] px-4 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              showManager
                ? 'border-indigo-600 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{showManager ? 'Hide Manager' : 'Manage Subjects'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveScreen('add-topic')}
            className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Topic</span>
          </button>
        </div>
      </div>

      {/* Dedicated Subject Management Module */}
      {showManager && (
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5">
          <SubjectManager
            compact={false}
            onClose={state.subjects.length > 0 ? () => setShowManager(false) : undefined}
          />
        </section>
      )}

      {/* Search Bar */}
      {state.subjects.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects, course codes, topics, or notes..."
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] pl-10 pr-4 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Collapsible Subject Rows with Progress Report & Download Options */}
      {subjectReports.length > 0 ? (
        <div className="space-y-4">
          {subjectReports.map(
            ({
              subject,
              allTopicsCount,
              topicsCompleted,
              revisionsDone,
              revisionsPending,
              progressPct,
              avgExamPct,
              examCount,
              topics,
              sessions,
              totalMinutes,
            }) => {
              const isExpanded = query ? true : (expandedIds[subject.id] ?? false);
              const currentTab = activeTabBySubject[subject.id] || 'topics';
              const topicFilter = topicFilterBySubject[subject.id] || 'all';

              const visibleTopics =
                topicFilter === 'completed'
                  ? topics.filter((t) => {
                      const revs = revisionsByTopic.get(t.id) || [];
                      return revs.length > 0 && revs.every((r) => r.status === 'done');
                    })
                  : topics;

              return (
                <section
                  key={subject.id}
                  className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                >
                  {/* Collapsible Row Header + Progress Report */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(subject.id)}
                        aria-expanded={isExpanded}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left min-h-[44px] cursor-pointer"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: subject.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                              {subject.name}
                            </span>
                            {subject.code && (
                              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                · {subject.code}
                              </span>
                            )}
                          </div>

                          {/* Subject Progress Report Metrics */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                            <span>
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {allTopicsCount}
                              </strong>{' '}
                              {allTopicsCount === 1 ? 'topic' : 'topics'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                              ·
                            </span>
                            <span>
                              <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {topicsCompleted}
                              </strong>{' '}
                              completed
                            </span>
                            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                              ·
                            </span>
                            <span>
                              Revisions:{' '}
                              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                {revisionsDone}
                              </strong>{' '}
                              done / {revisionsPending} pending
                            </span>
                            {avgExamPct !== null && (
                              <>
                                <span
                                  className="text-slate-300 dark:text-slate-700"
                                  aria-hidden="true"
                                >
                                  ·
                                </span>
                                <span>
                                  Avg exam:{' '}
                                  <strong className="font-semibold text-indigo-600 dark:text-indigo-400">
                                    {avgExamPct}%
                                  </strong>{' '}
                                  ({examCount})
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <span className="mt-1 shrink-0 text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Progress Bar + Per-Subject Download Options */}
                    <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: subject.color,
                            }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300 shrink-0 w-10 text-right">
                          {progressPct}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadSubject(subject.id, subject.name, 'csv')}
                          className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                          aria-label={`Download topics CSV for ${subject.name}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Download topics</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSubject(subject.id, subject.name, 'pdf')}
                          className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0B1120] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                          aria-label={`Download topics PDF for ${subject.name}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details: Topics List & Study Sessions */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 dark:border-slate-800/80">
                      <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-[#0B1120]/50 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="inline-flex p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTabBySubject((prev) => ({
                                ...prev,
                                [subject.id]: 'topics',
                              }))
                            }
                            className={`min-h-[34px] px-3 rounded-md text-xs font-semibold cursor-pointer ${
                              currentTab === 'topics'
                                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            Topics ({topics.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTabBySubject((prev) => ({
                                ...prev,
                                [subject.id]: 'sessions',
                              }))
                            }
                            className={`min-h-[34px] px-3 rounded-md text-xs font-semibold cursor-pointer ${
                              currentTab === 'sessions'
                                ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            Sessions ({sessions.length} · {totalMinutes}m)
                          </button>
                        </div>

                        {currentTab === 'topics' && topics.length > 0 && (
                          <div className="inline-flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() =>
                                setTopicFilterBySubject((prev) => ({
                                  ...prev,
                                  [subject.id]: 'all',
                                }))
                              }
                              className={`min-h-[32px] px-2.5 rounded-lg font-medium cursor-pointer ${
                                topicFilter === 'all'
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTopicFilterBySubject((prev) => ({
                                  ...prev,
                                  [subject.id]: 'completed',
                                }))
                              }
                              className={`min-h-[32px] px-2.5 rounded-lg font-medium cursor-pointer ${
                                topicFilter === 'completed'
                                  ? 'bg-emerald-600 text-white'
                                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                              }`}
                            >
                              Fully Revised ({topicsCompleted})
                            </button>
                          </div>
                        )}
                      </div>

                      {currentTab === 'topics' && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {visibleTopics.length > 0 ? (
                            visibleTopics.map((topic) => {
                              const revs = (revisionsByTopic.get(topic.id) || []).sort(
                                (a, b) => a.stepDay - b.stepDay
                              );
                              const doneCount = revs.filter((r) => r.status === 'done').length;
                              const isFullyRevised =
                                revs.length > 0 && doneCount === revs.length;
                              const topicExams = (examsByTopic.get(topic.id) || []).sort((a, b) =>
                                b.date.localeCompare(a.date)
                              );
                              const latestExam = topicExams[0];
                              const latestExamPct =
                                latestExam && latestExam.totalMarks > 0
                                  ? Math.round(
                                      (latestExam.marksObtained / latestExam.totalMarks) * 100
                                    )
                                  : null;

                              return (
                                <div
                                  key={topic.id}
                                  className="px-4 py-3.5 flex items-start justify-between gap-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {topic.name}
                                      </h3>
                                      {isFullyRevised && (
                                        <CheckCircle2
                                          className="w-4 h-4 text-emerald-500 shrink-0"
                                          aria-label="All revisions done"
                                        />
                                      )}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                      <span>Studied {formatDisplayDate(topic.studyDate)}</span>
                                      <span aria-hidden="true">·</span>
                                      <span
                                        className={
                                          isFullyRevised
                                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                            : ''
                                        }
                                      >
                                        {doneCount}/{revs.length} revisions done
                                      </span>
                                      {latestExam && latestExamPct !== null && (
                                        <>
                                          <span aria-hidden="true">·</span>
                                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                                            Exam: {latestExam.marksObtained}/{latestExam.totalMarks}{' '}
                                            ({latestExamPct}%)
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    {topic.notes && (
                                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
                                        {topic.notes}
                                      </p>
                                    )}

                                    {revs.length > 0 && (
                                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
                                        {revs.map((r) => (
                                          <span
                                            key={r.id}
                                            className={
                                              r.status === 'done'
                                                ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                                : 'text-slate-400 dark:text-slate-500'
                                            }
                                          >
                                            D{r.stepDay}:{' '}
                                            {r.status === 'done'
                                              ? 'Done'
                                              : formatDisplayDate(r.dueDate)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => deleteTopic(topic.id)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer"
                                    aria-label={`Delete topic ${topic.name}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                              {topicFilter === 'completed'
                                ? `No fully revised topics under ${subject.name} yet.`
                                : `No topics logged under ${subject.name} yet.`}
                            </p>
                          )}
                        </div>
                      )}

                      {currentTab === 'sessions' && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {sessions.length > 0 ? (
                            sessions.map((sess) => (
                              <div
                                key={sess.id}
                                className="px-4 py-3 flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                      {sess.topicName ||
                                        (sess.type === 'revision'
                                          ? 'Spaced Revision Session'
                                          : 'New Topic Session')}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                      {sess.type === 'revision' ? 'Revision' : 'New Topic'} ·{' '}
                                      {formatDisplayDate(sess.date)}
                                    </p>
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-semibold tabular-nums text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {sess.durationMinutes}m
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                              No completed focus sessions categorized under {subject.name} yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            }
          )}
        </div>
      ) : (
        !showManager && (
          <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
              {query ? 'No matching subjects or topics' : 'No subjects yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {query
                ? 'Try another search term.'
                : 'Open Manage Subjects to define your academic courses and track progress.'}
            </p>
          </div>
        )
      )}
    </div>
  );
};
