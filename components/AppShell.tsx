'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  CheckSquare,
  Users,
  Settings,
  RefreshCw,
  LogOut,
  UserCheck,
  Shield,
  Loader2,
  FileText,
} from 'lucide-react';
import MyTasksTab from './MyTasksTab';
import TeamViewTab from './TeamViewTab';
import ReportsTab from './ReportsTab';
import SettingsTab from './SettingsTab';
import { logoutAction } from '@/lib/actions/auth-actions';
import { useRouter } from 'next/navigation';

interface AppShellProps {
  sessionUser: any;
  initialUsers: any[];
  initialTasks: any[];
  initialLogs: any[];
  initialConfig: any;
  initialMeetings?: any[];
  initialSavedReports?: any[];
}

export default function AppShell({
  sessionUser,
  initialUsers,
  initialTasks,
  initialLogs,
  initialConfig,
  initialMeetings = [],
  initialSavedReports = [],
}: AppShellProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'TEAM_VIEW' | 'REPORTS' | 'SETTINGS'>('MY_TASKS');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [refreshStatus, setRefreshStatus] = useState<'refreshing' | 'refreshed' | null>(null);
  const refreshWasPending = useRef(false);

  const currentUser = sessionUser || initialUsers[0] || {
    id: 'default',
    name: 'Chathura',
    email: 'chathura@example.com',
    role: 'LEAD',
  };

  const handleRefresh = () => {
    if (isRefreshing) return;
    setRefreshStatus('refreshing');
    startRefreshTransition(() => router.refresh());
  };

  useEffect(() => {
    if (isRefreshing) {
      refreshWasPending.current = true;
      return;
    }

    if (refreshWasPending.current) {
      refreshWasPending.current = false;
      setRefreshStatus('refreshed');
      const timeout = window.setTimeout(() => setRefreshStatus(null), 3000);
      return () => window.clearTimeout(timeout);
    }
  }, [isRefreshing]);

  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Colombo',
  }).format(new Date());

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 safe-top shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                To-Do MACM
              </div>
              <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                Task & Team Hub
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveTab('MY_TASKS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'MY_TASKS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab('TEAM_VIEW')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'TEAM_VIEW'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team View</span>
            </button>

            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'REPORTS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'SETTINGS'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>

          {/* Right Header: Refresh, User Profile & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
              title={isRefreshing ? 'Refreshing data' : 'Refresh data'}
              aria-label={isRefreshing ? 'Refreshing data' : 'Refresh data'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
            </button>

            {/* Touch-Friendly User Profile Circle Avatar & Popover Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Account & Settings Menu"
              >
                <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {sessionUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {sessionUser.name}
                </span>
                <span
                  className={`hidden md:inline text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    sessionUser.role === 'LEAD'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {sessionUser.role}
                </span>
              </button>

              {/* User Popover Dropdown Menu (Logout & Settings) */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-50"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-60 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Profile Summary */}
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {sessionUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sessionUser.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {sessionUser.email}
                        </div>
                      </div>
                    </div>

                    {/* Navigation / Action List */}
                    <div className="pt-1.5 space-y-1">
                      <button
                        onClick={() => {
                          setActiveTab('SETTINGS');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>App Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-4 sm:pt-6 pb-28 sm:pb-8">
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Today</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{currentDate}</p>
          </div>
          <span className="hidden sm:inline text-[10px] font-medium text-slate-400">Daily focus &amp; team progress</span>
        </div>

        {refreshStatus && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
              refreshStatus === 'refreshing'
                ? 'border-blue-200 bg-white text-blue-800 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300'
                : 'border-emerald-200 bg-white text-emerald-800 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300'
            }`}
          >
            {refreshStatus === 'refreshing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            <span>{refreshStatus === 'refreshing' ? 'Refreshing your data…' : 'Data refreshed'}</span>
          </div>
        )}

        {activeTab === 'MY_TASKS' && (
          <MyTasksTab
            currentUser={currentUser}
            users={initialUsers}
            tasks={initialTasks}
            logs={initialLogs}
            config={initialConfig}
            initialMeetings={initialMeetings}
          />
        )}

        {activeTab === 'TEAM_VIEW' && (
          <TeamViewTab
            currentUser={currentUser}
            sessionUser={sessionUser}
            users={initialUsers}
            tasks={initialTasks}
            logs={initialLogs}
          />
        )}

        {activeTab === 'REPORTS' && (
          <ReportsTab
            currentUser={currentUser}
            savedReports={initialSavedReports}
          />
        )}

        {activeTab === 'SETTINGS' && (
          <SettingsTab
            config={initialConfig}
            users={initialUsers}
            currentUser={currentUser}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Streamlined: Tasks, Team, Reports) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 safe-bottom shadow-lg">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('MY_TASKS')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1 px-4 rounded-2xl ${
              activeTab === 'MY_TASKS'
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <CheckSquare className={`w-5 h-5 ${activeTab === 'MY_TASKS' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAM_VIEW')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1 px-4 rounded-2xl ${
              activeTab === 'TEAM_VIEW'
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'TEAM_VIEW' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Team</span>
          </button>

          <button
            onClick={() => setActiveTab('REPORTS')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1 px-4 rounded-2xl ${
              activeTab === 'REPORTS'
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'REPORTS' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px]">Reports</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
