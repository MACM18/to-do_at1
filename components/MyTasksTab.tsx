'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Sun,
  Moon,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Loader2,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  CheckCheck,
  Check,
  Users,
  Play,
} from 'lucide-react';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import DailyLogModal from './DailyLogModal';
import MeetingModal from './MeetingModal';
import CompactTaskCreator from './CompactTaskCreator';
import { triggerMorningReportAction, triggerEveningSummaryAction } from '@/lib/actions/config-actions';
import { saveTodayShift, getTodayShift } from '@/lib/actions/shift-actions';
import { getDayBounds } from '@/lib/time-utils';

interface MyTasksTabProps {
  currentUser: any;
  users: any[];
  tasks: any[];
  logs: any[];
  config?: any;
  initialMeetings?: any[];
}

export default function MyTasksTab({
  currentUser,
  users,
  tasks,
  logs,
  config,
  initialMeetings = [],
}: MyTasksTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ALL');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const todayDay = new Date().getDay(); // 0: Sunday, 6: Saturday
  const defaultShiftEnd = todayDay === 6 ? '1.30' : config?.shiftEndTime || '5.30';

  // Daily custom check-in & check-out state
  const [checkInTime, setCheckInTime] = useState(config?.shiftStartTime || '8.30');
  const [checkOutTime, setCheckOutTime] = useState(defaultShiftEnd);
  const [isShiftSaved, setIsShiftSaved] = useState(false);

  useEffect(() => {
    async function loadShift() {
      if (currentUser?.id) {
        const shift = await getTodayShift(currentUser.id);
        if (shift) {
          if (shift.shiftStartTime) setCheckInTime(shift.shiftStartTime);
          if (shift.shiftEndTime) setCheckOutTime(shift.shiftEndTime);
        } else if (todayDay === 6) {
          setCheckOutTime('1.30');
        }
      }
    }
    loadShift();
  }, [currentUser?.id, todayDay]);

  // Filter tasks strictly for current user
  const userTasks = tasks.filter((t) => t.userId === currentUser.id);

  const { startOfDay: todayStart } = getDayBounds(new Date());

  // Ongoing tasks: Started (has startTime) or in progress, not done
  const ongoingTasks = userTasks.filter(
    (t) => t.status !== 'DONE' && (Boolean(t.startTime) || t.status === 'IN_PROGRESS')
  );

  // Carry-over backlog: Not started yet, created before today
  const carryOverTasks = userTasks.filter(
    (t) =>
      new Date(t.createdAt) < todayStart &&
      t.status !== 'DONE' &&
      !t.startTime &&
      t.status !== 'IN_PROGRESS'
  );

  // Scheduled for today: Not started yet, created today
  const activeTodayTasks = userTasks.filter(
    (t) =>
      new Date(t.createdAt) >= todayStart &&
      t.status !== 'DONE' &&
      !t.startTime &&
      t.status !== 'IN_PROGRESS'
  );

  // Today's completed tasks (including recurring tasks completed today)
  const completedTasks = userTasks.filter(
    (t) =>
      t.status === 'DONE' &&
      (new Date(t.updatedAt) >= todayStart ||
        new Date(t.createdAt) >= todayStart ||
        t.recurrence === 'DAILY' ||
        t.recurrence === 'WEEKLY')
  );

  // Filter logic
  const filterList = (list: any[]) => {
    return list.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  };

  const filteredOngoing = filterList(ongoingTasks);
  const filteredCarryOver = filterList(carryOverTasks);
  const filteredActiveToday = filterList(activeTodayTasks);
  const filteredCompleted = filterList(completedTasks);

  const totalCount = userTasks.length;
  const completedCount = completedTasks.length;
  const totalProgressSum = userTasks.reduce((sum, t) => sum + (t.progress || 0), 0);
  const averageProductivity = totalCount > 0 ? (totalProgressSum / totalCount).toFixed(2) : '0.00';

  // Save Today's Shift Times
  const handleSaveShiftTimes = () => {
    startTransition(async () => {
      await saveTodayShift({
        userId: currentUser.id,
        shiftStartTime: checkInTime,
        shiftEndTime: checkOutTime,
      });
      setIsShiftSaved(true);
      setTimeout(() => setIsShiftSaved(false), 2500);
    });
  };

  // Morning report trigger with custom check-in time
  const handleSendMorningReport = () => {
    setStatusMessage(null);
    startTransition(async () => {
      await saveTodayShift({
        userId: currentUser.id,
        shiftStartTime: checkInTime,
        shiftEndTime: checkOutTime,
      });

      const res = await triggerMorningReportAction(currentUser.id, undefined, checkInTime);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setStatusMessage(null), 6000);
    });
  };

  // Evening report trigger with custom check-out time
  const handleSendEveningReport = () => {
    setStatusMessage(null);
    startTransition(async () => {
      await saveTodayShift({
        userId: currentUser.id,
        shiftStartTime: checkInTime,
        shiftEndTime: checkOutTime,
      });

      const res = await triggerEveningSummaryAction(undefined, currentUser.id, checkOutTime);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setStatusMessage(null), 6000);
    });
  };

  // User's today logs
  const todayLogs = logs.filter(
    (l) => l.userId === currentUser.id && new Date(l.date) >= todayStart
  );

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* Status Toast Alert */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2.5 animate-in fade-in duration-150 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
              : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Tasks Feed & Creator (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Creative Compact Task Creator Bar (Desktop only, mobile uses floating action button) */}
          <div className="hidden sm:block">
            <CompactTaskCreator userId={currentUser.id} />
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks or search keywords..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            <div className="flex bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              {(['ALL', 'ACTIVE', 'DONE'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    filterStatus === status
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {status === 'ALL' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Done'}
                </button>
              ))}
            </div>
          </div>

          {/* Section 0: Highlighted Ongoing Tasks */}
          {(filterStatus === 'ALL' || filterStatus === 'ACTIVE') && filteredOngoing.length > 0 && (
            <div className="space-y-3 p-4 rounded-3xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/90 dark:border-blue-900/60 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    Ongoing Tasks ({filteredOngoing.length})
                  </h2>
                </div>
                <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                  Currently In Progress
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredOngoing.map((task) => (
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
            </div>
          )}

          {/* Section 1: Carry-Over Backlogs */}
          {(filterStatus === 'ALL' || filterStatus === 'ACTIVE') && filteredCarryOver.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    Pending Backlog ({filteredCarryOver.length})
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">Carry-over from past days</span>
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

          {/* Section 2: Today's Active Tasks */}
          {(filterStatus === 'ALL' || filterStatus === 'ACTIVE') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Today&apos;s Active Tasks ({filteredActiveToday.length})
                  </h2>
                </div>
                <span className="text-[11px] text-slate-400">Scheduled for today</span>
              </div>

              {filteredActiveToday.length > 0 ? (
                <div className="space-y-2.5">
                  {filteredActiveToday.map((task) => (
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
                <div className="p-6 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  No active tasks for today. Add a new task using the box above.
                </div>
              )}
            </div>
          )}

          {/* Section 3: Compacted Completed Tasks at the Bottom */}
          {(filterStatus === 'ALL' || filterStatus === 'DONE') && filteredCompleted.length > 0 && (
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <button
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                className="flex items-center justify-between w-full py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Today&apos;s Completed Tasks ({filteredCompleted.length})</span>
                </div>
                {isCompletedExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {isCompletedExpanded && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  {filteredCompleted.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      isCompactDone={true}
                      onEdit={(t) => {
                        setEditingTask(t);
                        setIsTaskModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Desktop Executive Action & Shift Timings (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Today's Shift & Check-in / Check-out Time Customizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-500" /> Today&apos;s Shift Hours
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Check-in & Check-out
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      todayDay === 0
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : todayDay === 6
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {todayDay === 0
                      ? 'Sunday (Off Day)'
                      : todayDay === 6
                      ? 'Saturday (8.30 - 1.30)'
                      : 'Mon-Fri (8.30 - 5.30)'}
                  </span>
                </div>
              </div>
              {isShiftSaved && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Check-in (e.g. 8.30)
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  onBlur={handleSaveShiftTimes}
                  placeholder="8.30"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Check-out (e.g. 5.30)
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  onBlur={handleSaveShiftTimes}
                  placeholder="5.30"
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Times are applied directly to morning Day Plan and evening Task Log reports.
            </p>
          </div>

          {/* Easy-to-Access Action Buttons Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Email Dispatch
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Quick Actions
              </h3>
            </div>

            {/* Easy-to-Access Buttons Grid */}
            <div className="space-y-2.5">
              <button
                onClick={handleSendMorningReport}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Send Day Plan</div>
                    <div className="text-[10px] font-normal text-amber-700 dark:text-amber-400">
                      Uses check-in: {checkInTime}
                    </div>
                  </div>
                </div>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 text-amber-600" />}
              </button>

              <button
                onClick={handleSendEveningReport}
                disabled={isPending}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-200 text-xs font-bold transition-all active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600 text-white">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Send Task Log</div>
                    <div className="text-[10px] font-normal text-indigo-700 dark:text-indigo-400">
                      Uses check-out: {checkOutTime}
                    </div>
                  </div>
                </div>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 text-indigo-600" />}
              </button>

              <button
                onClick={() => {
                  setEditingMeeting(null);
                  setIsMeetingModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-950/60 border border-sky-200/80 dark:border-sky-900/50 text-sky-900 dark:text-sky-200 text-xs font-bold transition-all active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-600 text-white">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Log Meeting Period</div>
                    <div className="text-[10px] font-normal text-sky-700 dark:text-sky-400">
                      Record meeting start & end times
                    </div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-sky-600" />
              </button>

              <button
                onClick={() => setIsLogModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-700 text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Write Daily Log</div>
                    <div className="text-[10px] font-normal text-slate-500">
                      Record accomplishments & blockers
                    </div>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Productivity Gauge Widget */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Overall Productivity
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {averageProductivity}%
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(Number(averageProductivity), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{completedCount} Completed</span>
                <span>{totalCount - completedCount} In Progress</span>
              </div>
            </div>
          </div>

          {/* Today's Logged Meetings Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-500" />
                Today&apos;s Meetings ({initialMeetings.length})
              </h4>
              <button
                onClick={() => {
                  setEditingMeeting(null);
                  setIsMeetingModalOpen(true);
                }}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                + Log Meeting
              </button>
            </div>

            {initialMeetings.length > 0 ? (
              <div className="space-y-2">
                {initialMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setEditingMeeting(m);
                      setIsMeetingModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-xs space-y-1 cursor-pointer hover:border-sky-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate flex-1">
                        {m.title}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {m.startTime} - {m.endTime}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{m.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No meetings logged for today yet.
              </p>
            )}
          </div>

          {/* Daily Work Notes Preview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Today&apos;s Notes & Blockers
              </h4>
              <button
                onClick={() => setIsLogModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {todayLogs.length > 0 ? '+ Add' : 'Write'}
              </button>
            </div>

            {todayLogs.length > 0 ? (
              <div className="space-y-2">
                {todayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="text-slate-800 dark:text-slate-200">{log.summary}</div>
                    {log.blockers && (
                      <div className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                        <strong>Blocker:</strong> {log.blockers}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                No work log notes recorded for today yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) positioned safely above the bottom navbar */}
      <div className="sm:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-5 z-40">
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 flex items-center justify-center transition-transform active:scale-90 hover:scale-105 border-2 border-white dark:border-slate-800"
          aria-label="Add Task"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
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

      {/* Meeting Logging Modal */}
      <MeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        userId={currentUser.id}
        editingMeeting={editingMeeting}
      />
    </div>
  );
}
