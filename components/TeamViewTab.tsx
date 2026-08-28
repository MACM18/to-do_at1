'use client';

import React, { useState, useTransition } from 'react';
import {
  Users,
  Moon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import { triggerEveningSummaryAction } from '@/lib/actions/config-actions';

interface TeamViewTabProps {
  currentUser: any;
  users: any[];
  tasks: any[];
  logs: any[];
}

export default function TeamViewTab({
  currentUser,
  users,
  tasks,
  logs,
}: TeamViewTabProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [assigneeForNewTask, setAssigneeForNewTask] = useState(currentUser.id);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Filter active users
  const activeUsers = users.filter((u) => u.isActive);

  // Filtered users based on selector
  const displayedUsers =
    selectedUserId === 'ALL'
      ? activeUsers
      : activeUsers.filter((u) => u.id === selectedUserId);

  // Overall metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const teamCompletionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Evening summary report trigger
  const handleSendTeamSummary = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await triggerEveningSummaryAction();
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setStatusMessage(null), 6000);
    });
  };

  const handleOpenAssignModal = (memberId: string) => {
    setAssigneeForNewTask(memberId);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner with Team Overview Metrics */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Team Task Hub & Monitoring
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              Team Overview & Progress
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Monitoring {activeUsers.length} active team members across all current workflows
            </p>
          </div>

          <button
            onClick={handleSendTeamSummary}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-500/25 hover:bg-indigo-500/35 text-indigo-200 border border-indigo-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm shrink-0"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            Send Team Daily Report 🚀
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400">Active Members</div>
            <div className="text-xl font-black text-white mt-0.5">{activeUsers.length}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400">Total Tasks</div>
            <div className="text-xl font-black text-blue-400 mt-0.5">{totalTasks}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400">Completed</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{completedTasks}</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xs text-slate-400">Completion Rate</div>
            <div className="text-xl font-black text-purple-400 mt-0.5">{teamCompletionPercentage}%</div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/30'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Member Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedUserId('ALL')}
          className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all shrink-0 ${
            selectedUserId === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          All Members ({activeUsers.length})
        </button>

        {activeUsers.map((user) => {
          const userTaskCount = tasks.filter((t) => t.userId === user.id).length;
          return (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`px-3.5 py-1.5 rounded-2xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedUserId === user.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>{user.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedUserId === user.id
                    ? 'bg-blue-800 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {userTaskCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Team Member Cards Breakdown */}
      <div className="space-y-6">
        {displayedUsers.map((user) => {
          const memberTasks = tasks.filter((t) => t.userId === user.id);
          const memberCarryOver = memberTasks.filter(
            (t) => new Date(t.createdAt) < todayStart && t.status !== 'DONE'
          );
          const memberToday = memberTasks.filter(
            (t) => new Date(t.createdAt) >= todayStart || t.status === 'DONE'
          );
          const memberCompleted = memberTasks.filter((t) => t.status === 'DONE').length;
          const memberTotal = memberTasks.length;
          const memberRate =
            memberTotal > 0 ? Math.round((memberCompleted / memberTotal) * 100) : 0;

          // Today's log for this member
          const memberLogs = logs.filter(
            (l) => l.userId === user.id && new Date(l.date) >= todayStart
          );

          return (
            <div
              key={user.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4"
            >
              {/* Member Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {user.name}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user.role === 'LEAD'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>

                {/* Member Progress stats & Assign Button */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {memberCompleted}/{memberTotal} Done ({memberRate}%)
                    </div>
                    <div className="w-28 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${memberRate}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAssignModal(user.id)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Assign
                  </button>
                </div>
              </div>

              {/* Member's Daily Work Notes / Blockers */}
              {memberLogs.length > 0 && (
                <div className="space-y-2">
                  {memberLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        📝 <strong>Daily Log:</strong> {log.summary}
                      </div>
                      {log.blockers && (
                        <div className="mt-1 text-red-600 dark:text-red-400 font-medium">
                          🚨 <strong>Blocker:</strong> {log.blockers}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Member's Tasks List */}
              <div className="space-y-2">
                {memberTasks.length > 0 ? (
                  memberTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isCarryOver={new Date(task.createdAt) < todayStart && task.status !== 'DONE'}
                    />
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    No active tasks assigned to {user.name}.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        users={activeUsers}
        currentUserId={assigneeForNewTask}
      />
    </div>
  );
}
