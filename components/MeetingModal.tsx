'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, Users, Clock, Plus, Trash2, Calendar, FileText } from 'lucide-react';
import { createMeeting, updateMeeting, deleteMeeting } from '@/lib/actions/meeting-actions';
import { getLocalTimeDot } from '@/lib/time-utils';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  editingMeeting?: any;
}

export default function MeetingModal({
  isOpen,
  onClose,
  userId,
  editingMeeting,
}: MeetingModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (editingMeeting) {
      setTitle(editingMeeting.title || '');
      setStartTime(editingMeeting.startTime || '');
      setEndTime(editingMeeting.endTime || '');
      setDescription(editingMeeting.description || '');
      setError('');
    } else {
      setTitle('');
      const current = getLocalTimeDot();
      setStartTime(current);
      // Default end time 30 mins later
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      setEndTime(getLocalTimeDot(now));
      setDescription('');
      setError('');
    }
  }, [editingMeeting, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title or topic is required');
      return;
    }
    if (!startTime.trim() || !endTime.trim()) {
      setError('Start time and end time are required');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        if (editingMeeting) {
          await updateMeeting(editingMeeting.id, {
            title: title.trim(),
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            description: description.trim() || undefined,
          });
        } else {
          await createMeeting({
            title: title.trim(),
            startTime: startTime.trim(),
            endTime: endTime.trim(),
            description: description.trim() || undefined,
            userId,
          });
        }
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to save meeting log');
      }
    });
  };

  const handleDelete = () => {
    if (!editingMeeting) return;
    startTransition(async () => {
      try {
        await deleteMeeting(editingMeeting.id);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to delete meeting log');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingMeeting ? 'Edit Meeting Period' : 'Log Meeting Period'}
              </h2>
              <p className="text-xs text-slate-500">
                Record meeting time to be included in your daily task log report
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {/* Meeting Title / Topic */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Topic / Discussion *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Daily Standup, Architecture Review, Client Call"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Start Time *
              </label>
              <input
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. 10.30"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> End Time *
              </label>
              <input
                type="text"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="e.g. 11.15"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Description / Meeting Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Outcomes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key decisions or agenda points discussed..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            {editingMeeting ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !title.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isPending ? 'Saving...' : editingMeeting ? 'Save Changes' : 'Log Meeting'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
