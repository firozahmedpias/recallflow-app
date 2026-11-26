import React, { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Menu,
  Moon,
  Pencil,
  Plus,
  Settings,
  Sun,
  Timer,
  Trophy,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { ScreenId, SUBJECT_COLORS } from '../types/study';
import { useStudy } from '../context/StudyContext';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

interface NavItem {
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'today', label: 'Today', icon: CalendarCheck2 },
  { id: 'add-topic', label: 'Add Topic', icon: Plus },
  { id: 'timer', label: 'Study Timer', icon: Timer },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'goals', label: 'Goals & Rewards', icon: Trophy },
  { id: 'exams', label: 'Exams', icon: ClipboardCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const MORE_MENU_ITEMS: NavItem[] = [
  { id: 'goals', label: 'Goals & Rewards', icon: Trophy },
  { id: 'exams', label: 'Exams & Scores', icon: ClipboardCheck },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function formatTimerShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state,
    profiles,
    activeProfile,
    createProfile,
    updateProfile,
    switchProfile,
    activeScreen,
    setActiveScreen,
    streaks,
    timer,
    toastMessage,
    dismissToast,
    newlyUnlockedReward,
    dismissRewardBanner,
    updateSettings,
  } = useStudy();

  const [moreOpen, setMoreOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [moreView, setMoreView] = useState<'menu' | 'profile' | 'edit-profile' | 'new-profile'>('menu');
  const [editName, setEditName] = useState(activeProfile.name);
  const [editSubtitle, setEditSubtitle] = useState(activeProfile.subtitle || '');
  const [editColor, setEditColor] = useState(activeProfile.avatarColor);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileSubtitle, setNewProfileSubtitle] = useState('');

  const openMoreSheet = () => {
    setMoreView('menu');
    setMoreOpen((v) => !v);
  };

  const closeMoreSheet = () => {
    setMoreOpen(false);
    setMoreView('menu');
  };

  const openEditProfileInMore = () => {
    setEditName(activeProfile.name);
    setEditSubtitle(activeProfile.subtitle || '');
    setEditColor(activeProfile.avatarColor);
    setMoreView('edit-profile');
  };

  const isTimerActive = timer.phase === 'running' || timer.phase === 'break_running';
  const currentTitle =
    ALL_NAV_ITEMS.find((item) => item.id === activeScreen)?.label || 'RecallFlow';

  const toggleTheme = () => {
    updateSettings({
      theme: state.settings.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const isMoreActive = ['goals', 'exams', 'analytics', 'settings'].includes(activeScreen);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0E1422] z-30">
        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveScreen('today')}
            className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
          >
            RecallFlow
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle color theme"
          >
            {state.settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Active Profile & Quick Workplace Switcher */}
        <div className="px-4 pt-4 pb-1 relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen((v) => !v)}
            className="w-full rounded-2xl bg-slate-100/90 dark:bg-[#141C2E] border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left hover:border-indigo-500/40 transition-colors cursor-pointer"
            aria-expanded={profileMenuOpen}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: activeProfile.avatarColor }}
              >
                {activeProfile.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {activeProfile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeProfile.subtitle || 'Personal Workplace'}
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                profileMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {profileMenuOpen && (
            <div className="mt-1.5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-lg p-1.5 space-y-1">
              {profiles.map((prof) => {
                const isCurrent = prof.id === activeProfile.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      switchProfile(prof.id);
                      setProfileMenuOpen(false);
                    }}
                    className={`w-full min-h-[40px] px-2.5 rounded-xl flex items-center justify-between gap-2 text-left text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: prof.avatarColor }}
                      />
                      <span className="truncate">{prof.name}</span>
                    </span>
                    {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  setActiveScreen('settings');
                }}
                className="w-full min-h-[38px] px-2.5 rounded-xl text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 mt-1 pt-1 cursor-pointer"
              >
                Manage Profiles in Settings
              </button>
            </div>
          )}
        </div>

        {/* Streak Snapshot */}
        <div className="px-4 pt-2 pb-2">
          <button
            type="button"
            onClick={() => setActiveScreen('goals')}
            className="w-full rounded-2xl bg-slate-100/90 dark:bg-[#141C2E] border border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between text-left hover:border-indigo-500/40 transition-colors cursor-pointer"
          >
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current streak</p>
              <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {streaks.currentStreak} {streaks.currentStreak === 1 ? 'day' : 'days'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {ALL_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveScreen(item.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'timer' && isTimerActive && (
                  <span className="font-mono text-xs tabular-nums opacity-90">
                    {formatTimerShort(timer.remainingSeconds)}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col gap-2">
          <PWAInstallButton />
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar (48px) */}
      <header className="md:hidden sticky top-0 z-30 h-12 px-4 bg-white/90 dark:bg-[#0E1422]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setActiveScreen('today')}
          className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
        >
          RecallFlow
        </button>

        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">
          {currentTitle}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Toggle color theme"
          >
            {state.settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 md:pl-64 lg:pl-72 pb-20 md:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          {/* Newly Unlocked Milestone Reward Banner */}
          {newlyUnlockedReward && (
            <div className="mb-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {newlyUnlockedReward.milestoneDays}-Day Streak Reward Unlocked!
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                    {newlyUnlockedReward.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    dismissRewardBanner();
                    setActiveScreen('goals');
                  }}
                  className="min-h-[40px] px-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={dismissRewardBanner}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  aria-label="Dismiss reward notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar (56px + safe-area) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#0E1422]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setActiveScreen('today');
            }}
            className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeScreen === 'today' && !moreOpen
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CalendarCheck2 className="w-5 h-5" />
            <span className="text-[11px] font-medium whitespace-nowrap">Today</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setActiveScreen('timer');
            }}
            className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeScreen === 'timer' && !moreOpen
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="text-[11px] font-medium whitespace-nowrap tabular-nums">
              {isTimerActive ? formatTimerShort(timer.remainingSeconds) : 'Timer'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setActiveScreen('add-topic');
            }}
            className="h-full flex flex-col items-center justify-center cursor-pointer"
            aria-label="Add studied topic"
          >
            <span
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-transform active:scale-95 ${
                activeScreen === 'add-topic' && !moreOpen
                  ? 'bg-indigo-500 text-white'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              <Plus className="w-5 h-5" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setActiveScreen('subjects');
            }}
            className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeScreen === 'subjects' && !moreOpen
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-medium whitespace-nowrap">Subjects</span>
          </button>

          <button
            type="button"
            onClick={openMoreSheet}
            className={`h-full flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              moreOpen || isMoreActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
            aria-expanded={moreOpen}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] font-medium whitespace-nowrap">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Bottom Sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end"
          onClick={closeMoreSheet}
          role="dialog"
          aria-modal="true"
          aria-label="More screens"
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-6 pb-safe shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />

            {moreView === 'menu' && (
              <>
                <div className="flex items-center justify-between px-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    More
                  </span>
                  <PWAInstallButton compact />
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {/* Profile Menu Item -> Switch Profile & Edit Profile */}
                  <button
                    type="button"
                    onClick={() => setMoreView('profile')}
                    className="w-full min-h-[56px] px-3 flex items-center justify-between text-left rounded-xl text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-3.5 min-w-0">
                      <UserRound className="w-5 h-5 shrink-0 text-indigo-500" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">Profile</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                          {activeProfile.name} · Switch or edit profile
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>

                  {MORE_MENU_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = activeScreen === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveScreen(item.id);
                          closeMoreSheet();
                        }}
                        className={`w-full min-h-[56px] px-3 flex items-center justify-between text-left rounded-xl transition-colors cursor-pointer ${
                          active
                            ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-3.5 text-sm">
                          <Icon className="w-5 h-5 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {moreView === 'profile' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMoreView('menu')}
                    className="min-h-[40px] px-2 -ml-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to More</span>
                  </button>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Profile
                  </span>
                  <span className="w-16" aria-hidden="true" />
                </div>

                {/* Active Profile Card + Edit Profile Option */}
                <div className="rounded-2xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: activeProfile.avatarColor }}
                    >
                      {activeProfile.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {activeProfile.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {activeProfile.subtitle || 'Personal Workplace'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openEditProfileInMore}
                    className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>

                {/* Switch Profile Option */}
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Switch Profile</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProfileName('');
                        setNewProfileSubtitle('');
                        setMoreView('new-profile');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      + New Profile
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {profiles.map((prof) => {
                      const isCurrent = prof.id === activeProfile.id;
                      return (
                        <button
                          key={prof.id}
                          type="button"
                          onClick={() => {
                            switchProfile(prof.id);
                            closeMoreSheet();
                          }}
                          className={`w-full min-h-[48px] px-3.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: prof.avatarColor }}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{prof.name}</p>
                              {prof.subtitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  {prof.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {moreView === 'edit-profile' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editName.trim()) return;
                  updateProfile(activeProfile.id, {
                    name: editName.trim(),
                    subtitle: editSubtitle.trim(),
                    avatarColor: editColor,
                  });
                  setMoreView('profile');
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMoreView('profile')}
                    className="min-h-[40px] px-2 -ml-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Edit Profile
                  </span>
                  <span className="w-12" aria-hidden="true" />
                </div>

                <div>
                  <label
                    htmlFor="more-edit-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Profile Name
                  </label>
                  <input
                    id="more-edit-name"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="more-edit-sub"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Workplace / Exam Focus (optional)
                  </label>
                  <input
                    id="more-edit-sub"
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    placeholder="e.g., Semester 4, Medical Prep"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Avatar Color
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                          editColor === color
                            ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#111827] scale-110'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select profile color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMoreView('profile')}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            )}

            {moreView === 'new-profile' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProfileName.trim()) return;
                  createProfile({
                    name: newProfileName.trim(),
                    subtitle: newProfileSubtitle.trim() || undefined,
                  });
                  closeMoreSheet();
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMoreView('profile')}
                    className="min-h-[40px] px-2 -ml-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    New Profile
                  </span>
                  <span className="w-12" aria-hidden="true" />
                </div>

                <div>
                  <label
                    htmlFor="more-new-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Profile Name
                  </label>
                  <input
                    id="more-new-name"
                    type="text"
                    required
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="e.g., Alex"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="more-new-sub"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Workplace / Exam Focus (optional)
                  </label>
                  <input
                    id="more-new-sub"
                    type="text"
                    value={newProfileSubtitle}
                    onChange={(e) => setNewProfileSubtitle(e.target.value)}
                    placeholder="e.g., Bar Exam Prep"
                    className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setMoreView('profile')}
                    className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
                  >
                    Create &amp; Switch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          role="status"
          onClick={dismissToast}
          className="fixed top-14 md:top-5 right-4 z-50 max-w-xs rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-xs font-semibold shadow-lg cursor-pointer"
        >
          {toastMessage}
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
};
