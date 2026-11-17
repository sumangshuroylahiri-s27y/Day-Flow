import { ErrorBoundary } from './components/ErrorBoundary';
import { DayflowProvider, useDayflow } from './context/DayflowContext';
import { LandingPage } from './components/LandingPage';
import { AppShell } from './components/AppShell';
import { CommandSearchModal } from './components/modals/CommandSearchModal';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { ToastContainer } from './components/ToastContainer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DashboardView } from './components/views/DashboardView';
import { MyDayView } from './components/views/MyDayView';
import { ActivityView } from './components/views/ActivityView';
import { TasksView } from './components/views/TasksView';
import { CalendarView } from './components/views/CalendarView';
import { NotesView } from './components/views/NotesView';
import { HabitsView } from './components/views/HabitsView';
import { FocusTimerView } from './components/views/FocusTimerView';
import { FinanceView } from './components/views/FinanceView';
import { GoalsView } from './components/views/GoalsView';
import { DocumentsView } from './components/views/DocumentsView';
import { AiAssistantView } from './components/views/AiAssistantView';
import { UtilitiesView } from './components/views/UtilitiesView';
import { SmartSearchView } from './components/views/SmartSearchView';
import { ProfileView } from './components/views/ProfileView';
import { SettingsView } from './components/views/SettingsView';

function WorkspaceRouter() {
  const { mode, activeNav } = useDayflow();

  if (mode === 'landing') {
    return (
      <>
        <LandingPage />
        <ToastContainer />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'my-day':
        return <MyDayView />;
      case 'activity':
        return <ActivityView />;
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'notes':
        return <NotesView />;
      case 'habits':
        return <HabitsView />;
      case 'focus':
        return <FocusTimerView />;
      case 'finance':
        return <FinanceView />;
      case 'goals':
        return <GoalsView />;
      case 'documents':
        return <DocumentsView />;
      case 'ai-assistant':
        return <AiAssistantView />;
      case 'utilities':
        return <UtilitiesView />;
      case 'smart-search':
        return <SmartSearchView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <>
      <AppShell>{renderActiveView()}</AppShell>
      <CommandSearchModal />
      <QuickAddModal />
      <ToastContainer />
      <OfflineIndicator />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DayflowProvider>
        <WorkspaceRouter />
      </DayflowProvider>
    </ErrorBoundary>
  );
}
