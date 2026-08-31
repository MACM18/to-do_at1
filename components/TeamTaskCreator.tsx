'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Calendar, Sparkles, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { createTask } from '@/lib/actions/task-actions';

interface TeamTaskCreatorProps {
  userId: string;
  userName?: string;
  onCreated?: () => void;
}

export default function TeamTaskCreator({
  userId,
  userName,
  onCreated,
}: TeamTaskCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        userId,
        priority: 'High',
        assignedBy: 'Myself',
        recurrence: 'NONE',
      });

      setTitle('');
      setDescription('');
      setDueDate('');
      setIsExpanded(false);
      if (onCreated) onCreated();
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-3">
        {/* Main Single Row Input */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={userName ? `Log task from morning email for ${userName}...` : 'Log task from morning email...'}
            className="flex-1 px-2 py-1.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />

          {/* Optional Due Date Input */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-2 py-1 text-[11px] font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Target Due Date (Optional)"
            />
          </div>

          {/* Toggle Description */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-xl border transition-all ${
              isExpanded || description
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Add Description"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !title.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>

        {/* Expandable Optional Description Drawer */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or details from email..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        )}
      </form>
    </div>
  );
}
