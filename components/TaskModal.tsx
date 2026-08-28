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
} from 'lucide-react';
import { createTask, updateTask } from '@/lib/actions/task-actions';

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
      setSubtasks([]);
    }
  }, [editingTask, currentUserId, isOpen]);

  if (!isOpen) return null;

  const totalWeight = subtasks.reduce((sum, s) => sum + (s.weight || 0), 0);

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    const remaining = Math.max(0, 100 - totalWeight);
    const newWeight = remaining > 0 ? remaining : 10;
    const newSubtasks = [...subtasks, { title: subtaskInput.trim(), weight: newWeight }];
    setSubtasks(newSubtasks);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    const updated = subtasks.filter((_, i) => i !== index);
    setSubtasks(updated);
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const clamped = Math.min(100, Math.max(0, newWeight));
    const updated = [...subtasks];
    updated[index] = { ...updated[index], weight: clamped };
    setSubtasks(updated);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title,
          description,
          recurrence,
          dueDate: dueDate || null,
          startTime: startTime || null,
          endTime: endTime || null,
          priority,
          assignedBy,
          subtasks: subtasks.map((s) => ({
            id: s.id,
            title: s.title,
            weight: s.weight,
            isDone: s.isDone,
          })),
        });
      } else {
        await createTask({
          title,
          description,
          recurrence,
          userId,
          dueDate: dueDate || null,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingTask ? 'Edit Task & Weights' : 'Create New Task'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingTask
                  ? 'Update task details and custom subtask percentage weights'
                  : 'Add task with report time, priority & subtask weights'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title / Description *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Check the sales details and give an update"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start Time & End Time (for Evening Task Log) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Start Time (Evening Log)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g., 8.45 or 9.00"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> End Time (Evening Log)
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g., 9.00 or 5.30"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Priority & Assigned By Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High (Red)</option>
                <option value="Medium">Medium (Blue)</option>
                <option value="Low">Low (Grey)</option>
              </select>
            </div>

            {/* Assigned By */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-500" /> Assigned By
              </label>
              <input
                type="text"
                value={assignedBy}
                onChange={(e) => setAssignedBy(e.target.value)}
                placeholder="e.g. Myself, Altitude1, Nimesh"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Assignee & Recurrence Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Assignee User */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Team Member
              </label>
              <select
                disabled={Boolean(editingTask)}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Repeat className="w-3.5 h-3.5" /> Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NONE">No Recurrence</option>
                <option value="DAILY">Daily (Renews every day)</option>
                <option value="WEEKLY">Weekly (Renews weekly)</option>
              </select>
            </div>
          </div>

          {/* Subtasks with Custom Percentage Weight Sliders */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Subtasks & Percentage Weights
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Customize the percentage contribution of each subtask to 100%
                  </p>
                </div>
              </div>

              {subtasks.length > 1 && (
                <button
                  type="button"
                  onClick={handleAutoEqualSplit}
                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Equal Split</span>
                </button>
              )}
            </div>

            {/* Total Weight Status Bar */}
            {subtasks.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Total Subtask Weights:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      totalWeight === 100
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {totalWeight}% {totalWeight === 100 ? '✓ (100%)' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* List of Subtasks with Sliders */}
            <div className="space-y-2.5">
              {subtasks.map((st, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">
                      {idx + 1}. {st.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {st.weight}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Percentage Slider */}
                  <div className="flex items-center gap-3 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-mono">0%</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={st.weight}
                      onChange={(e) => handleWeightChange(idx, Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">100%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Subtask Input */}
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
                placeholder="Add a subtask (e.g., Code API endpoints)..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1 transition-all shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              {isPending ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
