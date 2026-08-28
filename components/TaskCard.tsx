'use client';

import React, { useState, useTransition } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  Repeat,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import {
  toggleTaskComplete,
  toggleSubtask,
  addSubtask,
  deleteSubtask,
  deleteTask,
} from '@/lib/actions/task-actions';
import { formatDate } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  taskId: string;
}

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
  subtasks: Subtask[];
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface TaskCardProps {
  task: Task;
  isCarryOver?: boolean;
  onEdit?: (task: Task) => void;
  showAssignee?: boolean;
}

export default function TaskCard({
  task,
  isCarryOver = false,
  onEdit,
  showAssignee = false,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isPending, startTransition] = useTransition();

  const isDone = task.status === 'DONE' || task.progress === 100;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.isDone).length || 0;

  const handleMainToggle = () => {
    startTransition(async () => {
      await toggleTaskComplete(task.id, task.status);
      if (!isDone) {
        // Fire celebration confetti if turning done
        try {
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
          });
        } catch {
          // ignore if unavailable
        }
      }
    });
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    startTransition(async () => {
      const result = await toggleSubtask(subtaskId, task.id);
      if (result && result.status === 'DONE') {
        try {
          confetti({
            particleCount: 45,
            spread: 70,
            origin: { y: 0.8 },
          });
        } catch {
          // ignore
        }
      }
    });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const title = newSubtaskTitle;
    setNewSubtaskTitle('');
    startTransition(async () => {
      await addSubtask(task.id, title);
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    startTransition(async () => {
      await deleteSubtask(subtaskId, task.id);
    });
  };

  const handleDeleteTask = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      startTransition(async () => {
        await deleteTask(task.id);
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isDone
          ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
          : isCarryOver
          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 shadow-sm'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Completion Action Button */}
          <button
            onClick={handleMainToggle}
            disabled={isPending}
            className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
            title={isDone ? 'Mark as Incomplete' : 'Mark as Done'}
          >
            {isDone ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50 dark:fill-emerald-950/40 transition-transform active:scale-90" />
            ) : (
              <Circle className="w-6 h-6 hover:stroke-blue-500 transition-transform active:scale-90" />
            )}
          </button>

          {/* Main Title & Metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {isCarryOver && !isDone && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <AlertCircle className="w-3 h-3" /> Backlog
                </span>
              )}
              {task.recurrence !== 'NONE' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  <Repeat className="w-3 h-3" /> {task.recurrence}
                </span>
              )}
              {showAssignee && task.user && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  👤 {task.user.name}
                </span>
              )}
              {task.dueDate && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3 h-3" /> {formatDate(task.dueDate)}
                </span>
              )}
            </div>

            <h3
              className={`text-base font-medium leading-snug break-words ${
                isDone
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-slate-100'
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p
                className={`text-xs mt-1 leading-relaxed line-clamp-2 ${
                  isDone
                    ? 'text-slate-400 dark:text-slate-600'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {task.description}
              </p>
            )}

            {/* Progress Bar & Subtask Indicator */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isDone
                      ? 'bg-emerald-500'
                      : task.progress > 0
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-transparent'
                  }`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 min-w-[36px] text-right">
                {task.progress}%
              </span>

              {hasSubtasks && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                >
                  <span>
                    {completedSubtasks}/{task.subtasks.length} subtasks
                  </span>
                  {expanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              {!hasSubtasks && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> Subtask
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions Dropdown / Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit Task"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleDeleteTask}
              disabled={isPending}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Subtasks Section */}
        {expanded && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Subtasks ({completedSubtasks}/{task.subtasks?.length || 0})
            </div>

            {task.subtasks?.map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <button
                  onClick={() => handleSubtaskToggle(subtask.id)}
                  disabled={isPending}
                  className="flex items-center gap-2.5 flex-1 text-left"
                >
                  {subtask.isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span
                    className={`text-xs ${
                      subtask.isDone
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {subtask.title}
                  </span>
                </button>
                <button
                  onClick={() => handleDeleteSubtask(subtask.id)}
                  disabled={isPending}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                  title="Remove Subtask"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Inline Add Subtask Input */}
            <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Add new subtask..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!newSubtaskTitle.trim() || isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors shrink-0"
              >
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
