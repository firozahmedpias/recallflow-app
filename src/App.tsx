/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { AppShell } from './components/AppShell';
import { TodayScreen } from './screens/TodayScreen';
import { AddTopicScreen } from './screens/AddTopicScreen';
import { TimerScreen } from './screens/TimerScreen';
import { SubjectsScreen } from './screens/SubjectsScreen';
import { GoalsRewardsScreen } from './screens/GoalsRewardsScreen';
import { ExamsScreen } from './screens/ExamsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const ScreenRouter: React.FC = () => {
  const { activeScreen, isHydrated } = useStudy();

  if (!isHydrated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading study workspace...</p>
      </div>
    );
  }

  switch (activeScreen) {
    case 'today':
      return <TodayScreen />;
    case 'add-topic':
      return <AddTopicScreen />;
    case 'timer':
      return <TimerScreen />;
    case 'subjects':
      return <SubjectsScreen />;
    case 'goals':
      return <GoalsRewardsScreen />;
    case 'exams':
      return <ExamsScreen />;
    case 'analytics':
      return <AnalyticsScreen />;
    case 'settings':
      return <SettingsScreen />;
    default:
      return <TodayScreen />;
  }
};

export default function App() {
  return (
    <StudyProvider>
      <AppShell>
        <ScreenRouter />
      </AppShell>
    </StudyProvider>
  );
}
