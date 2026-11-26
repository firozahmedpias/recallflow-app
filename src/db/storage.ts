import { AppState, StudyProfile, WorkspaceStore } from '../types/study';
import { getTodayISO } from '../utils/dates';

const DB_NAME = 'recallflow_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const WORKSPACE_STORE_KEY = 'workspaces_v2';
const LEGACY_STATE_KEY = 'primary';
const LS_WORKSPACE_KEY = 'recallflow_workspaces_v2';
const LS_LEGACY_KEY = 'recallflow_backup_v1';
const THEME_KEY = 'recallflow_theme';

export function createDefaultState(): AppState {
  const today = getTodayISO();
  return {
    subjects: [],
    topics: [],
    revisions: [],
    sessions: [],
    goal: {
      id: 'goal_primary',
      title: 'Consistent Daily Study',
      targetDays: 30,
      startDate: today,
      active: true,
    },
    rewards: [
      {
        id: 'reward_7d',
        milestoneDays: 7,
        milestoneType: '7d',
        title: 'Treat yourself to a favorite snack or coffee',
      },
      {
        id: 'reward_30d',
        milestoneDays: 30,
        milestoneType: '30d',
        title: 'Watch a movie guilt-free',
      },
      {
        id: 'reward_goal',
        milestoneDays: 30,
        milestoneType: 'goal',
        title: 'Celebrate completing your study goal',
      },
    ],
    exams: [],
    settings: {
      revisionDurationMinutes: 30,
      newTopicDurationMinutes: 90,
      breakDurationMinutes: 5,
      soundEnabled: true,
      breakPromptsEnabled: true,
      notificationsEnabled: false,
      theme: 'dark',
    },
  };
}

export function createDefaultProfile(
  id = 'profile_default',
  name = 'Scholar',
  subtitle = 'Personal Study Space',
  avatarColor = '#6366F1'
): StudyProfile {
  return {
    id,
    name,
    subtitle,
    avatarColor,
    createdAt: new Date().toISOString(),
  };
}

export function createDefaultWorkspaceStore(): WorkspaceStore {
  const profile = createDefaultProfile();
  return {
    activeProfileId: profile.id,
    profiles: [profile],
    workspaces: {
      [profile.id]: createDefaultState(),
    },
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function mergeWithDefaults(partial: Partial<AppState> | null | undefined): AppState {
  const defaults = createDefaultState();
  if (!partial) return defaults;

  return {
    subjects: Array.isArray(partial.subjects) ? partial.subjects : defaults.subjects,
    topics: Array.isArray(partial.topics) ? partial.topics : defaults.topics,
    revisions: Array.isArray(partial.revisions) ? partial.revisions : defaults.revisions,
    sessions: Array.isArray(partial.sessions) ? partial.sessions : defaults.sessions,
    goal: partial.goal ? { ...defaults.goal, ...partial.goal } : defaults.goal,
    rewards:
      Array.isArray(partial.rewards) && partial.rewards.length > 0
        ? partial.rewards
        : defaults.rewards,
    exams: Array.isArray(partial.exams) ? partial.exams : defaults.exams,
    settings: partial.settings
      ? { ...defaults.settings, ...partial.settings }
      : defaults.settings,
  };
}

function normalizeWorkspaceStore(raw: Partial<WorkspaceStore> | null | undefined): WorkspaceStore {
  if (!raw || !Array.isArray(raw.profiles) || raw.profiles.length === 0) {
    return createDefaultWorkspaceStore();
  }

  const profiles: StudyProfile[] = raw.profiles.map((p, idx) => ({
    id: p.id || `profile_${idx}`,
    name: p.name?.trim() || 'Scholar',
    subtitle: p.subtitle?.trim() || undefined,
    avatarColor: p.avatarColor || '#6366F1',
    createdAt: p.createdAt || new Date().toISOString(),
  }));

  const workspaces: Record<string, AppState> = {};
  for (const profile of profiles) {
    workspaces[profile.id] = mergeWithDefaults(raw.workspaces?.[profile.id]);
  }

  const activeExists = profiles.some((p) => p.id === raw.activeProfileId);
  const activeProfileId = activeExists ? (raw.activeProfileId as string) : profiles[0].id;

  return {
    activeProfileId,
    profiles,
    workspaces,
  };
}

export async function loadWorkspaceStore(): Promise<WorkspaceStore> {
  // 1. Try IndexedDB v2 multi-profile store first, then legacy single-workspace key
  try {
    const db = await openDB();
    const v2 = await new Promise<WorkspaceStore | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(WORKSPACE_STORE_KEY);
      req.onsuccess = () => resolve(req.result as WorkspaceStore | undefined);
      req.onerror = () => reject(req.error);
    });

    if (v2 && Array.isArray(v2.profiles) && v2.profiles.length > 0) {
      db.close();
      return normalizeWorkspaceStore(v2);
    }

    const legacy = await new Promise<Partial<AppState> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(LEGACY_STATE_KEY);
      req.onsuccess = () => resolve(req.result as Partial<AppState> | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();

    if (legacy) {
      const profile = createDefaultProfile();
      return {
        activeProfileId: profile.id,
        profiles: [profile],
        workspaces: { [profile.id]: mergeWithDefaults(legacy) },
      };
    }
  } catch {
    // Fall back to localStorage below
  }

  // 2. Try localStorage v2 store, then legacy localStorage key
  try {
    const rawV2 = localStorage.getItem(LS_WORKSPACE_KEY);
    if (rawV2) {
      return normalizeWorkspaceStore(JSON.parse(rawV2) as Partial<WorkspaceStore>);
    }
    const rawLegacy = localStorage.getItem(LS_LEGACY_KEY);
    if (rawLegacy) {
      const profile = createDefaultProfile();
      return {
        activeProfileId: profile.id,
        profiles: [profile],
        workspaces: {
          [profile.id]: mergeWithDefaults(JSON.parse(rawLegacy) as Partial<AppState>),
        },
      };
    }
  } catch {
    // Ignore parse errors
  }

  return createDefaultWorkspaceStore();
}

export async function saveWorkspaceStore(store: WorkspaceStore): Promise<void> {
  const activeState = store.workspaces[store.activeProfileId];
  try {
    localStorage.setItem(LS_WORKSPACE_KEY, JSON.stringify(store));
    if (activeState?.settings?.theme) {
      localStorage.setItem(THEME_KEY, activeState.settings.theme);
    }
  } catch {
    // Ignore storage quota errors
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const objStore = tx.objectStore(STORE_NAME);
      const req = objStore.put(store, WORKSPACE_STORE_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // localStorage mirror already saved
  }
}
