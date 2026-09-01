'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  X,
  Mail,
  Sun,
  Moon,
  Save,
  Send,
  RotateCcw,
  Eye,
  Code2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  ShieldCheck,
  Check,
  Loader2,
  Sparkles,
  Link2,
  Hash,
} from 'lucide-react';
import {
  getEmailDraftPreview,
  saveEmailDraft,
  sendEmailDraftNow,
} from '@/lib/actions/email-draft-actions';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  type: 'MORNING_PLAN' | 'EVENING_TASKLOG';
  initialCheckInTime?: string;
  initialCheckOutTime?: string;
  onEmailSent?: (message: string) => void;
}

export default function EmailPreviewModal({
  isOpen,
  onClose,
  userId,
  userName,
  type,
  initialCheckInTime,
  initialCheckOutTime,
  onEmailSent,
}: EmailPreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [threadSubject, setThreadSubject] = useState('');
  const [monthKey, setMonthKey] = useState('');
  const [rootMessageId, setRootMessageId] = useState<string | null>(null);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [isThreadActive, setIsThreadActive] = useState(false);

  const [toRecipients, setToRecipients] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [bccRecipients, setBccRecipients] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [checkInTime, setCheckInTime] = useState(initialCheckInTime || '08.30');
  const [checkOutTime, setCheckOutTime] = useState(initialCheckOutTime || '17.30');
  const [isCustomized, setIsCustomized] = useState(false);
  const [draftStatus, setDraftStatus] = useState<'DRAFT' | 'SENT'>('DRAFT');
  const [sentAt, setSentAt] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isMorning = type === 'MORNING_PLAN';

  // Load preview data whenever modal opens or type/userId changes
  const loadDraft = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await getEmailDraftPreview({
        userId,
        type,
        customCheckInTime: initialCheckInTime,
        customCheckOutTime: initialCheckOutTime,
      });

      setSubject(data.subject || '');
      setThreadSubject(data.threadSubject || '');
      setMonthKey(data.monthKey || '');
      setRootMessageId(data.rootMessageId || null);
      setLastMessageId(data.lastMessageId || null);
      setIsThreadActive(data.isThreadActive || false);

      setToRecipients(data.toRecipients || '');
      setCcRecipients(data.ccRecipients || '');
      setBccRecipients(data.bccRecipients || '');
      setBodyHtml(data.bodyHtml || '');
      setCheckInTime(data.checkInTime || '08.30');
      setCheckOutTime(data.checkOutTime || '17.30');
      setIsCustomized(data.isCustomized);
      setDraftStatus((data.status as any) || 'DRAFT');
      setSentAt(data.sentAt);
    } catch (err: any) {
      console.error('Failed to load email draft:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to load email preview.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDraft();
    }
  }, [isOpen, userId, type]);

  if (!isOpen) return null;

  // Handle Save Customization
  const handleSave = () => {
    if (!toRecipients.trim()) {
      setStatusMessage({ type: 'error', text: 'Please specify at least one recipient ("To").' });
      return;
    }

    startTransition(async () => {
      try {
        const res = await saveEmailDraft({
          userId,
          type,
          subject,
          threadSubject,
          toRecipients,
          ccRecipients,
          bccRecipients,
          bodyHtml,
          checkInTime,
          checkOutTime,
        });

        if (res.success) {
          setIsCustomized(true);
          setStatusMessage({
            type: 'success',
            text: 'Email draft customization saved! Scheduled auto-dispatch will send this modified version.',
          });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to save email draft.' });
      }
    });
  };

  // Handle Send Now
  const handleSendNow = () => {
    if (!toRecipients.trim()) {
      setStatusMessage({ type: 'error', text: 'Please specify at least one recipient ("To").' });
      return;
    }

    startTransition(async () => {
      try {
        const res = await sendEmailDraftNow({
          userId,
          type,
          subject,
          toRecipients,
          ccRecipients,
          bccRecipients,
          bodyHtml,
          checkInTime,
          checkOutTime,
        });

        if (res.success) {
          setDraftStatus('SENT');
          setSentAt(new Date().toISOString());
          setStatusMessage({ type: 'success', text: res.message });
          if (onEmailSent) onEmailSent(res.message);
        } else {
          setStatusMessage({ type: 'error', text: res.message });
        }
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to send email.' });
      }
    });
  };

  // Reset to live database tasks
  const handleResetToLive = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await getEmailDraftPreview({
        userId,
        type,
        customCheckInTime: checkInTime,
        customCheckOutTime: checkOutTime,
      });

      setSubject(data.subject || '');
      setToRecipients(data.toRecipients || '');
      setCcRecipients(data.ccRecipients || '');
      setBccRecipients(data.bccRecipients || '');
      setBodyHtml(data.bodyHtml || '');
      setIsCustomized(false);
      setStatusMessage({
        type: 'success',
        text: 'Re-generated fresh email content from live database tasks.',
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reset preview.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl h-[92vh] max-h-[900px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isMorning
                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400'
                  : 'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {isMorning ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isMorning ? 'Day Plan Email Preview & Studio' : 'Task Log Email Preview & Studio'}
                </h2>
                {isCustomized && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Customized Draft Active
                  </span>
                )}
                {draftStatus === 'SENT' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Dispatched
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review and customize before automated sending • Changes will be delivered in the scheduled dispatch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Alert */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between gap-2.5 shrink-0 animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[11px] opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Main Scrollable Content */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Compiling live email draft & thread details...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Email Metadata Controls Card */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
              {/* Thread & Conversation ID Info Banner (Non-editable) */}
              <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 shadow-sm">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                        Monthly Thread (Conversation ID):
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-blue-200/70 dark:bg-blue-900/70 text-blue-900 dark:text-blue-200">
                        {monthKey || 'Current Month'}
                      </span>
                      {isThreadActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active Reply Thread
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Initial Month Email
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-blue-800/90 dark:text-blue-300/90 font-mono truncate mt-0.5">
                      {rootMessageId ? (
                        <span>ID: {rootMessageId}</span>
                      ) : (
                        <span>Will initialize new monthly email thread upon dispatch</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 font-medium">
                  {isThreadActive ? 'Replies are chained in recipient inboxes' : 'Creates clean monthly thread'}
                </div>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Daily Tasks & Work Log..."
                  className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Recipients Row: To, CC, and BCC */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-500" /> To Recipients *
                  </label>
                  <input
                    type="text"
                    value={toRecipients}
                    onChange={(e) => setToRecipients(e.target.value)}
                    placeholder="recipient@example.com, boss@example.com"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    CC Recipients
                  </label>
                  <input
                    type="text"
                    value={ccRecipients}
                    onChange={(e) => setCcRecipients(e.target.value)}
                    placeholder="manager@example.com"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                    <span>BCC Recipients</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={bccRecipients}
                    onChange={(e) => setBccRecipients(e.target.value)}
                    placeholder="archive@example.com, bcc@example.com"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Shift Times Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Check-in:</span>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="08.30"
                    className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center"
                  />
                  <span className="text-[10px] text-slate-400">(24h format)</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Check-out:</span>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="17.30"
                    className="w-20 px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-center"
                  />
                  <span className="text-[10px] text-slate-400">(24h format)</span>
                </div>
              </div>
            </div>

            {/* View Mode Toggle: Live Rendered Preview vs HTML Editor */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'preview'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Live Rendered Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'edit'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> Customize HTML / Body
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToLive}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Regenerate table from current live tasks in the database"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Live Tasks
              </button>
            </div>

            {/* Preview or Editor Content */}
            {activeTab === 'preview' ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-950 shadow-inner overflow-x-auto min-h-[360px]">
                <div
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  className="email-body-preview text-slate-900 dark:text-slate-100"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  You can edit the HTML directly below (e.g. add extra remarks, modify task rows, or alter greetings).
                </div>
                <textarea
                  rows={16}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Saving will hold this customized draft for scheduled auto-dispatch. Records older than 30 days are automatically deleted.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || loading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-sm active:scale-98"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Customization
            </button>

            <button
              type="button"
              onClick={handleSendNow}
              disabled={isPending || loading}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-sm active:scale-98 ${
                isMorning
                  ? 'bg-amber-600 hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500'
                  : 'bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500'
              }`}
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Email Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
