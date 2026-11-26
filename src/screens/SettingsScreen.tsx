import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  Download,
  Moon,
  Plus,
  Sun,
  Trash2,
  Upload,
  UserCheck,
  UserPlus,
  Volume2,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { SUBJECT_COLORS } from '../types/study';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { playCompletionChime } from '../utils/audio';
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  sendBrowserNotification,
} from '../utils/notifications';

export const SettingsScreen: React.FC = () => {
  const {
    state,
    profiles,
    activeProfile,
    workspaces,
    createProfile,
    updateProfile,
    switchProfile,
    deleteProfile,
    updateSettings,
    exportDataJSON,
    importDataJSON,
    resetAllData,
  } = useStudy();

  // Active profile customization form
  const [profileName, setProfileName] = useState(activeProfile.name);
  const [profileSubtitle, setProfileSubtitle] = useState(activeProfile.subtitle || '');
  const [profileColor, setProfileColor] = useState(activeProfile.avatarColor);

  // Create new separate profile/workplace form
  const [showNewProfileForm, setShowNewProfileForm] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileSubtitle, setNewProfileSubtitle] = useState('');
  const [newProfileColor, setNewProfileColor] = useState<string>(
    SUBJECT_COLORS[profiles.length % SUBJECT_COLORS.length]
  );
  const [confirmDeleteProfileId, setConfirmDeleteProfileId] = useState<string | null>(null);

  // Timer duration fields
  const [revMins, setRevMins] = useState(String(state.settings.revisionDurationMinutes));
  const [newTopicMins, setNewTopicMins] = useState(String(state.settings.newTopicDurationMinutes));
  const [breakMins, setBreakMins] = useState(String(state.settings.breakDurationMinutes));
  const [notifPerm, setNotifPerm] = useState(() => getNotificationPermission());
  const [confirmReset, setConfirmReset] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync local form fields when switching to another profile workplace
  useEffect(() => {
    setProfileName(activeProfile.name);
    setProfileSubtitle(activeProfile.subtitle || '');
    setProfileColor(activeProfile.avatarColor);
    setRevMins(String(state.settings.revisionDurationMinutes));
    setNewTopicMins(String(state.settings.newTopicDurationMinutes));
    setBreakMins(String(state.settings.breakDurationMinutes));
    setConfirmReset(false);
    setImportStatus(null);
  }, [
    activeProfile.id,
    activeProfile.name,
    activeProfile.subtitle,
    activeProfile.avatarColor,
    state.settings.revisionDurationMinutes,
    state.settings.newTopicDurationMinutes,
    state.settings.breakDurationMinutes,
  ]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    updateProfile(activeProfile.id, {
      name: profileName.trim(),
      subtitle: profileSubtitle.trim(),
      avatarColor: profileColor,
    });
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    createProfile({
      name: newProfileName.trim(),
      subtitle: newProfileSubtitle.trim() || undefined,
      avatarColor: newProfileColor,
    });
    setNewProfileName('');
    setNewProfileSubtitle('');
    setShowNewProfileForm(false);
  };

  const handleSaveDurations = (e: React.FormEvent) => {
    e.preventDefault();
    const r = Math.max(1, Math.min(240, Number(revMins) || 30));
    const n = Math.max(1, Math.min(240, Number(newTopicMins) || 90));
    const b = Math.max(1, Math.min(60, Number(breakMins) || 5));
    setRevMins(String(r));
    setNewTopicMins(String(n));
    setBreakMins(String(b));
    updateSettings({
      revisionDurationMinutes: r,
      newTopicDurationMinutes: n,
      breakDurationMinutes: b,
    });
  };

  const handleToggleNotifications = async () => {
    if (!isNotificationSupported()) return;
    if (!state.settings.notificationsEnabled) {
      const perm = await requestNotificationPermission();
      setNotifPerm(perm);
      if (perm === 'granted') {
        updateSettings({ notificationsEnabled: true });
        await sendBrowserNotification(
          'RecallFlow Notifications Active',
          'You will be alerted when spaced revisions are due.'
        );
      }
    } else {
      updateSettings({ notificationsEnabled: false });
    }
  };

  const handleDownloadBackup = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = activeProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `recallflow-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const ok = importDataJSON(text);
      setImportStatus(ok ? 'Backup restored into current workplace.' : 'Invalid backup JSON file.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage profiles & separate workplaces, timer durations, alerts, and backups.
        </p>
      </div>

      {/* Profiles & Separate Workplaces */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Profile & Separate Workplaces
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Each profile keeps its own subjects, topics, revisions, streaks, exams, and settings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewProfileForm((v) => !v)}
            className="min-h-[40px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Workplace</span>
          </button>
        </div>

        {/* Create New Separate Profile Form */}
        {showNewProfileForm && (
          <form
            onSubmit={handleCreateProfile}
            className="rounded-xl bg-slate-50 dark:bg-[#0E1422] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Create Separate Profile & Workplace
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Profile name (e.g., Alex, Med School)"
                className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={newProfileSubtitle}
                onChange={(e) => setNewProfileSubtitle(e.target.value)}
                placeholder="Workplace focus (optional, e.g., Fall 2026)"
                className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Badge color:</span>
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewProfileColor(c)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                      newProfileColor === c
                        ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#0E1422]'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Profile color ${c}`}
                  >
                    {newProfileColor === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProfileForm(false)}
                  className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Switch</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Customize Active Profile */}
        <form
          onSubmit={handleSaveProfile}
          className="rounded-xl bg-slate-50/70 dark:bg-[#0E1422] border border-slate-200/80 dark:border-slate-800 p-4 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: profileColor }}
            >
              {(profileName || 'S').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Active Profile
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Customize Welcome Name & Details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="profile-name-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Display Name
              </label>
              <input
                id="profile-name-input"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="profile-subtitle-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Workplace Label <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="profile-subtitle-input"
                type="text"
                value={profileSubtitle}
                onChange={(e) => setProfileSubtitle(e.target.value)}
                placeholder="e.g., Bar Exam Prep, CS Semester 4"
                className="w-full min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#090D16] px-3.5 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Color:</span>
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setProfileColor(c)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                    profileColor === c
                      ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#0E1422]'
                      : ''
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select profile color ${c}`}
                >
                  {profileColor === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="min-h-[40px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>

        {/* All Profiles Switcher List */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {profiles.map((prof) => {
            const ws = workspaces[prof.id];
            const isCurrent = prof.id === activeProfile.id;
            const isConfirmingDel = confirmDeleteProfileId === prof.id;
            const subjCount = ws?.subjects.length ?? 0;
            const topicCount = ws?.topics.length ?? 0;
            const sessCount = ws?.sessions.length ?? 0;

            return (
              <div
                key={prof.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#111827]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                    style={{ backgroundColor: prof.avatarColor }}
                  >
                    {prof.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {prof.name}
                      {prof.subtitle ? (
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {' · '}
                          {prof.subtitle}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {subjCount} subjects · {topicCount} topics · {sessCount} sessions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-2.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => switchProfile(prof.id)}
                      className="min-h-[38px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Switch
                    </button>
                  )}

                  {profiles.length > 1 &&
                    (isConfirmingDel ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            deleteProfile(prof.id);
                            setConfirmDeleteProfileId(null);
                          }}
                          className="min-h-[38px] px-3 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteProfileId(null)}
                          className="min-h-[38px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteProfileId(prof.id)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        aria-label={`Delete profile ${prof.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timer Durations */}
      <form
        onSubmit={handleSaveDurations}
        className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
      >
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Timer Durations (minutes)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="set-rev-mins"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Revise Session
            </label>
            <input
              id="set-rev-mins"
              type="number"
              min={1}
              max={240}
              value={revMins}
              onChange={(e) => setRevMins(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="set-topic-mins"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              New Topic Session
            </label>
            <input
              id="set-topic-mins"
              type="number"
              min={1}
              max={240}
              value={newTopicMins}
              onChange={(e) => setNewTopicMins(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="set-break-mins"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Short Break
            </label>
            <input
              id="set-break-mins"
              type="number"
              min={1}
              max={60}
              value={breakMins}
              onChange={(e) => setBreakMins(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <button
          type="submit"
          className="min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
        >
          Save Durations
        </button>
      </form>

      {/* Preferences & Alerts */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* Theme Switch */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {state.settings.theme === 'dark' ? (
              <Moon className="w-5 h-5 text-indigo-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Dark Mode
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Low-glare palette for evening study sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({
                theme: state.settings.theme === 'dark' ? 'light' : 'dark',
              })
            }
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
              state.settings.theme === 'dark'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-800'
            }`}
          >
            {state.settings.theme === 'dark' ? 'Dark On' : 'Light On'}
          </button>
        </div>

        {/* Completion Chime */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Completion Chime
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Play an offline audio chime when a session finishes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playCompletionChime('session')}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ soundEnabled: !state.settings.soundEnabled })}
              className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
                state.settings.soundEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {state.settings.soundEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {/* Break Prompts */}
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Short Break Prompts
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Offer a {state.settings.breakDurationMinutes}-minute break when a study timer ends
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              updateSettings({ breakPromptsEnabled: !state.settings.breakPromptsEnabled })
            }
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
              state.settings.breakPromptsEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {state.settings.breakPromptsEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {/* Browser Notifications */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Browser Revision Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {notifPerm === 'unsupported'
                  ? 'Notifications are not supported in this browser.'
                  : notifPerm === 'denied'
                    ? 'Permission blocked in browser settings.'
                    : 'Remind when Day 1, 4, 7, or 10 revisions are due.'}
              </p>
            </div>
          </div>

          {notifPerm !== 'unsupported' && notifPerm !== 'denied' && (
            <div className="flex items-center gap-2 shrink-0">
              {notifPerm === 'granted' && (
                <button
                  type="button"
                  onClick={() =>
                    sendBrowserNotification(
                      'RecallFlow Test Alert',
                      'Your revision reminders are working.'
                    )
                  }
                  className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Test Alert
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleNotifications}
                className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold cursor-pointer ${
                  state.settings.notificationsEnabled && notifPerm === 'granted'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {state.settings.notificationsEnabled && notifPerm === 'granted'
                  ? 'Enabled'
                  : 'Enable'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Install PWA + Local Data Backup */}
      <section className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Offline Storage & App Install
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export or clear data for <strong>{activeProfile.name}</strong>&apos;s workplace.
            </p>
          </div>
          <PWAInstallButton />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[44px] px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-2 ml-auto cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Workplace</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  resetAllData();
                  setConfirmReset(false);
                }}
                className="min-h-[44px] px-3.5 rounded-xl bg-rose-600 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {importStatus && (
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{importStatus}</p>
        )}
      </section>
    </div>
  );
};
