'use client';

import React, { useState, useRef, useTransition } from 'react';
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
  User,
  Calendar,
  CalendarDays,
  Zap,
  Flame,
  Play,
} from 'lucide-react';
import {
  toggleTaskComplete,
  toggleSubtask,
  startTask,
  addSubtask,
  deleteSubtask,
  deleteTask,
} from '@/lib/actions/task-actions';
import ConfirmDialog from './ConfirmDialog';
import confetti from 'canvas-confetti';
import { getDayBounds, formatLocalDate } from '@/lib/time-utils';

interface Subtask {
  id: string;
  title: string;
  isDone: boolean;
  weight?: number | null;
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
  startTime?: string | null;
  endTime?: string | null;
  priority?: string;
  assignedBy?: string;
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
  isCompactDone?: boolean;
  onEdit?: (task: Task) => void;
  showAssignee?: boolean;
}

/**
 * Renders a creative countdown badge for remaining days on task cards
 */
function renderDueDateBadge(dueDate: Date | string | null | undefined, isDone: boolean) {
  if (!dueDate) return null;

  const { startOfDay: dueMidnight } = getDayBounds(new Date(dueDate));
  const { startOfDay: nowMidnight } = getDayBounds(new Date());

  const diffTime = dueMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const monthDay = formatLocalDate(dueDate, { month: 'short', day: 'numeric' });

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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-900 animate-pulse shadow-xs">
        <Flame className="w-3 h-3 text-rose-600 dark:text-rose-400 fill-rose-500" />
        <span>{overdueDays}d Overdue</span>
      </span>
    );
  }

  if (diffDays === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-xs">
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

  if (diffDays <= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
        <CalendarDays className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span>{diffDays}d left ({monthDay})</span>
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

export default function TaskCard({
  task,
  isCarryOver = false,
  isCompactDone = false,
  onEdit,
  showAssignee = false,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Touch Swipe Gesture State (for mobile only)
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDragging = useRef<boolean>(false);

  const isDone = task.status === 'DONE' || task.progress === 100;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.isDone).length || 0;

  const priority = task.priority || 'High';
  const assignedBy = task.assignedBy || 'Myself';

  // Mobile Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - touchStartX.current;
    touchDeltaX.current = delta;

    if (isRevealed) {
      const offset = Math.max(-125, Math.min(0, -125 + delta));
      setDragOffset(offset);
    } else {
      const offset = Math.max(-125, Math.min(0, delta));
      setDragOffset(offset);
    }
  };

  const isOngoing = Boolean(task.startTime) && !isDone;

  const handleTouchEnd = () => {
    isDragging.current = false;
    touchStartX.current = null;

    if (isRevealed) {
      if (touchDeltaX.current > 30) {
        setIsRevealed(false);
      }
    } else {
      if (touchDeltaX.current < -35) {
        setIsRevealed(true);
      }
    }
    setDragOffset(0);
  };

  const handleMainToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) {
      setIsRevealed(false);
      return;
    }
    startTransition(async () => {
      await toggleTaskComplete(task.id, task.status);
      if (!isDone) {
        try {
          confetti({
            particleCount: 35,
            spread: 55,
            origin: { y: 0.8 },
          });
        } catch {
          // ignore
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
            particleCount: 35,
            spread: 60,
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

  const handleStartTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await startTask(task.id);
    });
  };

  const handleConfirmDelete = () => {
    startTransition(async () => {
      await deleteTask(task.id);
      setIsConfirmOpen(false);
    });
  };

  // Compact row for completed tasks at the bottom
  if (isCompactDone) {
    return (
      <>
        <div className="relative overflow-hidden rounded-xl group select-none">
          {/* Underneath Revealed Actions (Mobile Only - only visible when slided/dragging) */}
          <div
            className={`sm:hidden absolute inset-y-0 right-0 w-[95px] flex items-center justify-end pr-2 gap-1.5 z-0 transition-opacity duration-150 ${
              isRevealed || isDragging.current
                ? 'opacity-100 pointer-events-auto'
                : 'opacity-0 pointer-events-none'
            }`}
          >
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  setIsRevealed(false);
                  onEdit(task);
                }}
                className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-blue-600 active:bg-blue-700 text-white shadow-xs transition-transform active:scale-90 shrink-0"
                title="Edit"
              >
                <Edit2 className="w-3 h-3" />
                <span className="text-[8px] font-bold leading-none mt-0.5">Edit</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsRevealed(false);
                setIsConfirmOpen(true);
              }}
              className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-rose-600 active:bg-rose-700 text-white shadow-xs transition-transform active:scale-90 shrink-0"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
              <span className="text-[8px] font-bold leading-none mt-0.5">Delete</span>
            </button>
          </div>

          {/* Front Row (Solid opaque surface with slide gesture on mobile) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              if (isRevealed) setIsRevealed(false);
            }}
            style={{
              transform:
                typeof window !== 'undefined' && window.innerWidth < 640
                  ? isDragging.current
                    ? `translateX(${dragOffset}px)`
                    : isRevealed
                    ? 'translateX(-95px)'
                    : 'translateX(0px)'
                  : undefined,
            }}
            className="relative z-10 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 transition-transform duration-200 ease-out shadow-2xs"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <button
                onClick={handleMainToggle}
                disabled={isPending}
                className="text-emerald-500 hover:text-slate-400 transition-colors shrink-0"
                title="Mark as Incomplete"
              >
                <CheckCircle2 className="w-4 h-4 fill-emerald-50 dark:fill-emerald-950" />
              </button>

              <span className="text-xs text-slate-500 dark:text-slate-400 line-through truncate flex-1">
                {task.title}
              </span>

              {renderDueDateBadge(task.dueDate, isDone)}

              {(task.startTime || task.endTime) ? (
                onEdit ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded-full font-mono shrink-0 transition-colors cursor-pointer border border-blue-200/60 dark:border-blue-800/80"
                    title="Click to adjust start time or end time"
                  >
                    <Clock className="w-2.5 h-2.5 text-blue-500" />
                    <span>{task.startTime || '8.30'} - {task.endTime || 'Done'}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-mono shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {task.startTime || '8.30'} - {task.endTime || 'Done'}
                  </span>
                )
              ) : null}

              {priority && (
                <span className="text-[10px] font-medium text-slate-400 shrink-0">
                  {priority}
                </span>
              )}
            </div>

            {/* Desktop Direct Icons */}
            <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <ConfirmDialog
          isOpen={isConfirmOpen}
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"?`}
          confirmText="Delete"
          isLoading={isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setIsConfirmOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl group select-none">
        {/* Underneath Revealed Actions (Mobile Only - only visible when slided/dragging) */}
        <div
          className={`sm:hidden absolute inset-y-0 right-0 w-[115px] flex items-center justify-end pr-2.5 gap-2 z-0 transition-opacity duration-150 ${
            isRevealed || isDragging.current
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setIsRevealed(false);
                onEdit(task);
              }}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-blue-600 active:bg-blue-700 text-white shadow-xs transition-transform active:scale-90 shrink-0"
              title="Edit Task"
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-0.5 leading-none">Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsRevealed(false);
              setIsConfirmOpen(true);
            }}
            disabled={isPending}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-rose-600 active:bg-rose-700 text-white shadow-xs transition-transform active:scale-90 shrink-0"
            title="Delete Task"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-[9px] font-bold mt-0.5 leading-none">Delete</span>
          </button>
        </div>

        {/* Sliding Front Card Surface (Solid opaque surface) */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (isRevealed) setIsRevealed(false);
          }}
          style={{
            transform:
              typeof window !== 'undefined' && window.innerWidth < 640
                ? isDragging.current
                  ? `translateX(${dragOffset}px)`
                  : isRevealed
                  ? 'translateX(-115px)'
                  : 'translateX(0px)'
                : undefined,
          }}
          className={`relative z-10 rounded-2xl border transition-all duration-200 ease-out ${
            isOngoing
              ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700/80 shadow-md shadow-blue-500/5 ring-1 ring-blue-400/25'
              : isCarryOver && !isDone
              ? 'bg-amber-50/40 dark:bg-slate-900 border-amber-200/80 dark:border-amber-900/50 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md'
          }`}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              {/* Checkbox Action Button */}
              <button
                onClick={handleMainToggle}
                disabled={isPending}
                className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
                title={isDone ? 'Mark as Incomplete' : 'Mark as Done'}
              >
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50 dark:fill-emerald-950 transition-transform active:scale-90" />
                ) : (
                  <Circle className="w-5 h-5 hover:stroke-blue-500 transition-transform active:scale-90" />
                )}
              </button>

              {/* Main Task Content */}
              <div className="flex-1 min-w-0">
                {/* Metadata Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  {/* Ongoing In Progress Badge */}
                  {isOngoing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                      </span>
                      <span>In Progress</span>
                    </span>
                  )}

                  {/* Creative Due Date Remaining Days Badge */}
                  {renderDueDateBadge(task.dueDate, isDone)}

                  {/* Timing or Quick Start Action */}
                  {task.startTime || task.endTime ? (
                    onEdit ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 border border-slate-200/60 hover:border-blue-300 dark:border-slate-700 transition-all cursor-pointer"
                        title="Click to adjust start or end time"
                      >
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{task.startTime ? task.startTime : 'Start'}</span>
                        <span>{task.endTime ? ` - ${task.endTime}` : ''}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>{task.startTime ? task.startTime : 'Start'}</span>
                        <span>{task.endTime ? ` - ${task.endTime}` : ''}</span>
                      </span>
                    )
                  ) : !isDone ? (
                    <button
                      type="button"
                      onClick={handleStartTask}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      title="Click to record start time and mark in progress"
                    >
                      <Play className="w-2.5 h-2.5 fill-current text-blue-600 dark:text-blue-400" />
                      <span>Start</span>
                    </button>
                  ) : null}

                  {/* Priority */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      priority.toLowerCase() === 'high'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50'
                        : priority.toLowerCase() === 'medium'
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/50 dark:border-sky-900/50'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {priority}
                  </span>

                  {/* Assigned By */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      assignedBy.toLowerCase() === 'myself'
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50'
                        : 'bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50'
                    }`}
                  >
                    <User className="w-2.5 h-2.5" />
                    {assignedBy}
                  </span>

                  {/* Backlog */}
                  {isCarryOver && !isDone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      <AlertCircle className="w-3 h-3" /> Backlog
                    </span>
                  )}

                  {/* Recurrence */}
                  {task.recurrence !== 'NONE' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200/50">
                      <Repeat className="w-3 h-3" /> {task.recurrence}
                    </span>
                  )}

                  {showAssignee && task.user && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {task.user.name}
                    </span>
                  )}
                </div>

                <h3
                  className={`text-sm font-semibold leading-snug break-words ${
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

                {/* Progress Bar & Metric */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
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

                  <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0 min-w-[48px] text-right">
                    {task.progress.toFixed(2)}%
                  </span>

                  {hasSubtasks && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
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

              {/* Desktop Direct Quick Actions (Always/Hover on Desktop) */}
              <div className="hidden sm:flex items-center gap-1 shrink-0">
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
                  onClick={() => setIsConfirmOpen(true)}
                  disabled={isPending}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Delete Task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expandable Subtasks */}
            {expanded && (
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Subtasks ({completedSubtasks}/{task.subtasks?.length || 0})
                </div>

                {task.subtasks?.map((subtask) => {
                  const weightVal =
                    typeof subtask.weight === 'number'
                      ? `${subtask.weight}%`
                      : task.subtasks.length > 0
                      ? `${Math.round(100 / task.subtasks.length)}%`
                      : '';

                  return (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <button
                        onClick={() => handleSubtaskToggle(subtask.id)}
                        disabled={isPending}
                        className="flex items-center gap-2.5 flex-1 text-left min-w-0"
                      >
                        {subtask.isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate flex-1 ${
                            subtask.isDone
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {subtask.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {weightVal && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50">
                            {weightVal}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          disabled={isPending}
                          className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                          title="Remove Subtask"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Inline Add Subtask */}
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
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        confirmText="Delete"
        isLoading={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
