import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSettings,
  AppState,
  ExamResult,
  Goal,
  Reward,
  ScreenId,
  Session,
  SessionType,
  StudyProfile,
  SUBJECT_COLORS,
  Subject,
  Topic,
  WorkspaceStore,
} from '../types/study';
import {
  createDefaultProfile,
  createDefaultState,
  createDefaultWorkspaceStore,
  loadWorkspaceStore,
  mergeWithDefaults,
  saveWorkspaceStore,
} from '../db/storage';
import { addDaysISO, formatDisplayDate, getTodayISO } from '../utils/dates';
import {
  createRevisionSchedulesForTopic,
  generateId,
  REVISION_INTERVALS,
} from '../utils/revisions';
import { calculateStreaks, StreakSummary } from '../utils/streaks';
import { playCompletionChime } from '../utils/audio';
import { triggerMilestoneConfetti } from '../utils/confetti';
import { notifyDueRevisionsIfNeeded } from '../utils/notifications';

export type TimerPhase = 'idle' | 'running' | 'paused' | 'break_prompt' | 'break_running' | 'break_paused';

export interface ActiveTimerState {
  mode: SessionType;
  phase: TimerPhase;
  plannedMinutes: number;
  remainingSeconds: number;
  endTimeMs: number | null;
  topicId?: string;
  topicName?: string;
  subjectId?: string;
  logTopicOnComplete?: boolean;
  topicNotes?: string;
}

interface StudyContextValue {
  state: AppState;
  profiles: StudyProfile[];
  activeProfile: StudyProfile;
  workspaces: Record<string, AppState>;
  isHydrated: boolean;
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  streaks: StreakSummary;
  timer: ActiveTimerState;
  toastMessage: string | null;
  dismissToast: () => void;
  newlyUnlockedReward: Reward | null;
  dismissRewardBanner: () => void;

  // Profile & Workplace management
  createProfile: (input: { name: string; subtitle?: string; avatarColor?: string }) => StudyProfile;
  updateProfile: (
    profileId: string,
    updates: Partial<Pick<StudyProfile, 'name' | 'subtitle' | 'avatarColor'>>
  ) => void;
  switchProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;

  // Subjects & Topics
  addSubject: (name: string, color?: string, code?: string) => Subject;
  updateSubject: (
    subjectId: string,
    updates: Partial<Pick<Subject, 'name' | 'color' | 'code'>>
  ) => void;
  deleteSubject: (subjectId: string) => void;
  addTopic: (input: {
    subjectId: string;
    name: string;
    studyDate: string;
    notes?: string;
  }) => Topic;
  deleteTopic: (topicId: string) => void;

  // Revisions
  markRevisionDone: (revisionId: string) => void;
  undoRevisionDone: (revisionId: string) => void;
  snoozeRevision: (revisionId: string, newDueDate: string) => void;

  // Timer actions
  openRevisionSession: (autoStart?: boolean, subjectId?: string) => void;
  openNewTopicSession: () => void;
  startNewTopicSession: (input: {
    subjectId: string;
    topicName: string;
    notes?: string;
    logTopicOnComplete: boolean;
  }) => void;
  startRevisionTimer: (subjectId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  completeTimerEarly: () => void;
  startBreakTimer: () => void;
  skipBreak: () => void;

  // Goals & Rewards
  updateGoal: (updates: Partial<Pick<Goal, 'title' | 'targetDays' | 'startDate'>>) => void;
  updateRewardTitle: (rewardId: string, title: string) => void;
  claimReward: (rewardId: string) => void;

  // Exams
  addExamResult: (input: Omit<ExamResult, 'id'>) => ExamResult;
  deleteExamResult: (examId: string) => void;

  // Settings & Data
  updateSettings: (updates: Partial<AppSettings>) => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonText: string) => boolean;
  resetAllData: () => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<WorkspaceStore>(() => createDefaultWorkspaceStore());
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeScreen, setActiveScreen] = useState<ScreenId>('today');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newlyUnlockedReward, setNewlyUnlockedReward] = useState<Reward | null>(null);

  const [timer, setTimer] = useState<ActiveTimerState>({
    mode: 'revision',
    phase: 'idle',
    plannedMinutes: 30,
    remainingSeconds: 30 * 60,
    endTimeMs: null,
  });

  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const dismissRewardBanner = useCallback(() => {
    setNewlyUnlockedReward(null);
  }, []);

  const activeProfile = useMemo(() => {
    return (
      store.profiles.find((p) => p.id === store.activeProfileId) ||
      store.profiles[0] ||
      createDefaultProfile()
    );
  }, [store.profiles, store.activeProfileId]);

  const state = useMemo(() => {
    return store.workspaces[activeProfile.id] || createDefaultState();
  }, [store.workspaces, activeProfile.id]);

  // Helper to update ONLY the currently active profile's isolated workspace
  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStore((prevStore) => {
      const currentProfileId = prevStore.activeProfileId;
      const currentState = prevStore.workspaces[currentProfileId] || createDefaultState();
      const nextState = updater(currentState);
      if (nextState === currentState) return prevStore;
      return {
        ...prevStore,
        workspaces: {
          ...prevStore.workspaces,
          [currentProfileId]: nextState,
        },
      };
    });
  }, []);

  // Hydrate multi-profile workspace store on mount
  useEffect(() => {
    let mounted = true;
    loadWorkspaceStore().then((loadedStore) => {
      if (!mounted) return;
      setStore(loadedStore);
      const activeWs =
        loadedStore.workspaces[loadedStore.activeProfileId] || createDefaultState();
      setTimer((prev) => ({
        ...prev,
        plannedMinutes:
          prev.mode === 'revision'
            ? activeWs.settings.revisionDurationMinutes
            : activeWs.settings.newTopicDurationMinutes,
        remainingSeconds:
          prev.phase === 'idle'
            ? (prev.mode === 'revision'
                ? activeWs.settings.revisionDurationMinutes
                : activeWs.settings.newTopicDurationMinutes) * 60
            : prev.remainingSeconds,
      }));
      setIsHydrated(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist to IndexedDB & localStorage whenever store changes after hydration
  useEffect(() => {
    if (!isHydrated) return;
    saveWorkspaceStore(store);
  }, [store, isHydrated]);

  // Apply light/dark theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (state.settings.theme === 'dark') {
      root.classList.add('dark');
      themeMeta?.setAttribute('content', '#090D16');
    } else {
      root.classList.remove('dark');
      themeMeta?.setAttribute('content', '#F8FAFC');
    }
  }, [state.settings.theme]);

  const streaks = useMemo(
    () => calculateStreaks(state.topics, state.sessions),
    [state.topics, state.sessions]
  );

  // Sync reward unlocks when streaks progress
  useEffect(() => {
    if (!isHydrated) return;

    const bestStreak = Math.max(streaks.currentStreak, streaks.longestStreak);
    let unlockedNow: Reward | null = null;

    setState((prev) => {
      let changed = false;
      const nextRewards = prev.rewards.map((reward) => {
        const effectiveTarget =
          reward.milestoneType === 'goal' ? prev.goal.targetDays : reward.milestoneDays;

        if (reward.milestoneDays !== effectiveTarget) {
          changed = true;
        }

        if (!reward.unlockedAt && bestStreak >= effectiveTarget) {
          changed = true;
          const updated: Reward = {
            ...reward,
            milestoneDays: effectiveTarget,
            unlockedAt: new Date().toISOString(),
          };
          unlockedNow = updated;
          return updated;
        }

        return reward.milestoneDays !== effectiveTarget
          ? { ...reward, milestoneDays: effectiveTarget }
          : reward;
      });

      return changed ? { ...prev, rewards: nextRewards } : prev;
    });

    if (unlockedNow) {
      setNewlyUnlockedReward(unlockedNow);
      triggerMilestoneConfetti();
    }
  }, [streaks.currentStreak, streaks.longestStreak, isHydrated, state.goal.targetDays, setState]);

  // Check browser notifications once per day when enabled
  useEffect(() => {
    if (!isHydrated || !state.settings.notificationsEnabled) return;
    const todayISO = getTodayISO();
    const dueCount = state.revisions.filter(
      (r) => r.status !== 'done' && r.dueDate === todayISO
    ).length;
    const overdueCount = state.revisions.filter(
      (r) => r.status !== 'done' && r.dueDate < todayISO
    ).length;
    notifyDueRevisionsIfNeeded(dueCount, overdueCount, todayISO);
  }, [isHydrated, state.settings.notificationsEnabled, state.revisions]);

  // --- Profile & Separate Workplace Actions ---
  const createProfile = useCallback(
    (input: { name: string; subtitle?: string; avatarColor?: string }): StudyProfile => {
      const id = generateId('prof');
      const profile = createDefaultProfile(
        id,
        input.name.trim() || 'New Profile',
        input.subtitle?.trim() || undefined,
        input.avatarColor || SUBJECT_COLORS[store.profiles.length % SUBJECT_COLORS.length]
      );
      const freshWorkspace = createDefaultState();
      freshWorkspace.settings.theme = state.settings.theme;

      setStore((prev) => ({
        activeProfileId: profile.id,
        profiles: [...prev.profiles, profile],
        workspaces: {
          ...prev.workspaces,
          [profile.id]: freshWorkspace,
        },
      }));

      setTimer({
        mode: 'revision',
        phase: 'idle',
        plannedMinutes: freshWorkspace.settings.revisionDurationMinutes,
        remainingSeconds: freshWorkspace.settings.revisionDurationMinutes * 60,
        endTimeMs: null,
      });
      setNewlyUnlockedReward(null);
      showToast(`Switched to "${profile.name}" workplace`);
      return profile;
    },
    [store.profiles.length, state.settings.theme, showToast]
  );

  const updateProfile = useCallback(
    (
      profileId: string,
      updates: Partial<Pick<StudyProfile, 'name' | 'subtitle' | 'avatarColor'>>
    ) => {
      setStore((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === profileId
            ? {
                ...p,
                name: updates.name !== undefined ? updates.name.trim() || p.name : p.name,
                subtitle:
                  updates.subtitle !== undefined
                    ? updates.subtitle.trim() || undefined
                    : p.subtitle,
                avatarColor: updates.avatarColor || p.avatarColor,
              }
            : p
        ),
      }));
      showToast('Profile updated');
    },
    [showToast]
  );

  const switchProfile = useCallback(
    (profileId: string) => {
      const targetProfile = store.profiles.find((p) => p.id === profileId);
      if (!targetProfile || profileId === store.activeProfileId) return;

      const targetWorkspace = store.workspaces[profileId] || createDefaultState();
      setStore((prev) => ({
        ...prev,
        activeProfileId: profileId,
      }));
      setTimer({
        mode: 'revision',
        phase: 'idle',
        plannedMinutes: targetWorkspace.settings.revisionDurationMinutes,
        remainingSeconds: targetWorkspace.settings.revisionDurationMinutes * 60,
        endTimeMs: null,
      });
      setNewlyUnlockedReward(null);
      showToast(`Switched to ${targetProfile.name}`);
    },
    [store.profiles, store.activeProfileId, store.workspaces, showToast]
  );

  const deleteProfile = useCallback(
    (profileId: string) => {
      if (store.profiles.length <= 1) return;
      const remaining = store.profiles.filter((p) => p.id !== profileId);
      const nextActiveId =
        store.activeProfileId === profileId ? remaining[0].id : store.activeProfileId;
      const nextWorkspace = store.workspaces[nextActiveId] || createDefaultState();

      setStore((prev) => {
        const nextWorkspaces = { ...prev.workspaces };
        delete nextWorkspaces[profileId];
        return {
          activeProfileId: nextActiveId,
          profiles: remaining,
          workspaces: nextWorkspaces,
        };
      });

      if (store.activeProfileId === profileId) {
        setTimer({
          mode: 'revision',
          phase: 'idle',
          plannedMinutes: nextWorkspace.settings.revisionDurationMinutes,
          remainingSeconds: nextWorkspace.settings.revisionDurationMinutes * 60,
          endTimeMs: null,
        });
        setNewlyUnlockedReward(null);
      }
      showToast('Profile deleted');
    },
    [store.profiles, store.activeProfileId, store.workspaces, showToast]
  );

  // Log completed study session helper
  const recordCompletedSession = useCallback(
    (completedTimer: ActiveTimerState, actualMinutes?: number) => {
      const todayISO = getTodayISO();
      const durationMinutes = Math.max(
        1,
        actualMinutes ?? completedTimer.plannedMinutes
      );

      setState((prev) => {
        let nextTopics = prev.topics;
        let nextRevisions = prev.revisions;
        let resolvedTopicId = completedTimer.topicId;

        if (
          completedTimer.mode === 'new_topic' &&
          completedTimer.logTopicOnComplete &&
          completedTimer.topicName?.trim() &&
          completedTimer.subjectId
        ) {
          const newTopic: Topic = {
            id: generateId('topic'),
            subjectId: completedTimer.subjectId,
            name: completedTimer.topicName.trim(),
            studyDate: todayISO,
            notes: completedTimer.topicNotes?.trim() || undefined,
            createdAt: new Date().toISOString(),
          };
          resolvedTopicId = newTopic.id;
          nextTopics = [newTopic, ...prev.topics];
          nextRevisions = [
            ...createRevisionSchedulesForTopic(newTopic.id, newTopic.subjectId, todayISO),
            ...prev.revisions,
          ];
        }

        const newSession: Session = {
          id: generateId('sess'),
          type: completedTimer.mode,
          topicId: resolvedTopicId,
          topicName: completedTimer.topicName,
          subjectId: completedTimer.subjectId,
          durationMinutes,
          plannedMinutes: completedTimer.plannedMinutes,
          date: todayISO,
          completedAt: new Date().toISOString(),
        };

        return {
          ...prev,
          topics: nextTopics,
          revisions: nextRevisions,
          sessions: [newSession, ...prev.sessions],
        };
      });
    },
    [setState]
  );

  // Wall-clock accurate timer tick loop
  useEffect(() => {
    if (timer.phase !== 'running' && timer.phase !== 'break_running') {
      return;
    }

    const interval = window.setInterval(() => {
      setTimer((prev) => {
        if ((prev.phase !== 'running' && prev.phase !== 'break_running') || !prev.endTimeMs) {
          return prev;
        }
        const remaining = Math.max(0, Math.ceil((prev.endTimeMs - Date.now()) / 1000));

        if (remaining <= 0) {
          if (prev.phase === 'running') {
            if (state.settings.soundEnabled) {
              playCompletionChime('session');
            }
            recordCompletedSession(prev);
            showToast('Study session completed and logged');

            if (state.settings.breakPromptsEnabled) {
              return {
                ...prev,
                phase: 'break_prompt',
                remainingSeconds: state.settings.breakDurationMinutes * 60,
                endTimeMs: null,
              };
            }
            return {
              ...prev,
              phase: 'idle',
              remainingSeconds: prev.plannedMinutes * 60,
              endTimeMs: null,
            };
          } else {
            if (state.settings.soundEnabled) {
              playCompletionChime('break');
            }
            showToast('Break complete — ready when you are');
            const defaultMins =
              prev.mode === 'revision'
                ? state.settings.revisionDurationMinutes
                : state.settings.newTopicDurationMinutes;
            return {
              ...prev,
              phase: 'idle',
              plannedMinutes: defaultMins,
              remainingSeconds: defaultMins * 60,
              endTimeMs: null,
            };
          }
        }

        return remaining === prev.remainingSeconds
          ? prev
          : { ...prev, remainingSeconds: remaining };
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, [
    timer.phase,
    state.settings.soundEnabled,
    state.settings.breakPromptsEnabled,
    state.settings.breakDurationMinutes,
    state.settings.revisionDurationMinutes,
    state.settings.newTopicDurationMinutes,
    recordCompletedSession,
    showToast,
  ]);

  // --- Subjects & Topics ---
  const addSubject = useCallback(
    (name: string, color?: string, code?: string): Subject => {
      const trimmed = name.trim();
      const chosenColor =
        color || SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)];
      const subject: Subject = {
        id: generateId('subj'),
        name: trimmed,
        code: code?.trim() || undefined,
        color: chosenColor,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        subjects: [...prev.subjects, subject],
      }));
      showToast(`Added subject "${trimmed}"`);
      return subject;
    },
    [setState, showToast]
  );

  const updateSubject = useCallback(
    (
      subjectId: string,
      updates: Partial<Pick<Subject, 'name' | 'color' | 'code'>>
    ) => {
      setState((prev) => ({
        ...prev,
        subjects: prev.subjects.map((s) =>
          s.id === subjectId
            ? {
                ...s,
                name: updates.name !== undefined ? updates.name.trim() || s.name : s.name,
                color: updates.color !== undefined ? updates.color : s.color,
                code: updates.code !== undefined ? updates.code.trim() || undefined : s.code,
              }
            : s
        ),
      }));
      showToast('Subject updated');
    },
    [setState, showToast]
  );

  const deleteSubject = useCallback(
    (subjectId: string) => {
      setState((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== subjectId),
        topics: prev.topics.filter((t) => t.subjectId !== subjectId),
        revisions: prev.revisions.filter((r) => r.subjectId !== subjectId),
        sessions: prev.sessions.map((sess) =>
          sess.subjectId === subjectId ? { ...sess, subjectId: undefined } : sess
        ),
        exams: prev.exams.filter((e) => e.subjectId !== subjectId),
      }));
      showToast('Subject removed');
    },
    [setState, showToast]
  );

  const addTopic = useCallback(
    (input: { subjectId: string; name: string; studyDate: string; notes?: string }): Topic => {
      const topic: Topic = {
        id: generateId('topic'),
        subjectId: input.subjectId,
        name: input.name.trim(),
        studyDate: input.studyDate,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      const newRevisions = createRevisionSchedulesForTopic(
        topic.id,
        topic.subjectId,
        topic.studyDate
      );
      setState((prev) => ({
        ...prev,
        topics: [topic, ...prev.topics],
        revisions: [...newRevisions, ...prev.revisions],
      }));
      showToast('Topic logged + 4 revisions scheduled (Day 1, 4, 7, 10)');
      return topic;
    },
    [setState, showToast]
  );

  const deleteTopic = useCallback(
    (topicId: string) => {
      setState((prev) => ({
        ...prev,
        topics: prev.topics.filter((t) => t.id !== topicId),
        revisions: prev.revisions.filter((r) => r.topicId !== topicId),
      }));
      showToast('Topic deleted');
    },
    [setState, showToast]
  );

  // --- Revisions ---
  const markRevisionDone = useCallback(
    (revisionId: string) => {
      const now = new Date().toISOString();
      const todayISO = getTodayISO();

      const target = state.revisions.find((r) => r.id === revisionId);
      let toastText = 'Marked Revised';

      if (target) {
        const currentIdx = REVISION_INTERVALS.indexOf(target.stepDay);
        if (currentIdx !== -1 && currentIdx < REVISION_INTERVALS.length - 1) {
          const nextStepDay = REVISION_INTERVALS[currentIdx + 1];
          const existingNext = state.revisions.find(
            (r) => r.topicId === target.topicId && r.stepDay === nextStepDay
          );
          const computedNextDue = addDaysISO(todayISO, nextStepDay - target.stepDay);
          const resolvedDue =
            existingNext && existingNext.status !== 'done' && existingNext.dueDate > todayISO
              ? existingNext.dueDate
              : existingNext && existingNext.status === 'done'
                ? null
                : computedNextDue;

          if (resolvedDue) {
            toastText = `Marked Revised · Next revision: ${formatDisplayDate(resolvedDue)} (Day ${nextStepDay})`;
          }
        } else {
          toastText = 'Marked Revised · All 4 revisions completed!';
        }
      }

      setState((prev) => {
        const current = prev.revisions.find((r) => r.id === revisionId);
        if (!current) return prev;

        const currentIdx = REVISION_INTERVALS.indexOf(current.stepDay);
        const topicRevs = prev.revisions.filter((r) => r.topicId === current.topicId);

        let updatedRevs = prev.revisions.map((r) =>
          r.id === revisionId ? { ...r, status: 'done' as const, completedAt: now } : r
        );

        if (currentIdx !== -1 && currentIdx < REVISION_INTERVALS.length - 1) {
          const nextStepDay = REVISION_INTERVALS[currentIdx + 1];
          const existingNext = topicRevs.find((r) => r.stepDay === nextStepDay);

          if (!existingNext) {
            // Auto-create next Day 1, 4, 7, 10 step if missing
            const newSchedule = {
              id: generateId('rev'),
              topicId: current.topicId,
              subjectId: current.subjectId,
              stepDay: nextStepDay,
              dueDate: addDaysISO(todayISO, nextStepDay - current.stepDay),
              status: 'pending' as const,
            };
            updatedRevs = [newSchedule, ...updatedRevs];
          } else if (existingNext.status !== 'done' && existingNext.dueDate <= todayISO) {
            // Reschedule remaining Day 1/4/7/10 steps relative to today when catching up on overdue work
            updatedRevs = updatedRevs.map((r) => {
              if (
                r.topicId === current.topicId &&
                r.stepDay > current.stepDay &&
                r.status !== 'done'
              ) {
                const candidateDue = addDaysISO(todayISO, r.stepDay - current.stepDay);
                return r.dueDate <= candidateDue
                  ? { ...r, status: 'pending' as const, dueDate: candidateDue }
                  : r;
              }
              return r;
            });
          }
        }

        return {
          ...prev,
          revisions: updatedRevs,
        };
      });
      showToast(toastText);
    },
    [state.revisions, setState, showToast]
  );

  const undoRevisionDone = useCallback(
    (revisionId: string) => {
      setState((prev) => ({
        ...prev,
        revisions: prev.revisions.map((r) =>
          r.id === revisionId ? { ...r, status: 'pending', completedAt: undefined } : r
        ),
      }));
    },
    [setState]
  );

  const snoozeRevision = useCallback(
    (revisionId: string, newDueDate: string) => {
      setState((prev) => ({
        ...prev,
        revisions: prev.revisions.map((r) =>
          r.id === revisionId
            ? {
                ...r,
                status: 'snoozed',
                dueDate: newDueDate,
                snoozedUntil: newDueDate,
              }
            : r
        ),
      }));
      showToast(`Rescheduled to ${newDueDate}`);
    },
    [setState, showToast]
  );

  // --- Timer Controls ---
  const openRevisionSession = useCallback(
    (autoStart = false, subjectId?: string) => {
      const mins = state.settings.revisionDurationMinutes;
      setTimer({
        mode: 'revision',
        phase: autoStart ? 'running' : 'idle',
        plannedMinutes: mins,
        remainingSeconds: mins * 60,
        endTimeMs: autoStart ? Date.now() + mins * 60 * 1000 : null,
        subjectId: subjectId || undefined,
      });
      setActiveScreen('timer');
    },
    [state.settings.revisionDurationMinutes]
  );

  const openNewTopicSession = useCallback(() => {
    const mins = state.settings.newTopicDurationMinutes;
    setTimer({
      mode: 'new_topic',
      phase: 'idle',
      plannedMinutes: mins,
      remainingSeconds: mins * 60,
      endTimeMs: null,
      logTopicOnComplete: true,
    });
    setActiveScreen('timer');
  }, [state.settings.newTopicDurationMinutes]);

  const startRevisionTimer = useCallback(
    (subjectId?: string) => {
      const mins = state.settings.revisionDurationMinutes;
      setTimer({
        mode: 'revision',
        phase: 'running',
        plannedMinutes: mins,
        remainingSeconds: mins * 60,
        endTimeMs: Date.now() + mins * 60 * 1000,
        subjectId: subjectId || undefined,
      });
    },
    [state.settings.revisionDurationMinutes]
  );

  const startNewTopicSession = useCallback(
    (input: {
      subjectId: string;
      topicName: string;
      notes?: string;
      logTopicOnComplete: boolean;
    }) => {
      const mins = state.settings.newTopicDurationMinutes;
      setTimer({
        mode: 'new_topic',
        phase: 'running',
        plannedMinutes: mins,
        remainingSeconds: mins * 60,
        endTimeMs: Date.now() + mins * 60 * 1000,
        subjectId: input.subjectId,
        topicName: input.topicName.trim(),
        topicNotes: input.notes,
        logTopicOnComplete: input.logTopicOnComplete,
      });
    },
    [state.settings.newTopicDurationMinutes]
  );

  const pauseTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.phase !== 'running' && prev.phase !== 'break_running') return prev;
      const remaining = prev.endTimeMs
        ? Math.max(0, Math.ceil((prev.endTimeMs - Date.now()) / 1000))
        : prev.remainingSeconds;
      return {
        ...prev,
        phase: prev.phase === 'running' ? 'paused' : 'break_paused',
        remainingSeconds: remaining,
        endTimeMs: null,
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    setTimer((prev) => {
      if (prev.phase !== 'paused' && prev.phase !== 'break_paused') return prev;
      return {
        ...prev,
        phase: prev.phase === 'paused' ? 'running' : 'break_running',
        endTimeMs: Date.now() + prev.remainingSeconds * 1000,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setTimer((prev) => {
      const mins =
        prev.mode === 'revision'
          ? state.settings.revisionDurationMinutes
          : state.settings.newTopicDurationMinutes;
      return {
        ...prev,
        phase: 'idle',
        plannedMinutes: mins,
        remainingSeconds: mins * 60,
        endTimeMs: null,
      };
    });
  }, [state.settings.revisionDurationMinutes, state.settings.newTopicDurationMinutes]);

  const completeTimerEarly = useCallback(() => {
    setTimer((prev) => {
      const elapsedSeconds = prev.plannedMinutes * 60 - prev.remainingSeconds;
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      recordCompletedSession(prev, elapsedMinutes);
      if (state.settings.soundEnabled) {
        playCompletionChime('session');
      }
      showToast(
        `Logged ${elapsedMinutes}m ${prev.mode === 'revision' ? 'revision' : 'study'} session`
      );

      if (state.settings.breakPromptsEnabled) {
        return {
          ...prev,
          phase: 'break_prompt',
          remainingSeconds: state.settings.breakDurationMinutes * 60,
          endTimeMs: null,
        };
      }
      return {
        ...prev,
        phase: 'idle',
        remainingSeconds: prev.plannedMinutes * 60,
        endTimeMs: null,
      };
    });
  }, [
    recordCompletedSession,
    state.settings.soundEnabled,
    state.settings.breakPromptsEnabled,
    state.settings.breakDurationMinutes,
    showToast,
  ]);

  const startBreakTimer = useCallback(() => {
    const breakMins = state.settings.breakDurationMinutes;
    setTimer((prev) => ({
      ...prev,
      phase: 'break_running',
      remainingSeconds: breakMins * 60,
      endTimeMs: Date.now() + breakMins * 60 * 1000,
    }));
  }, [state.settings.breakDurationMinutes]);

  const skipBreak = useCallback(() => {
    setTimer((prev) => {
      const mins =
        prev.mode === 'revision'
          ? state.settings.revisionDurationMinutes
          : state.settings.newTopicDurationMinutes;
      return {
        ...prev,
        phase: 'idle',
        plannedMinutes: mins,
        remainingSeconds: mins * 60,
        endTimeMs: null,
      };
    });
  }, [state.settings.revisionDurationMinutes, state.settings.newTopicDurationMinutes]);

  // --- Goals & Rewards ---
  const updateGoal = useCallback(
    (updates: Partial<Pick<Goal, 'title' | 'targetDays' | 'startDate'>>) => {
      setState((prev) => {
        const nextGoal = { ...prev.goal, ...updates };
        const nextRewards = prev.rewards.map((r) =>
          r.milestoneType === 'goal'
            ? {
                ...r,
                milestoneDays: nextGoal.targetDays,
                unlockedAt:
                  Math.max(streaks.currentStreak, streaks.longestStreak) >= nextGoal.targetDays
                    ? r.unlockedAt || new Date().toISOString()
                    : undefined,
              }
            : r
        );
        return { ...prev, goal: nextGoal, rewards: nextRewards };
      });
      showToast('Study goal updated');
    },
    [setState, streaks.currentStreak, streaks.longestStreak, showToast]
  );

  const updateRewardTitle = useCallback(
    (rewardId: string, title: string) => {
      setState((prev) => ({
        ...prev,
        rewards: prev.rewards.map((r) =>
          r.id === rewardId ? { ...r, title: title.trim() || r.title } : r
        ),
      }));
      showToast('Reward saved');
    },
    [setState, showToast]
  );

  const claimReward = useCallback(
    (rewardId: string) => {
      setState((prev) => ({
        ...prev,
        rewards: prev.rewards.map((r) =>
          r.id === rewardId ? { ...r, claimedAt: new Date().toISOString() } : r
        ),
      }));
      triggerMilestoneConfetti();
      showToast('Reward claimed!');
    },
    [setState, showToast]
  );

  // --- Exams ---
  const addExamResult = useCallback(
    (input: Omit<ExamResult, 'id'>): ExamResult => {
      const exam: ExamResult = {
        ...input,
        id: generateId('exam'),
        title: input.title.trim(),
        notes: input.notes?.trim() || undefined,
      };
      setState((prev) => ({
        ...prev,
        exams: [exam, ...prev.exams],
      }));
      showToast('Exam result recorded');
      return exam;
    },
    [setState, showToast]
  );

  const deleteExamResult = useCallback(
    (examId: string) => {
      setState((prev) => ({
        ...prev,
        exams: prev.exams.filter((e) => e.id !== examId),
      }));
      showToast('Exam result deleted');
    },
    [setState, showToast]
  );

  // --- Settings & Data ---
  const updateSettings = useCallback(
    (updates: Partial<AppSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...updates },
      }));
      setTimer((prev) => {
        if (prev.phase !== 'idle') return prev;
        const newMins =
          prev.mode === 'revision'
            ? updates.revisionDurationMinutes ?? prev.plannedMinutes
            : updates.newTopicDurationMinutes ?? prev.plannedMinutes;
        return {
          ...prev,
          plannedMinutes: newMins,
          remainingSeconds: newMins * 60,
        };
      });
    },
    [setState]
  );

  const exportDataJSON = useCallback(() => {
    return JSON.stringify(
      {
        profile: activeProfile,
        workspace: state,
      },
      null,
      2
    );
  }, [activeProfile, state]);

  const importDataJSON = useCallback(
    (jsonText: string): boolean => {
      try {
        const parsed = JSON.parse(jsonText) as {
          workspace?: Partial<AppState>;
        } & Partial<AppState>;

        const rawWs = parsed.workspace ? parsed.workspace : parsed;
        if (!rawWs || !Array.isArray(rawWs.subjects) || !Array.isArray(rawWs.topics)) {
          return false;
        }
        setState(() => mergeWithDefaults(rawWs));
        showToast(`Backup imported into "${activeProfile.name}"`);
        return true;
      } catch {
        return false;
      }
    },
    [setState, activeProfile.name, showToast]
  );

  const resetAllData = useCallback(() => {
    const fresh = createDefaultState();
    fresh.settings.theme = state.settings.theme;
    setState(() => fresh);
    setTimer({
      mode: 'revision',
      phase: 'idle',
      plannedMinutes: fresh.settings.revisionDurationMinutes,
      remainingSeconds: fresh.settings.revisionDurationMinutes * 60,
      endTimeMs: null,
    });
    showToast(`Cleared "${activeProfile.name}" workplace`);
  }, [setState, state.settings.theme, activeProfile.name, showToast]);

  const value: StudyContextValue = {
    state,
    profiles: store.profiles,
    activeProfile,
    workspaces: store.workspaces,
    isHydrated,
    activeScreen,
    setActiveScreen,
    streaks,
    timer,
    toastMessage,
    dismissToast,
    newlyUnlockedReward,
    dismissRewardBanner,
    createProfile,
    updateProfile,
    switchProfile,
    deleteProfile,
    addSubject,
    updateSubject,
    deleteSubject,
    addTopic,
    deleteTopic,
    markRevisionDone,
    undoRevisionDone,
    snoozeRevision,
    openRevisionSession,
    openNewTopicSession,
    startNewTopicSession,
    startRevisionTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    completeTimerEarly,
    startBreakTimer,
    skipBreak,
    updateGoal,
    updateRewardTitle,
    claimReward,
    addExamResult,
    deleteExamResult,
    updateSettings,
    exportDataJSON,
    importDataJSON,
    resetAllData,
  };

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
};

export function useStudy(): StudyContextValue {
  const ctx = useContext(StudyContext);
  if (!ctx) {
    throw new Error('useStudy must be used within StudyProvider');
  }
  return ctx;
}
