'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  Plus,
  Calendar,
  Sparkles,
  Percent,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { createTask, updateTask } from '@/lib/actions/task-actions';

interface TeamTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
  editingTask?: any;
}

export default function TeamTaskModal({
  isOpen,
  onClose,
  userId,
  userName,
  editingTask,
}: TeamTaskModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState(todayStr);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setStatus(editingTask.status || 'TODO');
      setProgress(editingTask.progress || 0);
      setDueDate(
        editingTask.dueDate
          ? new Date(editingTask.dueDate).toISOString().split('T')[0]
          : todayStr
      );
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setProgress(0);
      setDueDate(todayStr);
    }
  }, [editingTask, isOpen, todayStr]);

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    if (newStatus === 'DONE') {
      setProgress(100);
    } else if (newStatus === 'TODO' && progress === 100) {
      setProgress(0);
    } else if (newStatus === 'IN_PROGRESS' && progress === 0) {
      setProgress(50);
    }
  };

  const handleProgressChange = (newProgress: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(newProgress)));
    setProgress(clamped);
    if (clamped === 100) {
      setStatus('DONE');
    } else if (clamped > 0) {
      setStatus('IN_PROGRESS');
    } else {
      setStatus('TODO');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const resolvedDate = new Date(dueDate);

    startTransition(async () => {
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          progress,
          dueDate: resolvedDate,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          progress,
          dueDate: resolvedDate,
          userId,
          priority: 'High',
          assignedBy: 'Myself',
          recurrence: 'NONE',
        });
      }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingTask ? 'Edit Team Task' : 'Log Team Task'}
              </h3>
              <p className="text-xs text-slate-500">
                {userName ? `Assigned to ${userName}` : 'Track deliverables and progress'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement authentication middleware"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description / Email Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any specific context or notes from the developer's email..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Task Date (Compulsory) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Date <span className="text-rose-500">*</span> (Compulsory)
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Status & Progress Adjustment Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Task Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('TODO')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'TODO'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  TODO
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'IN_PROGRESS'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  IN PROGRESS
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange('DONE')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    status === 'DONE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  DONE
                </button>
              </div>
            </div>

            {/* Progress Slider */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Completion Percentage:</span>
                </span>
                <span className="font-bold font-mono text-sm text-indigo-600 dark:text-indigo-400">
                  {progress}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[0, 25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleProgressChange(val)}
                    className={`py-1 text-xs font-bold rounded-lg transition-all ${
                      progress === val
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 active:scale-95 flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
