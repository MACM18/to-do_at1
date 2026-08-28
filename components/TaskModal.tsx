'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, Plus, Trash2, Calendar, Repeat, User, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { createTask, updateTask } from '@/lib/actions/task-actions';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
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
  const [subtasks, setSubtasks] = useState<string[]>([]);
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
      setSubtasks(editingTask.subtasks ? editingTask.subtasks.map((s: any) => s.title) : []);
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

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
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
          subtaskTitles: subtasks,
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
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingTask ? 'Update task details and report metadata' : 'Add task with report time, priority & assignment'}
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

          {/* Subtasks (when creating new task) */}
          {!editingTask && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subtasks (Auto-calculates weighted productivity %)
              </label>
              <div className="space-y-2 mb-2">
                {subtasks.map((st, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <span>• {st}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
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
                  placeholder="e.g., Create IAM Role, Write unit test..."
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          )}

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
