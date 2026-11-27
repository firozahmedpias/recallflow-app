import { Session, Topic } from '../types/study';
import { addDaysISO, getTodayISO } from './dates';

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  studiedToday: boolean;
  activityByDate: Record<string, { topics: number; sessions: number; totalMinutes: number }>;
}

/**
 * A day counts toward the study streak when the user logs at least 1 topic
 * OR completes at least 1 study/revision session on that day.
 */
export function calculateStreaks(
  topics: Topic[],
  sessions: Session[],
  todayISO = getTodayISO()
): StreakSummary {
  const activityByDate: Record<string, { topics: number; sessions: number; totalMinutes: number }> = {};

  for (const topic of topics) {
    if (topic.studyDate <= todayISO) {
      if (!activityByDate[topic.studyDate]) {
        activityByDate[topic.studyDate] = { topics: 0, sessions: 0, totalMinutes: 0 };
      }
      activityByDate[topic.studyDate].topics += 1;
    }
    if (topic.studiedDate && topic.studiedDate <= todayISO && topic.studiedDate !== topic.studyDate) {
      if (!activityByDate[topic.studiedDate]) {
        activityByDate[topic.studiedDate] = { topics: 0, sessions: 0, totalMinutes: 0 };
      }
      activityByDate[topic.studiedDate].topics += 1;
    }
  }

  for (const session of sessions) {
    if (!activityByDate[session.date]) {
      activityByDate[session.date] = { topics: 0, sessions: 0, totalMinutes: 0 };
    }
    activityByDate[session.date].sessions += 1;
    activityByDate[session.date].totalMinutes += session.durationMinutes;
  }

  const activeDates = Object.keys(activityByDate).sort();
  const activeSet = new Set(activeDates);
  const studiedToday = activeSet.has(todayISO);

  // Current streak: start from today if active, otherwise from yesterday
  // so the user doesn't see 0 before completing today's study.
  let currentStreak = 0;
  let cursor = studiedToday ? todayISO : addDaysISO(todayISO, -1);
  while (activeSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysISO(cursor, -1);
  }

  // Longest streak across all recorded dates
  let longestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const date of activeDates) {
    if (prevDate && addDaysISO(prevDate, 1) === date) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevDate = date;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    totalStudyDays: activeDates.length,
    studiedToday,
    activityByDate,
  };
}
