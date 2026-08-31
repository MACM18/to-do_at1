'use client';

import React, { useState, useTransition } from 'react';
import {
  Plus,
  Clock,
  Repeat,
  User,
  SlidersHorizontal,
  ChevronUp,
  X,
  PlusCircle,
  Tag,
  Calendar,
} from 'lucide-react';
import { createTask } from '@/lib/actions/task-actions';

interface CompactTaskCreatorProps {
  userId: string;
  onCreated?: () => void;
}

export default function CompactTaskCreator({
  userId,
  onCreated,
}: CompactTaskCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [priority, setPriority] = useState('High');
  const [assignedBy, setAssignedBy] = useState('Myself');
  const [recurrence, setRecurrence] = useState('NONE');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAddSubtask = () => {
    if (!subtaskInput.trim()) return;
    setSubtasks([...subtasks, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (idx: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    startTransition(async () => {
      await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignedBy,
        recurrence,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        userId,
        subtaskTitles: subtasks,
      });

      setTitle('');
      setDescription('');
      setDueDate('');
      setStartTime('');
      setEndTime('');
      setSubtasks([]);
      setIsExpanded(false);
      if (onCreated) onCreated();
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <form onSubmit={handleSubmit} className="p-3">
        {/* Main Single Row Input */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <PlusCircle className="w-4 h-4" />
          </div>

          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => {
              if (!isExpanded && (description || subtasks.length > 0 || startTime || dueDate)) {
                setIsExpanded(true);
              }
            }}
            placeholder="Add a new task or action item..."
            className="flex-1 px-2 py-1.5 text-xs sm:text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />

          {/* Expand Details Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
              isExpanded
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={isExpanded ? 'Collapse options' : 'More task options'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
          </button>

          {/* Quick Submit Button */}
          <button
            type="submit"
            disabled={!title.trim() || isPending}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isPending ? 'Adding...' : 'Add'}</span>
          </button>
        </div>

        {/* Quick Inline Pill Selectors */}
        <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Due Date Pill */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            <Calendar className="w-3 h-3 text-blue-500" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer text-[11px]"
              title="Target Due Date"
            />
          </div>

          {/* Priority Pill */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            <Tag className="w-3 h-3 text-slate-400" />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="High" className="bg-white dark:bg-slate-900 text-rose-600">High</option>
              <option value="Medium" className="bg-white dark:bg-slate-900 text-sky-600">Medium</option>
              <option value="Low" className="bg-white dark:bg-slate-900 text-slate-600">Low</option>
            </select>
          </div>

          {/* Assigned By Pill */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            <User className="w-3 h-3 text-slate-400" />
            <input
              type="text"
              value={assignedBy}
              onChange={(e) => setAssignedBy(e.target.value)}
              placeholder="Assigned by"
              className="bg-transparent font-semibold focus:outline-none w-20 text-[11px]"
            />
          </div>

          {/* Recurrence Pill */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
            <Repeat className="w-3 h-3 text-slate-400" />
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer text-[11px]"
            >
              <option value="NONE" className="bg-white dark:bg-slate-900">One-off</option>
              <option value="DAILY" className="bg-white dark:bg-slate-900">Daily</option>
              <option value="WEEKLY" className="bg-white dark:bg-slate-900">Weekly</option>
            </select>
          </div>

          {/* Time Badge (if configured) */}
          {(startTime || endTime) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
              <Clock className="w-3 h-3" />
              {startTime || 'Start'} - {endTime || 'End'}
            </span>
          )}

          {subtasks.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-500">
              {subtasks.length} subtasks
            </span>
          )}
        </div>

        {/* Expandable Advanced Fields */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Description */}
            <div>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description, notes, or deliverable details..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Time Ranges */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Start Time (e.g. 8.45)
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="08.45"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> End Time (e.g. 17.30)
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="17.30"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Subtasks Pills */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Subtasks (Weighted Progress)
              </label>

              {subtasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {subtasks.map((st, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <span>{st}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

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
                  placeholder="Add subtask and press Enter..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
