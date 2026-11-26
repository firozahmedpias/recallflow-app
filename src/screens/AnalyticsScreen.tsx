import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Play } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { getLastNDaysISO, getTodayISO, getWeekStartISO } from '../utils/dates';

export const AnalyticsScreen: React.FC = () => {
  const { state, openRevisionSession, setActiveScreen } = useStudy();

  const [studyRange, setStudyRange] = useState<'daily' | 'weekly'>('daily');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [hoveredExamIndex, setHoveredExamIndex] = useState<number | null>(null);

  const todayISO = getTodayISO();

  const subjectMap = useMemo(
    () => new Map(state.subjects.map((s) => [s.id, s])),
    [state.subjects]
  );
  const topicMap = useMemo(
    () => new Map(state.topics.map((t) => [t.id, t])),
    [state.topics]
  );

  // 1. Chronological exams + marks over time + improvement trend
  const filteredExams = useMemo(() => {
    const base =
      selectedSubjectFilter === 'all'
        ? state.exams
        : state.exams.filter((e) => e.subjectId === selectedSubjectFilter);
    return [...base].sort((a, b) => a.date.localeCompare(b.date));
  }, [state.exams, selectedSubjectFilter]);

  const examStats = useMemo(() => {
    if (filteredExams.length === 0) {
      return { avgPct: null, trendDelta: null };
    }
    const pcts = filteredExams.map((e) => (e.marksObtained / e.totalMarks) * 100);
    const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);

    let trendDelta: number | null = null;
    if (pcts.length >= 2) {
      const mid = Math.floor(pcts.length / 2);
      const earlyAvg = pcts.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const recentAvg = pcts.slice(mid).reduce((a, b) => a + b, 0) / (pcts.length - mid);
      trendDelta = Math.round((recentAvg - earlyAvg) * 10) / 10;
    }

    return { avgPct, trendDelta };
  }, [filteredExams]);

  // 2. Subject-wise average
  const subjectAverages = useMemo(() => {
    const buckets = new Map<string, { totalPct: number; count: number }>();
    for (const exam of state.exams) {
      const pct = (exam.marksObtained / exam.totalMarks) * 100;
      const prev = buckets.get(exam.subjectId) || { totalPct: 0, count: 0 };
      buckets.set(exam.subjectId, {
        totalPct: prev.totalPct + pct,
        count: prev.count + 1,
      });
    }
    return Array.from(buckets.entries())
      .map(([subjectId, data]) => ({
        subject: subjectMap.get(subjectId),
        subjectId,
        avg: Math.round(data.totalPct / data.count),
        count: data.count,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [state.exams, subjectMap]);

  // 3. Weak topics (lowest scores)
  const weakTopics = useMemo(() => {
    const topicBuckets = new Map<
      string,
      { label: string; subjectName: string; color: string; totalPct: number; count: number }
    >();

    for (const exam of state.exams) {
      const pct = (exam.marksObtained / exam.totalMarks) * 100;
      const subj = subjectMap.get(exam.subjectId);
      const topic = exam.topicId ? topicMap.get(exam.topicId) : undefined;
      const key = exam.topicId || `exam_${exam.id}`;
      const label = topic ? topic.name : exam.title;
      const prev = topicBuckets.get(key);
      if (prev) {
        prev.totalPct += pct;
        prev.count += 1;
      } else {
        topicBuckets.set(key, {
          label,
          subjectName: subj?.name || 'General',
          color: subj?.color || '#6366F1',
          totalPct: pct,
          count: 1,
        });
      }
    }

    return Array.from(topicBuckets.entries())
      .map(([key, val]) => ({
        key,
        label: val.label,
        subjectName: val.subjectName,
        color: val.color,
        avg: Math.round(val.totalPct / val.count),
      }))
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 5);
  }, [state.exams, subjectMap, topicMap]);

  // 4. Study time per day (last 14d) / week (last 8w)
  const studyBars = useMemo(() => {
    if (studyRange === 'daily') {
      const days = getLastNDaysISO(14, todayISO);
      const map = new Map<string, number>();
      for (const s of state.sessions) {
        map.set(s.date, (map.get(s.date) || 0) + s.durationMinutes);
      }
      return days.map((d) => ({
        key: d,
        label: d.slice(5), // MM-DD
        minutes: map.get(d) || 0,
      }));
    } else {
      const weekMap = new Map<string, number>();
      for (const s of state.sessions) {
        const ws = getWeekStartISO(s.date);
        weekMap.set(ws, (weekMap.get(ws) || 0) + s.durationMinutes);
      }
      const weeks: string[] = [];
      const currentWeek = getWeekStartISO(todayISO);
      for (let i = 7; i >= 0; i--) {
        const d = new Date(currentWeek + 'T00:00:00');
        d.setDate(d.getDate() - i * 7);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
        weeks.push(iso);
      }
      return weeks.map((w) => ({
        key: w,
        label: w.slice(5),
        minutes: weekMap.get(w) || 0,
      }));
    }
  }, [state.sessions, studyRange, todayISO]);

  const maxStudyMinutes = Math.max(30, ...studyBars.map((b) => b.minutes));
  const totalStudyMinutes = useMemo(
    () => state.sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    [state.sessions]
  );

  // 5. Revision completion rate (due up to today OR already done)
  const revisionStats = useMemo(() => {
    const relevant = state.revisions.filter(
      (r) => r.status === 'done' || r.dueDate <= todayISO
    );
    const done = relevant.filter((r) => r.status === 'done').length;
    const rate = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : null;

    const byStep = ([1, 4, 7, 10] as const).map((step) => {
      const stepRevs = relevant.filter((r) => r.stepDay === step);
      const stepDone = stepRevs.filter((r) => r.status === 'done').length;
      return {
        step,
        total: stepRevs.length,
        done: stepDone,
        pct: stepRevs.length > 0 ? Math.round((stepDone / stepRevs.length) * 100) : 0,
      };
    });

    return { total: relevant.length, done, rate, byStep };
  }, [state.revisions, todayISO]);

  // Line chart geometry
  const chartW = 560;
  const chartH = 200;
  const padX = 36;
  const padY = 22;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const linePoints = useMemo(() => {
    if (filteredExams.length === 0) return [];
    return filteredExams.map((exam, idx) => {
      const pct = (exam.marksObtained / exam.totalMarks) * 100;
      const x =
        filteredExams.length === 1
          ? padX + plotW / 2
          : padX + (idx / (filteredExams.length - 1)) * plotW;
      const y = padY + (1 - pct / 100) * plotH;
      return { x, y, pct: Math.round(pct), exam };
    });
  }, [filteredExams, plotW, plotH]);

  const polylineStr = linePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Score trajectories, study volume, spaced revision completion, and weak areas.
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Exam Average</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {examStats.avgPct !== null ? `${examStats.avgPct}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {filteredExams.length} {filteredExams.length === 1 ? 'exam' : 'exams'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Improvement Trend</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`text-2xl font-bold tabular-nums ${
                examStats.trendDelta === null
                  ? 'text-slate-900 dark:text-slate-100'
                  : examStats.trendDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : examStats.trendDelta < 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {examStats.trendDelta !== null
                ? `${examStats.trendDelta > 0 ? '+' : ''}${examStats.trendDelta}%`
                : '—'}
            </span>
            {examStats.trendDelta !== null &&
              (examStats.trendDelta > 0 ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              ) : examStats.trendDelta < 0 ? (
                <ArrowDownRight className="w-5 h-5 text-amber-500" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              ))}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {examStats.trendDelta === null
              ? 'Need 2+ exams'
              : examStats.trendDelta > 0
                ? 'Improving'
                : examStats.trendDelta < 0
                  ? 'Needs review'
                  : 'Steady'}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Revision Completion</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {revisionStats.rate !== null ? `${revisionStats.rate}%` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {revisionStats.done}/{revisionStats.total} due completed
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Total Focus Time</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {state.sessions.length} completed sessions
          </p>
        </div>
      </div>

      {/* Marks Over Time + Study Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marks Over Time Line Graph */}
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Marks Over Time
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Percentage score progression across tests
              </p>
            </div>

            {state.subjects.length > 0 && (
              <select
                value={selectedSubjectFilter}
                onChange={(e) => {
                  setSelectedSubjectFilter(e.target.value);
                  setHoveredExamIndex(null);
                }}
                aria-label="Filter exam trend by subject"
                className="min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
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

          {linePoints.length > 0 ? (
            <div>
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-48 overflow-visible"
                role="img"
                aria-label="Marks over time line chart"
              >
                {/* Horizontal gridlines */}
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = padY + (1 - tick / 100) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padX}
                        y1={y}
                        x2={chartW - padX}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-slate-200 dark:text-slate-800"
                      />
                      <text
                        x={padX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-400 text-[10px] font-mono"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {linePoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#6366F1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineStr}
                  />
                )}

                {linePoints.map((pt, idx) => (
                  <g key={pt.exam.id}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredExamIndex === idx ? 7 : 5}
                      className="fill-indigo-500 stroke-white dark:stroke-[#111827] cursor-pointer"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredExamIndex(idx)}
                      onClick={() => setHoveredExamIndex(idx)}
                    />
                  </g>
                ))}
              </svg>

              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 tabular-nums flex items-center justify-between">
                {hoveredExamIndex !== null && linePoints[hoveredExamIndex] ? (
                  <>
                    <span className="font-semibold truncate">
                      {linePoints[hoveredExamIndex].exam.title} (
                      {linePoints[hoveredExamIndex].exam.date})
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {linePoints[hoveredExamIndex].pct}% ({linePoints[hoveredExamIndex].exam.marksObtained}/
                      {linePoints[hoveredExamIndex].exam.totalMarks})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">Tap any point to inspect score details</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No exam scores logged yet.</p>
              <button
                type="button"
                onClick={() => setActiveScreen('exams')}
                className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Add an exam result
              </button>
            </div>
          )}
        </section>

        {/* Study Time per Day / Week */}
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Study Time
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Minutes logged from completed timer sessions
              </p>
            </div>

            <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setStudyRange('daily')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  studyRange === 'daily'
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setStudyRange('weekly')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  studyRange === 'weekly'
                    ? 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          <div className="h-48 flex items-end gap-1.5 pt-4">
            {studyBars.map((bar) => {
              const heightPct = Math.round((bar.minutes / maxStudyMinutes) * 100);
              return (
                <div
                  key={bar.key}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group"
                  title={`${bar.key}: ${bar.minutes}m`}
                >
                  <span className="text-[10px] font-mono tabular-nums text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.minutes}m
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        bar.minutes > 0
                          ? 'bg-indigo-600 dark:bg-indigo-500'
                          : 'bg-slate-100 dark:bg-slate-800/80'
                      }`}
                      style={{ height: `${Math.max(4, heightPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
                    {bar.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Row: Subject Averages, Revision Breakdown, Weak Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject-Wise Average */}
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
            Subject-Wise Average
          </h2>
          {subjectAverages.length > 0 ? (
            <div className="space-y-3.5">
              {subjectAverages.map((item) => (
                <div key={item.subjectId}>
                  <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.subject?.name || 'General'}
                    </span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.avg}% ({item.count})
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.avg}%`,
                        backgroundColor: item.subject?.color || '#6366F1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record exam results to compare subject averages.
            </p>
          )}
        </section>

        {/* Revision Completion Breakdown */}
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
            Revision Rate by Interval
          </h2>
          {revisionStats.total > 0 ? (
            <div className="space-y-3.5">
              {revisionStats.byStep.map((row) => (
                <div key={row.step}>
                  <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Day {row.step} Recall
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">
                      {row.done}/{row.total} ({row.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Due revisions will appear here once your first Day 1 recall arrives.
            </p>
          )}
        </section>

        {/* Weak Topics */}
        <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Weak Topics (Lowest Scores)
            </h2>
          </div>

          {weakTopics.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {weakTopics.map((item) => (
                <div
                  key={item.key}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.subjectName} ·{' '}
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {item.avg}%
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openRevisionSession(true)}
                    className="min-h-[38px] px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Revise</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Weak topics are ranked automatically once you log exam results.
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
