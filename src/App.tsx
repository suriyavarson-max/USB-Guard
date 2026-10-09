import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SecurityProvider } from './context/SecurityContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ToastContainer } from './components/layout/ToastContainer';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Volumes } from './pages/Volumes';
import { FileActivity } from './pages/FileActivity';
import { Alerts } from './pages/Alerts';
import { AuditLogs } from './pages/AuditLogs';
import { Reports } from './pages/Reports';
import { SystemStatus } from './pages/SystemStatus';
import { DemoLab } from './pages/DemoLab';
import { PresentationGuide } from './pages/PresentationGuide';
import { Login } from './pages/Login';

const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'devices':
        return <Devices />;
      case 'volumes':
        return <Volumes />;
      case 'files':
        return <FileActivity />;
      case 'alerts':
        return <Alerts />;
      case 'audit':
        return <AuditLogs />;
      case 'reports':
        return <Reports />;
      case 'status':
        return <SystemStatus />;
      case 'demo':
        return <DemoLab />;
      case 'guide':
        return <PresentationGuide />;
      default:
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-200 flex flex-col">
      <Navbar
        onOpenDemo={() => setCurrentTab('demo')}
        onOpenGuide={() => setCurrentTab('guide')}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentTab={currentTab} onTabChange={(t) => setCurrentTab(t)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SecurityProvider>
        <MainLayout />
      </SecurityProvider>
    </AuthProvider>
  );
}
