'use client';

import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  FileSpreadsheet,
  Printer,
  Mail,
  ChevronRight,
  Sparkles,
  Copy,
} from 'lucide-react';
import TeamTaskCard from './TeamTaskCard';
import TeamTaskModal from './TeamTaskModal';
import TeamTaskCreator from './TeamTaskCreator';
import UserModal from './UserModal';
import MonthlyReportModal from './MonthlyReportModal';
import ExecutiveReportModal from './ExecutiveReportModal';
import { getDayBounds, getReportTimeSlots } from '@/lib/time-utils';

interface TeamViewTabProps {
  currentUser: any;
  sessionUser?: any;
  users: any[];
  tasks: any[];
  logs: any[];
}

export default function TeamViewTab({
  currentUser,
  sessionUser,
  users,
  tasks,
  logs,
}: TeamViewTabProps) {
  const loggedInUserId = sessionUser?.id || currentUser?.id;
  const activeUsers = users.filter((u) => u.isActive);
  const otherMembers = activeUsers.filter((u) => u.id !== loggedInUserId);
  const defaultSelectedUser =
    otherMembers[0] || activeUsers.find((u) => u.id !== loggedInUserId) || activeUsers[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultSelectedUser?.id || 'ALL'
  );
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [executiveReportType, setExecutiveReportType] = useState<'MONDAY' | 'SATURDAY' | 'MONTHLY'>('MONDAY');
  const [editingTask, setEditingTask] = useState<any>(null);

  const { startOfDay: todayStart } = getDayBounds(new Date());
  const { isMondaySlot, isSaturdaySlot, isMonthlySlot, isLastSaturday } = getReportTimeSlots(new Date());

  const selectedUser =
    activeUsers.find((u) => u.id === selectedUserId) ||
    defaultSelectedUser ||
    activeUsers[0];

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const teamCompletionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Selected member's tasks
  const memberTasks = selectedUser ? tasks.filter((t) => t.userId === selectedUser.id) : [];
  const memberCarryOver = memberTasks.filter(
    (t) => new Date(t.createdAt) < todayStart && t.status !== 'DONE'
  );
  const memberActive = memberTasks.filter(
    (t) => new Date(t.createdAt) >= todayStart && t.status !== 'DONE'
  );
  const memberCompleted = memberTasks.filter(
    (t) =>
      t.status === 'DONE' &&
      (new Date(t.updatedAt) >= todayStart ||
        new Date(t.createdAt) >= todayStart ||
        t.recurrence === 'DAILY' ||
        t.recurrence === 'WEEKLY')
  );
  const memberRate =
    memberTasks.length > 0 ? Math.round((memberCompleted.length / memberTasks.length) * 100) : 0;

  const memberLogs = selectedUser
    ? logs.filter((l) => l.userId === selectedUser.id && new Date(l.date) >= todayStart)
    : [];

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Member Deliverables & Task Feed (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Member Profile Header Card */}
          {selectedUser && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-blue-500/20">
                    {selectedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedUser.name}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedUser.role === 'LEAD'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {memberCompleted.length}/{memberTasks.length} Completed ({memberRate}%)
                    </div>
                    <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${memberRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Member's Today's Work Log */}
              {memberLogs.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {memberLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.summary}
                      </div>
                      {log.blockers && (
                        <div className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                          <strong>Blocker:</strong> {log.blockers}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Assign Task Bar for Selected Member */}
          {selectedUser && (
            <TeamTaskCreator
              userId={selectedUser.id}
              userName={selectedUser.name}
            />
          )}

          {/* Section 1: Member's Carry-Over Backlog */}
          {memberCarryOver.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Pending Backlog ({memberCarryOver.length})
                </h3>
              </div>

              <div className="space-y-2.5">
                {memberCarryOver.map((task) => (
                  <TeamTaskCard
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

          {/* Section 2: Member's Active Tasks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Active Tasks ({memberActive.length})
              </h3>
              <span className="text-[11px] text-slate-400">{memberCompleted.length} done</span>
            </div>

            {memberActive.length > 0 ? (
              <div className="space-y-2.5">
                {memberActive.map((task) => (
                  <TeamTaskCard
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
                No active tasks pending for {selectedUser?.name}.
              </div>
            )}
          </div>

          {/* Section 3: Compacted Completed Tasks */}
          {memberCompleted.length > 0 && (
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Today&apos;s Completed Tasks ({memberCompleted.length})</span>
              </div>
              <div className="space-y-1.5">
                {memberCompleted.map((task) => (
                  <TeamTaskCard
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
            </div>
          )}
        </div>

        {/* Right Column: Monthly Reporting Hub & Member Switcher (4 Cols on Desktop) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Executive Reporting & Analytics Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Reports & Analytics
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                Executive Team Reports
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manual reports generated during their scheduled weekly timeframes
              </p>
            </div>

            {/* Scheduled Report Actions: Only visible during active slots */}
            <div className="space-y-2">
              {isMondaySlot && (
                <button
                  onClick={() => {
                    setExecutiveReportType('MONDAY');
                    setIsExecutiveModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-98 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/20 text-white">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Monday Developer Workplan</div>
                      <div className="text-[10px] font-normal text-blue-100">
                        Active: Monday 10:00 AM - EOD
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}

              {isSaturdaySlot && !isMonthlySlot && (
                <button
                  onClick={() => {
                    setExecutiveReportType('SATURDAY');
                    setIsExecutiveModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-98 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/20 text-white">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Saturday Weekly Progress Report</div>
                      <div className="text-[10px] font-normal text-indigo-100">
                        Active: Saturday 1:30 PM - EOD
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}

              {isMonthlySlot && (
                <button
                  onClick={() => {
                    setExecutiveReportType('MONTHLY');
                    setIsExecutiveModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all active:scale-98 shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/20 text-white">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold">Monthly Team Progress Report</div>
                      <div className="text-[10px] font-normal text-purple-100">
                        Active: Last Sat 1:30 PM - Month End
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}

              {!isMondaySlot && !isSaturdaySlot && !isMonthlySlot && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 space-y-1.5">
                  <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Report Generation Schedule:</span>
                  </div>
                  <div className="text-[11px] pl-5">• Monday: 10:00 AM – End of Day</div>
                  <div className="text-[11px] pl-5">• Saturday: 1:30 PM – End of Day</div>
                  <div className="text-[11px] pl-5">• Monthly: Last Saturday 1:30 PM – Month End</div>
                </div>
              )}

              <button
                onClick={() => setIsMonthlyModalOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Monthly CSV & Print Archive</div>
                    <div className="text-[10px] font-normal text-slate-500">
                      Historical Month Selector
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Overall Team Progress Metric */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Total Team Progress
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {teamCompletionPercentage}%
                </span>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${teamCompletionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>{completedTasks} Done</span>
                <span>{totalTasks - completedTasks} Remaining</span>
              </div>
            </div>
          </div>

          {/* Team Member Selector List Widget */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Team Members ({activeUsers.length})
              </h4>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95 border border-indigo-200/60 dark:border-indigo-800"
                title="Add New Member"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">Add Member</span>
              </button>
            </div>

            <div className="space-y-2">
              {/* Prioritize other members, with current user at end */}
              {[
                ...activeUsers.filter((u) => u.id !== currentUser.id),
                ...activeUsers.filter((u) => u.id === currentUser.id),
              ].map((u) => {
                const uTasks = tasks.filter((t) => t.userId === u.id);
                const uDone = uTasks.filter((t) => t.status === 'DONE').length;
                const isSelected = selectedUserId === u.id;
                const isSelf = u.id === currentUser.id;

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 shadow-sm'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isSelf && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {uDone}/{uTasks.length} completed
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Member Modal */}
      <UserModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
      />

      {/* Team Task Creation & Edit Modal */}
      <TeamTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        userId={selectedUser?.id || currentUser.id}
        userName={selectedUser?.name}
        editingTask={editingTask}
      />

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        users={activeUsers}
        initialUserId={selectedUserId !== 'ALL' ? selectedUserId : 'ALL'}
      />

      {/* Executive Weekly / Monthly Report Modal */}
      <ExecutiveReportModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        initialType={executiveReportType}
      />
    </div>
  );
}
