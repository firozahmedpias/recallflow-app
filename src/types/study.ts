export type RevisionStatus = 'pending' | 'done' | 'snoozed';

export type SessionType = 'revision' | 'new_topic';

export type ThemeMode = 'dark' | 'light';

export type ScreenId =
  | 'today'
  | 'study-plan'
  | 'add-topic'
  | 'timer'
  | 'subjects'
  | 'goals'
  | 'exams'
  | 'analytics'
  | 'settings';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  color: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  studyDate: string; // YYYY-MM-DD (local calendar date assigned to this topic)
  studiedDate?: string; // YYYY-MM-DD when the study session was completed
  studyOverride?: 'unstudied'; // Set if user manually unmarked a topic that had a logged session
  notes?: string;
  createdAt: string;
}

export interface RevisionSchedule {
  id: string;
  topicId: string;
  subjectId: string;
  stepDay: 1 | 4 | 7 | 10;
  dueDate: string; // YYYY-MM-DD
  status: RevisionStatus;
  completedAt?: string;
  snoozedUntil?: string;
}

export interface Session {
  id: string;
  type: SessionType;
  topicId?: string;
  topicName?: string;
  subjectId?: string;
  durationMinutes: number;
  plannedMinutes: number;
  date: string; // YYYY-MM-DD
  completedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  targetDays: number;
  startDate: string; // YYYY-MM-DD
  active: boolean;
}

export interface Reward {
  id: string;
  milestoneDays: number;
  milestoneType: '7d' | '30d' | 'goal';
  title: string;
  unlockedAt?: string;
  claimedAt?: string;
}

export interface ExamResult {
  id: string;
  subjectId: string;
  topicId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  marksObtained: number;
  totalMarks: number;
  notes?: string;
}

export interface AppSettings {
  revisionDurationMinutes: number;
  newTopicDurationMinutes: number;
  breakDurationMinutes: number;
  soundEnabled: boolean;
  breakPromptsEnabled: boolean;
  notificationsEnabled: boolean;
  theme: ThemeMode;
}

export interface AppState {
  subjects: Subject[];
  topics: Topic[];
  revisions: RevisionSchedule[];
  sessions: Session[];
  goal: Goal;
  rewards: Reward[];
  exams: ExamResult[];
  settings: AppSettings;
}

export interface StudyProfile {
  id: string;
  name: string;
  subtitle?: string;
  avatarColor: string;
  createdAt: string;
}

export interface WorkspaceStore {
  activeProfileId: string;
  profiles: StudyProfile[];
  workspaces: Record<string, AppState>;
}

export const SUBJECT_COLORS = [
  '#6366F1', // Indigo
  '#0EA5E9', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Rose
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
] as const;
