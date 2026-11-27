import { RevisionSchedule, Session, Topic } from '../types/study';
import { formatDisplayDate, getTodayISO } from './dates';

export type StudyStatusKind = 'studied' | 'not_studied' | 'pending';

export interface TopicStudyStatus {
  kind: StudyStatusKind;
  label: 'Studied' | 'Not studied' | 'Pending';
  detailLabel: string;
  studiedDate?: string;
}

export interface TopicRevisionStatus {
  doneCount: number;
  totalCount: number;
  nextDueDate?: string;
  nextStepDay?: number;
  isOverdue: boolean;
  isComplete: boolean;
  label: string;
}

/**
 * Computes a topic's Study Status independently from its Spaced Revision status.
 * - "Studied": completed via 90-min timer or marked manually (studiedDate set or matching new_topic session exists)
 * - "Pending": assigned studyDate is in the future (> todayISO) and not yet studied
 * - "Not studied": assigned studyDate is today or in the past (<= todayISO) and not studied
 */
export function getTopicStudyStatus(
  topic: Topic,
  sessions: Session[],
  todayISO = getTodayISO()
): TopicStudyStatus {
  let resolvedStudiedDate: string | undefined;

  if (topic.studyOverride !== 'unstudied') {
    if (topic.studiedDate) {
      resolvedStudiedDate = topic.studiedDate;
    } else {
      const matchingStudySessions = sessions
        .filter((s) => s.topicId === topic.id && s.type === 'new_topic')
        .sort((a, b) => b.date.localeCompare(a.date));
      if (matchingStudySessions.length > 0) {
        resolvedStudiedDate = matchingStudySessions[0].date;
      }
    }
  }

  if (resolvedStudiedDate) {
    return {
      kind: 'studied',
      label: 'Studied',
      detailLabel: `Studied on ${formatDisplayDate(resolvedStudiedDate)}`,
      studiedDate: resolvedStudiedDate,
    };
  }

  if (topic.studyDate > todayISO) {
    return {
      kind: 'pending',
      label: 'Pending',
      detailLabel: 'Pending',
    };
  }

  return {
    kind: 'not_studied',
    label: 'Not studied',
    detailLabel: 'Not studied',
  };
}

/**
 * Computes a topic's Spaced Revision status summary (e.g. "2/4 revisions done, next due Nov 29").
 */
export function getTopicRevisionStatus(
  topicId: string,
  revisions: RevisionSchedule[],
  todayISO = getTodayISO()
): TopicRevisionStatus {
  const topicRevs = revisions
    .filter((r) => r.topicId === topicId)
    .sort((a, b) => a.stepDay - b.stepDay);

  const totalCount = topicRevs.length;
  const doneCount = topicRevs.filter((r) => r.status === 'done').length;

  const pendingRevs = topicRevs
    .filter((r) => r.status !== 'done')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const nextRev = pendingRevs[0];
  const isComplete = totalCount > 0 && doneCount === totalCount;
  const isOverdue = Boolean(nextRev && nextRev.dueDate < todayISO);

  let label: string;
  if (totalCount === 0) {
    label = '0/0 revisions scheduled';
  } else if (nextRev) {
    label = `${doneCount}/${totalCount} revisions done, next due ${formatDisplayDate(nextRev.dueDate)}`;
  } else {
    label = `${doneCount}/${totalCount} revisions done`;
  }

  return {
    doneCount,
    totalCount,
    nextDueDate: nextRev?.dueDate,
    nextStepDay: nextRev?.stepDay,
    isOverdue,
    isComplete,
    label,
  };
}
