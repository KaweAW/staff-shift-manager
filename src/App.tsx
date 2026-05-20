import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Staff } from './pages/Staff';
import { Eccezioni } from './pages/Eccezioni';
import { Registro } from './pages/Registro';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'staff' | 'eccezioni' | 'registro'>('dashboard');

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-900 text-white">
        <p className="text-sm font-medium tracking-wide animate-pulse">Caricamento sistema...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <MainLayout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {currentTab === 'dashboard' && <Dashboard />}
      {currentTab === 'staff' && <Staff />}
      {currentTab === 'eccezioni' && <Eccezioni />}
      {currentTab === 'registro' && <Registro />} {/* NUOVA PAGINA */}
    </MainLayout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;