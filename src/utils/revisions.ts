import { RevisionSchedule } from '../types/study';
import { addDaysISO, getTodayISO } from './dates';

export const REVISION_INTERVALS = [1, 4, 7, 10] as const;

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Auto-schedules spaced revisions on Day 1, Day 4, Day 7, and Day 10
 * after the topic's studyDate.
 */
export function createRevisionSchedulesForTopic(
  topicId: string,
  subjectId: string,
  studyDate: string
): RevisionSchedule[] {
  return REVISION_INTERVALS.map((stepDay) => ({
    id: generateId('rev'),
    topicId,
    subjectId,
    stepDay,
    dueDate: addDaysISO(studyDate, stepDay),
    status: 'pending',
  }));
}

export function getOverdueRevisions(
  revisions: RevisionSchedule[],
  todayISO = getTodayISO()
): RevisionSchedule[] {
  return revisions
    .filter((r) => r.status !== 'done' && r.dueDate < todayISO)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getDueTodayRevisions(
  revisions: RevisionSchedule[],
  todayISO = getTodayISO()
): RevisionSchedule[] {
  return revisions
    .filter((r) => r.status !== 'done' && r.dueDate === todayISO)
    .sort((a, b) => a.stepDay - b.stepDay);
}

export function getCompletedTodayRevisions(
  revisions: RevisionSchedule[],
  todayISO = getTodayISO()
): RevisionSchedule[] {
  return revisions.filter((r) => {
    if (r.status !== 'done' || !r.completedAt) return false;
    const completedLocal = r.completedAt.slice(0, 10);
    return completedLocal === todayISO;
  });
}

export function getUpcomingRevisions(
  revisions: RevisionSchedule[],
  todayISO = getTodayISO()
): RevisionSchedule[] {
  return revisions
    .filter((r) => r.status !== 'done' && r.dueDate > todayISO)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
