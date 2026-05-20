import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Users, CalendarX, LogOut, Coffee, ClipboardList } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentTab: 'dashboard' | 'staff' | 'eccezioni' | 'registro';
  setCurrentTab: (tab: 'dashboard' | 'staff' | 'eccezioni' | 'registro') => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, currentTab, setCurrentTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Tabellone', icon: Calendar },
    { id: 'staff', label: 'Staff Bar', icon: Users },
    { id: 'eccezioni', label: 'Eccezioni', icon: CalendarX },
    { id: 'registro', label: 'Registro', icon: ClipboardList },
  ] as const;

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col bg-slate-900 text-white border-r border-slate-800">
        <div className="flex h-16 shrink-0 items-center gap-2 px-6 border-b border-slate-800">
          <Coffee className="h-6 w-6 text-amber-500" />
          <span className="font-bold text-lg tracking-tight">Staff Manager</span>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id as any)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 bg-slate-950/40">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate">
              <p className="text-xs text-slate-500">Titolare loggato</p>
              <p className="text-sm font-medium text-slate-200 truncate">{user?.nome}</p>
            </div>
            <button onClick={logout} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between bg-slate-900 px-4 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <Coffee className="h-5 w-5 text-amber-500" />
          <h1 className="font-bold text-base tracking-tight truncate">
            {currentTab === 'dashboard' ? 'Tabellone' : currentTab === 'staff' ? 'Staff' : currentTab === 'eccezioni' ? 'Eccezioni' : 'Registro Log'}
          </h1>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-slate-400 cursor-pointer">
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {/* BODY MAIN */}
      <main className="md:pl-64 pb-28 md:pb-0">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* BOTTOM MENU MOBILE */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex h-20 border-t border-slate-200 bg-white shadow-2xl justify-around items-center px-1 pb-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id as any)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-colors cursor-pointer ${
                isActive ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'
              }`}
            >
              <Icon className="h-6.5 w-6.5" />
              <span className="text-[11px] tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
};