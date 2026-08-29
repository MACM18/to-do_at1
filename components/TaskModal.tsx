'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Repeat,
  User,
  Sparkles,
  Clock,
  AlertTriangle,
  Sliders,
  Percent,
  Check,
  RotateCcw,
  Layers,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { createTask, updateTask } from '@/lib/actions/task-actions';
import { getLocalTimeDot } from '@/lib/time-utils';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SubtaskItem {
  id?: string;
  title: string;
  weight: number; // 0 - 100
  isDone?: boolean;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserOption[];
  currentUserId: string;
  editingTask?: any;
}

/**
 * Smart Auto-Balancing Algorithm:
 * When adjusting slider `changedIndex` to `targetWeight`, automatically adjusts
 * the next/remaining sliders so that the total sum strictly and continuously equals 100%.
 */
function autoBalanceWeights(
  currentSubtasks: SubtaskItem[],
  changedIndex: number,
  targetWeight: number
): SubtaskItem[] {
  const n = currentSubtasks.length;
  if (n === 0) return [];
  if (n === 1) {
    return [{ ...currentSubtasks[0], weight: 100 }];
  }

  const clampedTarget = Math.max(0, Math.min(100, Math.round(targetWeight)));
  const oldWeight = currentSubtasks[changedIndex].weight ?? 0;
  const delta = clampedTarget - oldWeight;

  if (delta === 0) return currentSubtasks;

  const weights = currentSubtasks.map((s) => s.weight ?? 0);

  if (delta > 0) {
    const otherIndices: number[] = [];
    for (let i = changedIndex + 1; i < n; i++) otherIndices.push(i);
    for (let i = 0; i < changedIndex; i++) otherIndices.push(i);

    let remainingToDeduct = delta;
    for (const idx of otherIndices) {
      if (remainingToDeduct <= 0) break;
      const canDeduct = Math.min(weights[idx], remainingToDeduct);
      weights[idx] -= canDeduct;
      remainingToDeduct -= canDeduct;
    }

    const actualIncrease = delta - remainingToDeduct;
    weights[changedIndex] = oldWeight + actualIncrease;
  } else {
    const amountToAdd = -delta;
    const otherIndices: number[] = [];
    for (let i = changedIndex + 1; i < n; i++) otherIndices.push(i);
    for (let i = 0; i < changedIndex; i++) otherIndices.push(i);

    weights[changedIndex] = clampedTarget;
    if (otherIndices.length > 0) {
      weights[otherIndices[0]] += amountToAdd;
    }
  }

  // Guarantee exact sum = 100
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum !== 100) {
    const fixIndex = changedIndex === 0 ? 1 : 0;
    weights[fixIndex] = Math.max(0, weights[fixIndex] + (100 - sum));
  }

  return currentSubtasks.map((s, idx) => ({
    ...s,
    weight: weights[idx],
  }));
}

export default function TaskModal({
  isOpen,
  onClose,
  users,
  currentUserId,
  editingTask,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState('NONE');
  const [userId, setUserId] = useState(currentUserId);
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState('High');
  const [assignedBy, setAssignedBy] = useState('Myself');
  const [taskStatus, setTaskStatus] = useState('TODO');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setRecurrence(editingTask.recurrence || 'NONE');
      setUserId(editingTask.userId || currentUserId);
      setDueDate(
        editingTask.dueDate
          ? new Date(editingTask.dueDate).toISOString().split('T')[0]
          : ''
      );
      setStartTime(editingTask.startTime || '');
      setEndTime(editingTask.endTime || '');
      setPriority(editingTask.priority || 'High');
      setAssignedBy(editingTask.assignedBy || 'Myself');
      setTaskStatus(editingTask.status || (editingTask.progress === 100 ? 'DONE' : 'TODO'));

      if (editingTask.subtasks && editingTask.subtasks.length > 0) {
        const count = editingTask.subtasks.length;
        const defaultWeight = Math.floor(100 / count);
        setSubtasks(
          editingTask.subtasks.map((s: any, idx: number) => {
            const w =
              typeof s.weight === 'number'
                ? s.weight
                : idx === 0
                ? 100 - defaultWeight * (count - 1)
                : defaultWeight;
            return {
              id: s.id,
              title: s.title,
              weight: w,
              isDone: s.isDone,
            };
          })
        );
      } else {
        setSubtasks([]);
      }
    } else {
      setTitle('');
      setDescription('');
      setRecurrence('NONE');
      setUserId(currentUserId);
      setDueDate('');
      setStartTime('');
      setEndTime('');
      setPriority('High');
      setAssignedBy('Myself');
      setTaskStatus('TODO');
      setSubtasks([]);
    }
  }, [editingTask, currentUserId, isOpen]);

  if (!isOpen) return null;

  const totalWeight = subtasks.reduce((sum, s) => sum + (s.weight || 0), 0);

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    const newTitle = subtaskInput.trim();
    const nextSubtasks = [...subtasks, { title: newTitle, weight: 0 }];
    const count = nextSubtasks.length;

    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;
    const rebalanced = nextSubtasks.map((s, idx) => ({
      ...s,
      weight: idx === 0 ? base + remainder : base,
    }));

    setSubtasks(rebalanced);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    const removedWeight = subtasks[index].weight || 0;
    const remaining = subtasks.filter((_, i) => i !== index);

    if (remaining.length === 0) {
      setSubtasks([]);
      return;
    }
    if (remaining.length === 1) {
      setSubtasks([{ ...remaining[0], weight: 100 }]);
      return;
    }

    const extra = Math.floor(removedWeight / remaining.length);
    let rem = removedWeight % remaining.length;
    const rebalanced = remaining.map((s) => {
      const add = extra + (rem > 0 ? 1 : 0);
      if (rem > 0) rem--;
      return { ...s, weight: s.weight + add };
    });

    const sum = rebalanced.reduce((a, b) => a + b.weight, 0);
    if (sum !== 100) {
      rebalanced[0].weight += 100 - sum;
    }

    setSubtasks(rebalanced);
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const balanced = autoBalanceWeights(subtasks, index, newWeight);
    setSubtasks(balanced);
  };

  const handleAutoEqualSplit = () => {
    if (subtasks.length === 0) return;
    const count = subtasks.length;
    const base = Math.floor(100 / count);
    const remainder = 100 - base * count;

    const updated = subtasks.map((s, idx) => ({
      ...s,
      weight: idx === 0 ? base + remainder : base,
    }));
    setSubtasks(updated);
  };

  // Helper date preset handler
  const setDuePreset = (daysFromToday: number | null) => {
    if (daysFromToday === null) {
      setDueDate('');
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + daysFromToday);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title,
          description,
          recurrence,
          status: taskStatus,
          dueDate: dueDate ? new Date(dueDate) : null,
          startTime: startTime || null,
          endTime: endTime || null,
          priority,
          assignedBy,
          subtasks: subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            weight: s.weight,
            isDone: taskStatus === 'DONE' ? true : s.isDone,
          })),
        });
      } else {
        await createTask({
          title,
          description,
          recurrence,
          userId,
          dueDate: dueDate ? new Date(dueDate) : null,
          startTime: startTime || null,
          endTime: endTime || null,
          priority,
          assignedBy,
          subtasks: subtasks.map((s) => ({
            title: s.title,
            weight: s.weight,
          })),
        });
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingTask ? 'Edit Task & Subtask Weights' : 'Create New Task'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingTask
                  ? 'Update task properties, due date countdown & 100% subtask weights'
                  : 'Configure due date, report times, priority, and subtask weights'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Desktop Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Core Task Details (6 Cols on Desktop) */}
            <div className="md:col-span-6 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Task Information
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deliver production API & schema changes"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes & Details <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add specific instructions, URLs, or deliverable notes..."
                  className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Due Date Section (Shows remaining days in My Tasks, not sent in emails) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Target Due Date</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Tracks countdown in My Tasks · not sent in emails)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="text-[11px] text-slate-400 hover:text-rose-500 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setDuePreset(0)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuePreset(1)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuePreset(3)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuePreset(7)}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-white dark:bg-slate-900 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Start Time & End Time (for Evening Task Log) */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Work Timings (Asia/Colombo +05:30)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      placeholder="e.g., 8.30"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setStartTime(getLocalTimeDot(new Date(), 'Asia/Colombo'))}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-200"
                      >
                        Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartTime('8.30')}
                        className="px-1.5 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      >
                        8.30
                      </button>
                      {startTime && (
                        <button
                          type="button"
                          onClick={() => setStartTime('')}
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      placeholder="e.g., 5.30"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setEndTime(getLocalTimeDot(new Date(), 'Asia/Colombo'))}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200"
                      >
                        Now
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndTime('5.30')}
                        className="px-1.5 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      >
                        5.30
                      </button>
                      <button
                        type="button"
                        onClick={() => setEndTime('1.30')}
                        className="px-1.5 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                      >
                        1.30
                      </button>
                      {endTime && (
                        <button
                          type="button"
                          onClick={() => setEndTime('')}
                          className="px-1.5 py-0.5 text-[10px] font-semibold rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Priority & Assigned By */}
              <div className={`grid ${editingTask ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'} gap-3`}>
                {editingTask && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Task Status
                    </label>
                    <select
                      value={taskStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setTaskStatus(newStatus);
                        if (newStatus === 'DONE') {
                          setSubtasks((prev) => prev.map((s) => ({ ...s, isDone: true })));
                        }
                      }}
                      className={`w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold ${
                        taskStatus === 'DONE'
                          ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                          : taskStatus === 'IN_PROGRESS'
                          ? 'text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                          : 'text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <option value="DONE">Completed (100%)</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="TODO">To Do (Pending)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="High">High (Red)</option>
                    <option value="Medium">Medium (Blue)</option>
                    <option value="Low">Low (Grey)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-500" /> Assigned By
                  </label>
                  <input
                    type="text"
                    value={assignedBy}
                    onChange={(e) => setAssignedBy(e.target.value)}
                    placeholder="e.g. Myself, Lead"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Team Member & Recurrence */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Assignee
                  </label>
                  <select
                    disabled={Boolean(editingTask)}
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Repeat className="w-3.5 h-3.5" /> Recurrence
                  </label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NONE">No Recurrence</option>
                    <option value="DAILY">Daily (Renews daily)</option>
                    <option value="WEEKLY">Weekly (Renews weekly)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Subtasks & Smart Auto-Balanced Percentage Weights (6 Cols on Desktop) */}
            <div className="md:col-span-6 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Subtask Percentage Allocation
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Adjust any slider — other sliders automatically adjust to maintain exactly 100%
                    </p>
                  </div>
                </div>

                {subtasks.length > 1 && (
                  <button
                    type="button"
                    onClick={handleAutoEqualSplit}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 hover:bg-blue-50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Equal Split</span>
                  </button>
                )}
              </div>

              {/* Progress Bar & 100% Total Metric */}
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-500" /> Total Allocated:
                  </span>
                  <span className="font-mono px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {totalWeight}% / 100%
                  </span>
                </div>

                {/* Segmented Visual Progress Bar */}
                {subtasks.length > 0 && (
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    {subtasks.map((st, i) => {
                      const colors = [
                        'bg-blue-500',
                        'bg-indigo-500',
                        'bg-violet-500',
                        'bg-emerald-500',
                        'bg-amber-500',
                        'bg-sky-500',
                      ];
                      const color = colors[i % colors.length];
                      return (
                        <div
                          key={i}
                          style={{ width: `${st.weight}%` }}
                          className={`${color} h-full transition-all duration-150 first:rounded-l-full last:rounded-r-full border-r border-white/20`}
                          title={`${st.title}: ${st.weight}%`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtask Sliders List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {subtasks.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    No subtasks added yet. Add items below to automatically split and weight your 100% progress.
                  </div>
                ) : (
                  subtasks.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">
                          {idx + 1}. {st.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50">
                            {st.weight}%
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Remove subtask"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Slider with Real-time 100% Auto-Balancing */}
                      <div className="flex items-center gap-2.5 pt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono w-5">0%</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={st.weight}
                          onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                          className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400 font-mono w-7 text-right">
                          100%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Subtask Input Box */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add a subtask..."
                  className="flex-1 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center gap-1 transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Footer Save / Cancel Controls */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-2xl transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
            >
              {isPending ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
