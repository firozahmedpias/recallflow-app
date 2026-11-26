import React, { useState } from 'react';
import { CalendarClock, Check, RotateCcw } from 'lucide-react';
import { RevisionSchedule, Subject, Topic } from '../types/study';
import { addDaysISO, diffDaysISO, formatDisplayDate, getTodayISO } from '../utils/dates';

interface RevisionItemRowProps {
  revision: RevisionSchedule;
  topic?: Topic;
  subject?: Subject;
  doneLabel?: string;
  nextRevisionText?: string;
  onMarkDone: (id: string) => void;
  onUndoDone?: (id: string) => void;
  onSnooze: (id: string, newDueDate: string) => void;
}

export const RevisionItemRow: React.FC<RevisionItemRowProps> = ({
  revision,
  topic,
  subject,
  doneLabel = 'Done',
  nextRevisionText,
  onMarkDone,
  onUndoDone,
  onSnooze,
}) => {
  const [showSnooze, setShowSnooze] = useState(false);
  const todayISO = getTodayISO();
  const [customDate, setCustomDate] = useState(() => addDaysISO(todayISO, 1));

  if (!topic) return null;

  const isDone = revision.status === 'done';
  const daysLate = diffDaysISO(revision.dueDate, todayISO);
  const isOverdue = !isDone && daysLate > 0;

  return (
    <div className="border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/80 py-3.5 px-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        {/* Left subject monogram + topic details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
            style={{ backgroundColor: subject?.color || '#6366F1' }}
            aria-hidden="true"
          >
            {(subject?.name || 'S').slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className={`text-sm font-semibold leading-snug ${
                isDone
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {topic.name}
            </h4>

            {/* Clean unboxed metadata with typographic separators */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="truncate max-w-[140px]">{subject?.name || 'General'}</span>
              <span aria-hidden="true">·</span>
              <span>Day {revision.stepDay} recall</span>
              <span aria-hidden="true">·</span>
              {isDone ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {nextRevisionText || 'Completed'}
                </span>
              ) : isOverdue ? (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Overdue {daysLate}d
                </span>
              ) : (
                <span>Due {formatDisplayDate(revision.dueDate)}</span>
              )}
            </div>

            {topic.notes && !isDone && (
              <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {topic.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right touch-friendly action controls (>= 44px) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isDone ? (
            onUndoDone && (
              <button
                type="button"
                onClick={() => onUndoDone(revision.id)}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                aria-label={`Undo completion for ${topic.name}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowSnooze((v) => !v)}
                className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                  showSnooze
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label={`Snooze or reschedule ${topic.name}`}
                aria-expanded={showSnooze}
              >
                <CalendarClock className="w-4 h-4" />
                <span className="hidden sm:inline">Snooze</span>
              </button>

              <button
                type="button"
                onClick={() => onMarkDone(revision.id)}
                className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap cursor-pointer"
                aria-label={`Mark ${topic.name} as ${doneLabel}`}
              >
                <Check className="w-4 h-4" />
                <span>{doneLabel}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Reschedule / Snooze Drawer */}
      {showSnooze && !isDone && (
        <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            Reschedule:
          </span>
          {[1, 2, 4].map((offset) => {
            const target = addDaysISO(todayISO, offset);
            return (
              <button
                key={offset}
                type="button"
                onClick={() => {
                  onSnooze(revision.id, target);
                  setShowSnooze(false);
                }}
                className="min-h-[36px] px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/15 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                +{offset}d
              </button>
            );
          })}
          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="date"
              value={customDate}
              min={todayISO}
              onChange={(e) => setCustomDate(e.target.value)}
              className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-800 dark:text-slate-200"
              aria-label="Custom reschedule date"
            />
            <button
              type="button"
              onClick={() => {
                if (customDate) {
                  onSnooze(revision.id, customDate);
                  setShowSnooze(false);
                }
              }}
              className="min-h-[36px] px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
            >
              Set
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
