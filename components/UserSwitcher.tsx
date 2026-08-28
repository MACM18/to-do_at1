'use client';

import React from 'react';
import { User, ChevronDown } from 'lucide-react';

interface UserSwitcherProps {
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onUserChange: (userId: string) => void;
}

export default function UserSwitcher({
  users,
  currentUser,
  onUserChange,
}: UserSwitcherProps) {
  return (
    <div className="relative inline-flex items-center">
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 px-3 py-1.5 rounded-2xl transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60">
        <div className="w-6 h-6 rounded-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-xs">
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <select
          value={currentUser.id}
          onChange={(e) => onUserChange(e.target.value)}
          className="appearance-none bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 pr-5 focus:outline-none cursor-pointer"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
              {u.name} ({u.role})
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
      </div>
    </div>
  );
}
