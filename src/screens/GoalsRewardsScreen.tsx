import React, { useMemo, useState } from 'react';
import { Award, Check, Edit3, Flame, Gift, Lock, Trophy } from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { formatDisplayDate, getLastNDaysISO, getTodayISO } from '../utils/dates';

const GOAL_PRESETS = [30, 60, 100, 200] as const;

export const GoalsRewardsScreen: React.FC = () => {
  const { state, streaks, updateGoal, updateRewardTitle, claimReward } = useStudy();

  const [goalTitle, setGoalTitle] = useState(state.goal.title);
  const [targetDaysInput, setTargetDaysInput] = useState(String(state.goal.targetDays));
  const [editingRewardId, setEditingRewardId] = useState<string | null>(null);
  const [rewardDraft, setRewardDraft] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const todayISO = getTodayISO();
  const last84Days = useMemo(() => getLastNDaysISO(84, todayISO), [todayISO]);

  // Group 84 days into 12 columns of 7 days for the calendar heatmap
  const heatmapWeeks = useMemo(() => {
    const weeks: string[][] = [];
    for (let i = 0; i < last84Days.length; i += 7) {
      weeks.push(last84Days.slice(i, i + 7));
    }
    return weeks;
  }, [last84Days]);

  const goalPct = Math.min(
    100,
    Math.round((streaks.currentStreak / Math.max(1, state.goal.targetDays)) * 100)
  );

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(1, Math.min(3650, Number(targetDaysInput) || 30));
    setTargetDaysInput(String(parsed));
    updateGoal({
      title: goalTitle.trim() || 'Consistent Daily Study',
      targetDays: parsed,
    });
  };

  const startEditReward = (id: string, currentTitle: string) => {
    setEditingRewardId(id);
    setRewardDraft(currentTitle);
  };

  const saveEditReward = (id: string) => {
    if (rewardDraft.trim()) {
      updateRewardTitle(id, rewardDraft.trim());
    }
    setEditingRewardId(null);
  };

  const selectedActivity = selectedDay ? streaks.activityByDate[selectedDay] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Goals & Rewards
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Log a topic or complete a study session each day to grow your streak and unlock rewards.
        </p>
      </div>

      {/* Streak Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Current Streak</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {streaks.currentStreak} <span className="text-base font-medium">days</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Longest Streak</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {streaks.longestStreak} <span className="text-base font-medium">days</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Active Days</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {streaks.totalStudyDays}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Goal Progress + Calendar Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveGoal}
          className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
        >
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Study Streak Goal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              {streaks.currentStreak} / {state.goal.targetDays} days ({goalPct}% complete)
            </p>
          </div>

          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${goalPct}%` }}
            />
          </div>

          <div>
            <label
              htmlFor="goal-title-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
            >
              Goal Name
            </label>
            <input
              id="goal-title-input"
              type="text"
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="goal-days-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Target Consecutive Days
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {GOAL_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTargetDaysInput(String(days))}
                  className={`min-h-[38px] px-3 rounded-xl border text-xs font-semibold tabular-nums cursor-pointer ${
                    Number(targetDaysInput) === days
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
            <input
              id="goal-days-input"
              type="number"
              min={1}
              max={3650}
              value={targetDaysInput}
              onChange={(e) => setTargetDaysInput(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3.5 text-sm font-mono tabular-nums text-slate-900 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold cursor-pointer"
          >
            Update Goal
          </button>
        </form>

        {/* 12-Week Calendar Heatmap */}
        <section className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                12-Week Study Heatmap
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tap any square to inspect that day&apos;s topics and focus sessions.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Less</span>
              <span className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
              <span className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-900" />
              <span className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
              <span className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
              <span>More</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <div className="grid grid-cols-12 gap-1.5 min-w-[320px]">
              {heatmapWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-rows-7 gap-1.5">
                  {week.map((dayISO) => {
                    const act = streaks.activityByDate[dayISO];
                    const score = act ? act.topics + act.sessions : 0;
                    const isSelected = selectedDay === dayISO;

                    let colorClass = 'bg-slate-100 dark:bg-slate-800/90';
                    if (score === 1) colorClass = 'bg-emerald-300 dark:bg-emerald-900';
                    else if (score === 2) colorClass = 'bg-emerald-500 dark:bg-emerald-600';
                    else if (score >= 3) colorClass = 'bg-emerald-600 dark:bg-emerald-400';

                    return (
                      <button
                        key={dayISO}
                        type="button"
                        onClick={() => setSelectedDay(dayISO)}
                        title={`${dayISO}: ${score} activities`}
                        aria-label={`${dayISO}: ${score} study activities`}
                        className={`aspect-square w-full rounded-[4px] transition-transform cursor-pointer ${colorClass} ${
                          isSelected ? 'ring-2 ring-indigo-500 scale-110' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
            {selectedDay ? (
              <span>
                <strong>{formatDisplayDate(selectedDay)} ({selectedDay}):</strong>{' '}
                {selectedActivity
                  ? `${selectedActivity.topics} topics · ${selectedActivity.sessions} sessions (${selectedActivity.totalMinutes}m)`
                  : 'No study logged'}
              </span>
            ) : (
              <span className="text-slate-500 dark:text-slate-400">
                Select a day cell above to see details.
              </span>
            )}
          </div>
        </section>
      </div>

      {/* Milestone Rewards */}
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Milestone Rewards
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Customize your real-life rewards for hitting 7-day, 30-day, and full-goal streaks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {state.rewards.map((reward) => {
            const best = Math.max(streaks.currentStreak, streaks.longestStreak);
            const isUnlocked = Boolean(reward.unlockedAt) || best >= reward.milestoneDays;
            const isClaimed = Boolean(reward.claimedAt);
            const isEditing = editingRewardId === reward.id;
            const daysRemaining = Math.max(0, reward.milestoneDays - best);

            return (
              <div
                key={reward.id}
                className={`rounded-2xl bg-white dark:bg-[#111827] border p-5 flex flex-col justify-between gap-4 ${
                  isUnlocked && !isClaimed
                    ? 'border-amber-500/50'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {reward.milestoneDays}-Day Milestone
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        isClaimed
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isUnlocked
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {isClaimed
                        ? 'Claimed'
                        : isUnlocked
                          ? 'Unlocked'
                          : `${daysRemaining}d to go`}
                    </span>
                  </div>

                  <div className="mt-3 flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isClaimed
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : isUnlocked
                            ? 'bg-amber-500/15 text-amber-500'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isUnlocked ? <Gift className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </div>

                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={rewardDraft}
                          onChange={(e) => setRewardDraft(e.target.value)}
                          className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3 text-sm text-slate-900 dark:text-slate-100"
                          placeholder="e.g., Watch a movie"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEditReward(reward.id)}
                            className="min-h-[36px] px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingRewardId(null)}
                            className="min-h-[36px] px-3 rounded-lg text-xs text-slate-500 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {reward.title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditReward(reward.id, reward.title)}
                      className="min-h-[40px] px-2.5 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Reward</span>
                    </button>
                  )}

                  {isUnlocked && !isClaimed && (
                    <button
                      type="button"
                      onClick={() => claimReward(reward.id)}
                      className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 ml-auto cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Claim Reward</span>
                    </button>
                  )}

                  {isClaimed && reward.claimedAt && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 ml-auto tabular-nums">
                      Claimed {formatDisplayDate(reward.claimedAt.slice(0, 10))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
