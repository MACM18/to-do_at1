'use client';

import React, { useState, useTransition } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit2,
  Calendar,
  CalendarDays,
  Zap,
  Flame,
  Check,
  Percent,
  UserCheck,
} from 'lucide-react';
import { updateTeamTaskStatusAndProgress, deleteTask, reassignTeamTask } from '@/lib/actions/task-actions';
import ConfirmDialog from './ConfirmDialog';
import confetti from 'canvas-confetti';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  dueDate: Date | string | null;
  recurrence: string;
  userId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface TeamTaskCardProps {
  task: Task;
  users?: any[];
  isCarryOver?: boolean;
  isCompactDone?: boolean;
  onEdit?: (task: Task) => void;
}

/**
 * Renders a countdown badge for remaining days on task cards
 */
function renderDueDateBadge(dueDate: Date | string | null | undefined, isDone: boolean) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();

  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dueMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const monthDay = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500">
        <Calendar className="w-2.5 h-2.5 opacity-60" />
        <span>was due {monthDay}</span>
      </span>
    );
  }

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 animate-pulse">
        <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-500" />
        <span>{overdueDays}d Overdue</span>
      </span>
    );
  }

  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
        <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500" />
        <span>Due Today</span>
      </span>
    );
  }

  if (diffDays === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
        <Clock className="w-3 h-3 text-sky-600 dark:text-sky-400" />
        <span>Due Tomorrow</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      <Calendar className="w-2.5 h-2.5 text-slate-400" />
      <span>{diffDays}d left ({monthDay})</span>
    </span>
  );
}

export default function TeamTaskCard({
  task,
  users,
  isCarryOver = false,
  isCompactDone = false,
  onEdit,
}: TeamTaskCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [customProgress, setCustomProgress] = useState(task.progress || 0);
  const [isPending, startTransition] = useTransition();

  const isDone = task.status === 'DONE' || task.progress === 100;
  const isInProgress = task.status === 'IN_PROGRESS' || (task.progress > 0 && task.progress < 100);

  const handleUpdateProgress = (targetProgress: number, targetStatus?: string) => {
    const clamped = Math.max(0, Math.min(100, Math.round(targetProgress)));
    setCustomProgress(clamped);

    startTransition(async () => {
      await updateTeamTaskStatusAndProgress(task.id, clamped, targetStatus);
      if (clamped === 100 || targetStatus === 'DONE') {
        try {
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.8 },
          });
        } catch {
          // ignore
        }
      }
    });
  };

  const handleReassign = (newUserId: string) => {
    if (!newUserId || newUserId === task.userId) return;
    startTransition(async () => {
      await reassignTeamTask(task.id, newUserId);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  };

  // Compact Completed Row View
  if (isCompactDone) {
    return (
      <div className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-800/70 transition-all text-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            onClick={() => handleUpdateProgress(0, 'TODO')}
            className="text-emerald-600 dark:text-emerald-400 shrink-0 hover:scale-110 transition-transform"
            title="Mark as Incomplete"
          >
            <CheckCircle2 className="w-4 h-4 fill-emerald-100 dark:fill-emerald-950" />
          </button>
          <span className="truncate text-slate-500 line-through font-medium">
            {task.title}
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
            100%
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {users && users.length > 1 && (
            <select
              value={task.userId}
              disabled={isPending}
              onChange={(e) => handleReassign(e.target.value)}
              className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer max-w-[110px] truncate mr-1"
              title="Change task owner"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <ConfirmDialog
          isOpen={isConfirmOpen}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Delete Team Task"
          message="Are you sure you want to delete this task?"
          confirmText="Delete"
          isDestructive
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md ${
        isDone
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
          : isCarryOver
          ? 'bg-amber-50/20 dark:bg-amber-950/10 border-amber-200/80 dark:border-amber-900/40'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Top Meta Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Status Badge Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleUpdateProgress(0, 'TODO')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                task.status === 'TODO' && task.progress === 0
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              TODO
            </button>
            <button
              onClick={() => handleUpdateProgress(task.progress > 0 ? task.progress : 50, 'IN_PROGRESS')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                isInProgress
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              IN PROGRESS
            </button>
            <button
              onClick={() => handleUpdateProgress(100, 'DONE')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                isDone
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              DONE
            </button>
          </div>

          {/* Right Meta & Actions */}
          <div className="flex items-center gap-2">
            {renderDueDateBadge(task.dueDate, isDone)}

            <div className="flex items-center gap-1 text-slate-400">
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Edit Task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Task Title & Description */}
        <div>
          <h4
            className={`text-sm font-semibold leading-snug ${
              isDone
                ? 'text-slate-400 dark:text-slate-500 line-through'
                : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {task.title}
          </h4>
          {task.description && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Evening Manual Progress Adjuster */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Percent className="w-3 h-3 text-indigo-500" />
              <span>Completion:</span>
            </span>
            <span className="font-bold font-mono text-xs text-slate-800 dark:text-slate-200">
              {task.progress || 0}%
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone
                  ? 'bg-emerald-500'
                  : task.progress > 0
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>

          {/* Quick Preset Buttons (0%, 25%, 50%, 75%, 100%) */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[0, 25, 50, 75, 100].map((val) => {
              const isSelected = (task.progress || 0) === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleUpdateProgress(val)}
                  disabled={isPending}
                  className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                    isSelected
                      ? val === 100
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {val}%
                </button>
              );
            })}
          </div>

          {/* Quick Member / Owner Reassignment Selector */}
          {users && users.length > 1 && (
            <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Reassign Owner:</span>
              </span>
              <select
                value={task.userId}
                disabled={isPending}
                onChange={(e) => handleReassign(e.target.value)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[170px] truncate transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Reassign task to another team member"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === task.userId ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Team Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        confirmText="Delete"
        isDestructive
      />
    </div>
  );
}
