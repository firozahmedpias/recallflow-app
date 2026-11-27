import React from 'react';
import { AlertCircle, CalendarClock, CheckCheck, CheckCircle2, Clock, RotateCw } from 'lucide-react';
import { TopicRevisionStatus, TopicStudyStatus } from '../utils/studyStatus';
import { getTodayISO } from '../utils/dates';

interface StudyStatusBadgeProps {
  status: TopicStudyStatus;
  showDetail?: boolean;
}

export const StudyStatusBadge: React.FC<StudyStatusBadgeProps> = ({
  status,
  showDetail = true,
}) => {
  const text = showDetail ? status.detailLabel : status.label;

  if (status.kind === 'studied') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 tabular-nums">
        <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </span>
    );
  }

  if (status.kind === 'not_studied') {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 tabular-nums">
        <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-400/30 tabular-nums">
      <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
};

interface RevisionStatusBadgeProps {
  status: TopicRevisionStatus;
}

export const RevisionStatusBadge: React.FC<RevisionStatusBadgeProps> = ({ status }) => {
  const todayISO = getTodayISO();

  if (status.isComplete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 tabular-nums">
        <CheckCheck className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{status.label}</span>
      </span>
    );
  }

  if (status.nextDueDate && status.nextDueDate <= todayISO) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 tabular-nums">
        <RotateCw className="w-3 h-3 shrink-0" aria-hidden="true" />
        <span>{status.label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 tabular-nums">
      <CalendarClock className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{status.label}</span>
    </span>
  );
};
