'use client';

import React, { useState, useTransition } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Loader2,
  Sparkles,
} from 'lucide-react';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import DailyLogModal from './DailyLogModal';
import { createTask } from '@/lib/actions/task-actions';
import { triggerMorningReportAction, triggerEveningSummaryAction } from '@/lib/actions/config-actions';

interface MyTasksTabProps {
  currentUser: any;
  users: any[];
  tasks: any[];
  logs: any[];
}

export default function MyTasksTab({
  currentUser,
  users,
  tasks,
  logs,
}: MyTasksTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickRecurrence, setQuickRecurrence] = useState('NONE');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter tasks for current user
  const userTasks = tasks.filter((t) => t.userId === currentUser.id);

  // Today's date calculations
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const carryOverTasks = userTasks.filter(
    (t) => new Date(t.createdAt) < todayStart && t.status !== 'DONE'
  );

  const todayTasks = userTasks.filter(
    (t) => new Date(t.createdAt) >= todayStart || t.status === 'DONE'
  );

  // Filtered lists based on search and status
  const filterList = (list: any[]) => {
    return list.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterStatus === 'ACTIVE') return t.status !== 'DONE';
      if (filterStatus === 'DONE') return t.status === 'DONE';
      return true;
    });
  };

  const filteredCarryOver = filterList(carryOverTasks);
  const filteredToday = filterList(todayTasks);

  const completedCount = userTasks.filter((t) => t.status === 'DONE').length;
  const totalCount = userTasks.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Handle Quick Add task
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const title = quickTitle;
    const rec = quickRecurrence;
    setQuickTitle('');

    startTransition(async () => {
      await createTask({
        title,
        userId: currentUser.id,
        recurrence: rec,
      });
    });
  };

  // Morning report trigger
  const handleSendMorningReport = () => {
    setStatusMessage(null);
    startTransition(async () => {
      const res = await triggerMorningReportAction(currentUser.id);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setStatusMessage(null), 6000);
    });
  };

  // Evening summary trigger
  const handleSendEveningReport = () => {
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

  // User's today's log
  const todayLogs = logs.filter(
    (l) =>
      l.userId === currentUser.id &&
      new Date(l.date) >= todayStart
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner with Date & Fast Email Action Triggers */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400">
              Personal Work Focus
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              {currentUser.name}&apos;s To-Do List
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })} • {completedCount}/{totalCount} tasks completed ({completionPercentage}%)
            </p>
          </div>

          {/* Quick Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSendMorningReport}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Send Morning Plan & Carry-over Backlog Email"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              Send Morning Plan 🚀
            </button>

            <button
              onClick={handleSendEveningReport}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
              title="Send Daily Progress Summary to Team"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
              Send Daily Log 🚀
            </button>
          </div>
        </div>

        {/* Status Toast Alert */}
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

      {/* Daily Work Log Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Today&apos;s Daily Log & Blockers
              </h2>
              <p className="text-xs text-slate-500">
                {todayLogs.length > 0 ? 'Recorded and ready for evening summary' : 'No notes recorded yet today'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {todayLogs.length > 0 ? 'Add Note' : 'Write Log'}
          </button>
        </div>

        {todayLogs.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {todayLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200">{log.summary}</div>
                {log.blockers && (
                  <div className="mt-1.5 text-red-600 dark:text-red-400 font-medium">
                    🚨 <strong>Blocker:</strong> {log.blockers}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your tasks or subtasks..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>

        {/* Status Filter Chips & Add Task Button */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1 rounded-2xl">
            {(['ALL', 'ACTIVE', 'DONE'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition-all ${
                  filterStatus === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Pending' : 'Done'}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* 1. Pending Carry-Over Backlogs Section */}
      {filteredCarryOver.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-amber-900 dark:text-amber-400">
              Carry-Over Backlog ({filteredCarryOver.length})
            </h2>
            <span className="text-xs text-slate-400">Pending from previous days</span>
          </div>

          <div className="space-y-2.5">
            {filteredCarryOver.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isCarryOver={true}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* 2. Today's Focus & Scheduled Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Today&apos;s Focus & Tasks ({filteredToday.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {filteredToday.filter((t) => t.status === 'DONE').length}/{filteredToday.length} done
          </span>
        </div>

        {filteredToday.length > 0 ? (
          <div className="space-y-2.5">
            {filteredToday.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isCarryOver={false}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsTaskModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-500 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No tasks scheduled for today
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add a quick task using the bar below or tap &quot;New Task&quot; to break it down with subtasks.
            </p>
          </div>
        )}
      </div>

      {/* Docked Quick Add Task Bar (Floating on Mobile) */}
      <div className="sticky bottom-20 z-20">
        <form
          onSubmit={handleQuickAdd}
          className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/90 rounded-2xl p-2 shadow-xl flex items-center gap-2"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="⚡ Quick add task title..."
            className="flex-1 px-3 py-2 text-xs bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />

          {/* Recurrence Dropdown */}
          <select
            value={quickRecurrence}
            onChange={(e) => setQuickRecurrence(e.target.value)}
            className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
            title="Task Recurrence"
          >
            <option value="NONE">One-off</option>
            <option value="DAILY">Daily 🔁</option>
            <option value="WEEKLY">Weekly 🔁</option>
          </select>

          <button
            type="submit"
            disabled={!quickTitle.trim() || isPending}
            className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-bold transition-all active:scale-95 shadow-md shadow-blue-500/20"
            title="Create Task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        users={users}
        currentUserId={currentUser.id}
        editingTask={editingTask}
      />

      {/* Daily Log Modal */}
      <DailyLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        userId={currentUser.id}
        userName={currentUser.name}
      />
    </div>
  );
}
