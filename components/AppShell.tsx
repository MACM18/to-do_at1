'use client';

import React, { useState, useTransition } from 'react';
import {
  CheckSquare,
  Users,
  Settings,
  RefreshCw,
  LogOut,
  UserCheck,
  Shield,
  Loader2,
} from 'lucide-react';
import MyTasksTab from './MyTasksTab';
import TeamViewTab from './TeamViewTab';
import SettingsTab from './SettingsTab';
import UserSwitcher from './UserSwitcher';
import { logoutAction } from '@/lib/actions/auth-actions';
import { useRouter } from 'next/navigation';

interface AppShellProps {
  sessionUser: any;
  initialUsers: any[];
  initialTasks: any[];
  initialLogs: any[];
  initialConfig: any;
}

export default function AppShell({
  sessionUser,
  initialUsers,
  initialTasks,
  initialLogs,
  initialConfig,
}: AppShellProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'MY_TASKS' | 'TEAM_VIEW' | 'SETTINGS'>('MY_TASKS');
  const [currentUserId, setCurrentUserId] = useState<string>(sessionUser?.id || initialUsers[0]?.id || '');
  const [isLoggingOut, startLogoutTransition] = useTransition();

  const currentUser =
    initialUsers.find((u) => u.id === currentUserId) || sessionUser || initialUsers[0] || {
      id: 'default',
      name: 'Chathura',
      email: 'chathura@example.com',
      role: 'LEAD',
    };

  const handleUserChange = (newUserId: string) => {
    setCurrentUserId(newUserId);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 safe-top">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Daily Focus
              </div>
              <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">
                Task & Team Hub
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => {
                setCurrentUserId(sessionUser.id);
                setActiveTab('MY_TASKS');
              }}
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

          {/* Right Header: Refresh, User Profile & Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* In Team View / Settings: user switcher if lead */}
            {activeTab !== 'MY_TASKS' && initialUsers.length > 0 ? (
              <UserSwitcher
                users={initialUsers}
                currentUser={currentUser}
                onUserChange={handleUserChange}
              />
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {sessionUser.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{sessionUser.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    sessionUser.role === 'LEAD'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}
                >
                  {sessionUser.role}
                </span>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Sign Out"
            >
              {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6">
        {activeTab === 'MY_TASKS' && (
          <MyTasksTab
            currentUser={currentUser}
            users={initialUsers}
            tasks={initialTasks}
            logs={initialLogs}
            config={initialConfig}
          />
        )}

        {activeTab === 'TEAM_VIEW' && (
          <TeamViewTab
            currentUser={currentUser}
            users={initialUsers}
            tasks={initialTasks}
            logs={initialLogs}
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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 safe-bottom shadow-lg">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-around">
          <button
            onClick={() => {
              setCurrentUserId(sessionUser.id);
              setActiveTab('MY_TASKS');
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1 px-4 rounded-2xl ${
              activeTab === 'MY_TASKS'
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <CheckSquare className={`w-5 h-5 ${activeTab === 'MY_TASKS' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">My Tasks</span>
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
            <span className="text-[11px]">Team View</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex flex-col items-center justify-center gap-1 transition-all py-1 px-4 rounded-2xl ${
              activeTab === 'SETTINGS'
                ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'SETTINGS' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[11px]">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
